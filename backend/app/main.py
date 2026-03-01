# backend/app/main.py
from __future__ import annotations

import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import decode_token
from app.db.init_db import init_db
from app.db.session import SessionLocal
from app.db.models import ChatMember, Message
from app.routers.auth import router as auth_router
from app.routers.chats import router as chats_router
from app.schemas.ws import WSIn, WSOut
from app.services.ws_manager import ws_manager
from app.services.presence import PresenceService

app = FastAPI(title="Real-Time Chat")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(chats_router)

presence = PresenceService()


@app.on_event("startup")
def _startup():
    init_db()


def _get_db() -> Session:
    return SessionLocal()


@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket, token: str = Query(...)):
    # Auth via query token=...
    try:
        payload = decode_token(token)
        user_id = int(payload.sub)
    except Exception:
        await ws.close(code=4401)
        return

    await ws_manager.connect(user_id, ws)

    # Send presence best-effort (do not crash on fast reconnect)
    try:
        await ws_manager.send_to_user(
            user_id,
            WSOut(type="presence", user_id=user_id, online=True).model_dump(),
        )
    except Exception:
        # client may disconnect before we send anything
        await ws_manager.disconnect(user_id)
        return

    try:
        while True:
            raw = await ws.receive_text()
            try:
                data = WSIn.model_validate(json.loads(raw))
            except Exception:
                try:
                    await ws_manager.send_to_user(user_id, WSOut(type="error", error="Bad payload").model_dump())
                except Exception:
                    pass
                continue

            if data.type == "ping":
                await presence.heartbeat(user_id)
                try:
                    await ws_manager.send_to_user(user_id, WSOut(type="pong").model_dump())
                except Exception:
                    pass
                continue

            if data.type in ("subscribe", "unsubscribe"):
                if not data.chat_id:
                    try:
                        await ws_manager.send_to_user(user_id, WSOut(type="error", error="chat_id required").model_dump())
                    except Exception:
                        pass
                    continue

                # check membership
                db = _get_db()
                try:
                    member = db.query(ChatMember).filter_by(chat_id=data.chat_id, user_id=user_id).first()
                    if not member:
                        try:
                            await ws_manager.send_to_user(user_id, WSOut(type="error", error="Not a member").model_dump())
                        except Exception:
                            pass
                        continue
                finally:
                    db.close()

                if data.type == "subscribe":
                    await ws_manager.subscribe(user_id, data.chat_id)
                else:
                    await ws_manager.unsubscribe(user_id, data.chat_id)
                continue

            if data.type == "message":
                if not data.chat_id or not data.content:
                    try:
                        await ws_manager.send_to_user(
                            user_id,
                            WSOut(type="error", error="chat_id and content required").model_dump(),
                        )
                    except Exception:
                        pass
                    continue

                # store message in DB
                db = _get_db()
                try:
                    member = db.query(ChatMember).filter_by(chat_id=data.chat_id, user_id=user_id).first()
                    if not member:
                        try:
                            await ws_manager.send_to_user(user_id, WSOut(type="error", error="Not a member").model_dump())
                        except Exception:
                            pass
                        continue

                    msg = Message(chat_id=data.chat_id, sender_id=user_id, content=data.content)
                    db.add(msg)
                    db.commit()
                    db.refresh(msg)

                    payload = WSOut(
                        type="message",
                        chat_id=msg.chat_id,
                        sender_id=msg.sender_id,
                        content=msg.content,
                        message_id=msg.id,
                        created_at=msg.created_at.isoformat(),
                    ).model_dump()

                    # publish to redis => all instances distribute
                    await ws_manager.publish_message(msg.chat_id, payload)
                finally:
                    db.close()
                continue

    except WebSocketDisconnect:
        pass
    finally:
        await ws_manager.disconnect(user_id)