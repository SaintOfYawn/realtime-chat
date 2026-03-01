from pydantic import BaseModel
from typing import Literal, Optional

WSInType = Literal["subscribe", "unsubscribe", "message", "ping"]

class WSIn(BaseModel):
    type: WSInType
    chat_id: Optional[int] = None
    content: Optional[str] = None


WSOutType = Literal["subscribed", "unsubscribed", "message", "presence", "error", "pong"]

class WSOut(BaseModel):
    type: WSOutType
    chat_id: Optional[int] = None
    sender_id: Optional[int] = None
    content: Optional[str] = None
    online: Optional[bool] = None
    user_id: Optional[int] = None
    message_id: Optional[int] = None
    created_at: Optional[str] = None
    error: Optional[str] = None
