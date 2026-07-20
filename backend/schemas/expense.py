from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ExpenseCreate(BaseModel):
    title:      str
    amount:     float
    category:   str
    receipt_id: Optional[int] = None

class ExpenseResponse(BaseModel):
    id:           int
    title:        str
    amount:       float
    category:     str
    receipt_id:   Optional[int]
    requested_by: Optional[int]
    approved_by:  Optional[int]
    status:       str
    requested_at: Optional[datetime]
    approved_at:  Optional[datetime]
    requester_name: Optional[str] = None

    class Config:
        from_attributes = True