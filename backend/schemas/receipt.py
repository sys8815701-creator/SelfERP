from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

class ReceiptResponse(BaseModel):
    id:           int
    file_path:    Optional[str]
    vendor:       Optional[str]
    total_amount: Optional[float]
    tax_amount:   Optional[float]
    issued_at:    Optional[date]
    raw_text:     Optional[str]
    status:       Optional[str]
    created_at:   Optional[datetime]

    class Config:
        from_attributes = True

class JournalSuggestion(BaseModel):
    debit_account:  str
    credit_account: str
    amount:         float
    description:    str