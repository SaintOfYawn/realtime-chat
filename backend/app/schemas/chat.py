from pydantic import BaseModel

class ChatCreateIn(BaseModel):
    title: str

class ChatOut(BaseModel):
    id: int
    title: str

    class Config:
        from_attributes = True
