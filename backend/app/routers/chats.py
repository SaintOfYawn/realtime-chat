from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user
from app.db.models import Chat, ChatMember, Message, User
from app.schemas.chat import ChatCreateIn, ChatOut
from app.schemas.message import MessageOut

router = APIRouter(prefix="/api/chats", tags=["chats"])


@router.get("", response_model=list[ChatOut])
def list_my_chats(db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    chats = (
        db.query(Chat)
        .join(ChatMember, ChatMember.chat_id == Chat.id)
        .filter(ChatMember.user_id == me.id)
        .order_by(Chat.id.desc())
        .all()
    )
    return chats


@router.post("", response_model=ChatOut)
def create_chat(data: ChatCreateIn, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    chat = Chat(title=data.title)
    db.add(chat)
    db.commit()
    db.refresh(chat)

    # add creator as member
    db.add(ChatMember(chat_id=chat.id, user_id=me.id))
    db.commit()
    return chat


@router.post("/{chat_id}/join", response_model=ChatOut)
def join_chat(chat_id: int, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    chat = db.get(Chat, chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    exists = db.query(ChatMember).filter_by(chat_id=chat_id, user_id=me.id).first()
    if not exists:
        db.add(ChatMember(chat_id=chat_id, user_id=me.id))
        db.commit()
    return chat


@router.get("/{chat_id}/messages", response_model=list[MessageOut])
def history(chat_id: int, limit: int = 50, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    member = db.query(ChatMember).filter_by(chat_id=chat_id, user_id=me.id).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this chat")

    msgs = (
        db.query(Message)
        .filter(Message.chat_id == chat_id)
        .order_by(Message.id.desc())
        .limit(limit)
        .all()
    )
    return list(reversed(msgs))
