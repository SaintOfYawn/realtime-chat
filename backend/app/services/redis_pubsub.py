import json
import redis.asyncio as redis

from app.core.config import settings

CHANNEL_PREFIX = "chat_events:"


class RedisPubSub:
    def __init__(self):
        self.redis = redis.from_url(settings.REDIS_URL, decode_responses=True)

    async def publish_chat(self, chat_id: int, payload: dict):
        await self.redis.publish(f"{CHANNEL_PREFIX}{chat_id}", json.dumps(payload))

    async def subscribe_chat(self, chat_id: int):
        pubsub = self.redis.pubsub()
        await pubsub.subscribe(f"{CHANNEL_PREFIX}{chat_id}")
        return pubsub
