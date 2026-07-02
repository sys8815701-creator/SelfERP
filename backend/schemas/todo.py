from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class TodoCreate(BaseModel):
    text: str


class TodoResponse(BaseModel):
    id: int
    business_id: int
    text: str
    done: bool
    created_at: datetime

    class Config:
        from_attributes = True


class QuickTransactionCreate(BaseModel):
    date: str          # "YYYY-MM-DD"
    description: str
    amount: float
    tx_type: str       # "income" | "expense"
    category: Optional[str] = None


class AIChatRequest(BaseModel):
    message: str
