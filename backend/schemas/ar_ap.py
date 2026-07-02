from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from decimal import Decimal

class ARCreate(BaseModel):
    vendor_id:   Optional[int] = None
    title:       str
    amount:      Decimal
    paid_amount: Optional[Decimal] = Decimal("0")
    issue_date:  date
    due_date:    date
    status:      Optional[str] = "미수"
    note:        Optional[str] = None

class ARUpdate(BaseModel):
    vendor_id:   Optional[int] = None
    title:       Optional[str] = None
    amount:      Optional[Decimal] = None
    paid_amount: Optional[Decimal] = None
    issue_date:  Optional[date] = None
    due_date:    Optional[date] = None
    status:      Optional[str] = None
    note:        Optional[str] = None

class ARResponse(BaseModel):
    id:          int
    business_id: int
    vendor_id:   Optional[int]
    title:       str
    amount:      Decimal
    paid_amount: Decimal
    issue_date:  date
    due_date:    date
    status:      str
    note:        Optional[str]
    created_at:  Optional[datetime]
    vendor_name: Optional[str] = None

    class Config:
        from_attributes = True

class APCreate(BaseModel):
    vendor_id:   Optional[int] = None
    title:       str
    amount:      Decimal
    paid_amount: Optional[Decimal] = Decimal("0")
    issue_date:  date
    due_date:    date
    status:      Optional[str] = "미지급"
    note:        Optional[str] = None

class APUpdate(BaseModel):
    vendor_id:   Optional[int] = None
    title:       Optional[str] = None
    amount:      Optional[Decimal] = None
    paid_amount: Optional[Decimal] = None
    issue_date:  Optional[date] = None
    due_date:    Optional[date] = None
    status:      Optional[str] = None
    note:        Optional[str] = None

class APResponse(BaseModel):
    id:          int
    business_id: int
    vendor_id:   Optional[int]
    title:       str
    amount:      Decimal
    paid_amount: Decimal
    issue_date:  date
    due_date:    date
    status:      str
    note:        Optional[str]
    created_at:  Optional[datetime]
    vendor_name: Optional[str] = None

    class Config:
        from_attributes = True
