from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class VendorCreate(BaseModel):
    vendor_name:     str
    vendor_type:     Optional[str] = "기타"
    business_number: Optional[str] = None
    ceo_name:        Optional[str] = None
    contact_name:    Optional[str] = None
    contact:         Optional[str] = None
    email:           Optional[str] = None
    address:         Optional[str] = None
    industry:        Optional[str] = None
    bank_name:       Optional[str] = None
    account_number:  Optional[str] = None
    bank_holder:     Optional[str] = None
    credit_limit:    Optional[int] = 0
    payment_terms:   Optional[int] = 30
    note:                 Optional[str] = None
    consultation_history: Optional[str] = None
    is_active:            Optional[int] = 1

class VendorUpdate(BaseModel):
    vendor_name:          Optional[str] = None
    vendor_type:          Optional[str] = None
    business_number:      Optional[str] = None
    ceo_name:             Optional[str] = None
    contact_name:         Optional[str] = None
    contact:              Optional[str] = None
    email:                Optional[str] = None
    address:              Optional[str] = None
    industry:             Optional[str] = None
    bank_name:            Optional[str] = None
    account_number:       Optional[str] = None
    bank_holder:          Optional[str] = None
    credit_limit:         Optional[int] = None
    payment_terms:        Optional[int] = None
    note:                 Optional[str] = None
    consultation_history: Optional[str] = None
    is_active:            Optional[int] = None

class VendorResponse(BaseModel):
    id:                   int
    business_id:          int
    vendor_name:          str
    vendor_type:          Optional[str]
    business_number:      Optional[str]
    ceo_name:             Optional[str]
    contact_name:         Optional[str]
    contact:              Optional[str]
    email:                Optional[str]
    address:              Optional[str]
    industry:             Optional[str]
    bank_name:            Optional[str]
    account_number:       Optional[str]
    bank_holder:          Optional[str]
    credit_limit:         Optional[int]
    payment_terms:        Optional[int]
    note:                 Optional[str]
    consultation_history: Optional[str]
    is_active:            Optional[int]
    created_at:      Optional[datetime]
    updated_at:      Optional[datetime]

    class Config:
        from_attributes = True
