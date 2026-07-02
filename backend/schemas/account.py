from pydantic import BaseModel
from typing import Optional

class AccountCreate(BaseModel):
    code: str
    name: str
    type: str        # asset / liability / equity / revenue / expense
    normal_side: str # debit / credit

class AccountUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    normal_side: Optional[str] = None

class AccountResponse(BaseModel):
    id: int
    code: str
    name: str
    type: str
    normal_side: str

    class Config:
        from_attributes = True