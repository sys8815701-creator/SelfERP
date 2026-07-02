from pydantic import BaseModel
from typing import List, Optional
from datetime import date

class JournalLineCreate(BaseModel):
    account_id: int
    side: str        # debit / credit
    amount: float

class JournalCreate(BaseModel):
    date: date
    description: Optional[str] = None
    lines: List[JournalLineCreate]

class JournalLineResponse(BaseModel):
    id: int
    account_id: int
    side: str
    amount: float

    class Config:
        from_attributes = True

class JournalResponse(BaseModel):
    id: int
    date: date
    description: Optional[str]
    created_by: Optional[int]
    lines: List[JournalLineResponse]

    class Config:
        from_attributes = True