import asyncio
import json
from typing import Dict, Set

from fastapi import WebSocket

from app.services.redis_pubsub import RedisPubSub
from app.schemas.ws import WSOut
from app.services.presence import PresenceService


class WSManager:
    """
    One WebSocket per user.
    Each user can subscribe to multiple chat rooms.
    Redis Pub/Sub fans out messages between backend instances.
    """
    def __init__(self):
        self.user_sockets: Dict[int, WebSocket] = {}
        self.user_chats: Dict[int, Set[int]] = {}
        self.redis = RedisPubSub()
        self.presence = PresenceService()
        self._chat_listeners: Dict[int, asyncio.Task] = {}
        self._chat_refcount: Dict[int, int] = {}

    async def connect(self, user_id: int, ws: WebSocket):
        # enforce single WS per user
        old = self.user_sockets.get(user_id)
        if old:
            try:
                await old.close(code=4000)
            except Exception:
                pass

        await ws.accept()
        self.user_sockets[user_id] = ws
        self.user_chats[user_id] = set()
        await self.presence.set_online(user_id)

    async def disconnect(self, user_id: int):
        self.user_sockets.pop(user_id, None)
        chats = self.user_chats.pop(user_id, set())

        # decrement refcount and stop listeners if needed
        for chat_id in chats:
            await self._unref_chat_listener(chat_id)

        await self.presence.set_offline(user_id)

    async def send_to_user(self, user_id: int, payload: dict):
        ws = self.user_sockets.get(user_id)
        if not ws:
            return
        try:
            await ws.send_text(json.dumps(payload))
        except Exception:
            return

    async def subscribe(self, user_id: int, chat_id: int):
        self.user_chats[user_id].add(chat_id)
        await self._ref_chat_listener(chat_id)
        await self.send_to_user(user_id, WSOut(type="subscribed", chat_id=chat_id).model_dump())

    async def unsubscribe(self, user_id: int, chat_id: int):
        self.user_chats[user_id].discard(chat_id)
        await self._unref_chat_listener(chat_id)
        await self.send_to_user(user_id, WSOut(type="unsubscribed", chat_id=chat_id).model_dump())

    async def publish_message(self, chat_id: int, payload: dict):
        await self.redis.publish_chat(chat_id, payload)

    async def _ref_chat_listener(self, chat_id: int):
        self._chat_refcount[chat_id] = self._chat_refcount.get(chat_id, 0) + 1
        if chat_id in self._chat_listeners:
            return

        pubsub = await self.redis.subscribe_chat(chat_id)

        async def _listen():
            try:
                async for msg in pubsub.listen():
                    if msg is None:
                        continue
                    if msg.get("type") != "message":
                        continue
                    data = msg.get("data")
                    if not data:
                        continue
                    payload = json.loads(data)

                    # Fan-out to all connected users subscribed to this chat_id
                    for uid, chats in list(self.user_chats.items()):
                        if chat_id in chats and uid in self.user_sockets:
                            await self.send_to_user(uid, payload)
            finally:
                try:
                    await pubsub.unsubscribe()
                    await pubsub.close()
                except Exception:
                    pass

        self._chat_listeners[chat_id] = asyncio.create_task(_listen())

    async def _unref_chat_listener(self, chat_id: int):
        if chat_id not in self._chat_refcount:
            return
        self._chat_refcount[chat_id] -= 1
        if self._chat_refcount[chat_id] > 0:
            return

        # stop listener
        self._chat_refcount.pop(chat_id, None)
        task = self._chat_listeners.pop(chat_id, None)
        if task:
            task.cancel()
            try:
                await task
            except Exception:
                pass


ws_manager = WSManager()
