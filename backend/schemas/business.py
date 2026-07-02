from pydantic import BaseModel
from typing import Optional
from datetime import date

class BusinessCreate(BaseModel):
    business_name:   str
    business_number: Optional[str] = None
    owner_name:      Optional[str] = None
    industry:        Optional[str] = None
    business_type:   Optional[str] = None
    open_date:       Optional[date] = None

class BusinessResponse(BaseModel):
    id:              int
    user_id:         int
    business_name:   str
    business_number: Optional[str]
    owner_name:      Optional[str]
    industry:        Optional[str]
    business_type:   Optional[str]
    open_date:       Optional[date]

    class Config:
        from_attributes = True