from pydantic import BaseModel
from typing import Optional

class VendorCreate(BaseModel):
    vendor_name:     str
    vendor_type:     Optional[str] = None
    business_number: Optional[str] = None
    contact:         Optional[str] = None

class VendorResponse(BaseModel):
    id:              int
    business_id:     int
    vendor_name:     str
    vendor_type:     Optional[str]
    business_number: Optional[str]
    contact:         Optional[str]

    class Config:
        from_attributes = True