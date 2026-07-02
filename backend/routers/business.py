from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from core.database import get_db
from core.deps import get_current_user
from models.user import User
from models.business import Business
from models.vendor import Vendor
from schemas.business import BusinessCreate, BusinessResponse
from schemas.vendor import VendorCreate, VendorResponse
from typing import List, Optional
from pydantic import BaseModel
from datetime import date as DateType

class BusinessUpdate(BaseModel):
    business_name:   Optional[str] = None
    business_number: Optional[str] = None
    owner_name:      Optional[str] = None
    industry:        Optional[str] = None
    business_type:   Optional[str] = None
    open_date:       Optional[DateType] = None

class BankInfoUpdate(BaseModel):
    bank_name:      str
    account_number: str
    bank_holder:    str

router = APIRouter(prefix="/api/business", tags=["business"])

# 사업장 등록
@router.post("/", response_model=BusinessResponse)
def create_business(
    data: BusinessCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    business = Business(user_id=current_user.id, **data.model_dump())
    db.add(business)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="이미 등록된 사업자번호입니다.")
    db.refresh(business)
    return business

# 사업장 목록 조회 (현재 사용자 소유만)
@router.get("/", response_model=List[BusinessResponse])
def get_businesses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(Business).filter(Business.user_id == current_user.id).all()

# 사업장 단건 조회
@router.get("/{business_id}", response_model=BusinessResponse)
def get_business(business_id: int, db: Session = Depends(get_db)):
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="사업장을 찾을 수 없습니다.")
    return business

# 사업장 정보 수정
@router.patch("/{business_id}", response_model=BusinessResponse)
def update_business(business_id: int, data: BusinessUpdate, db: Session = Depends(get_db)):
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="사업장을 찾을 수 없습니다.")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(business, field, value)
    db.commit()
    db.refresh(business)
    return business

# 주 거래 은행 조회
@router.get("/{business_id}/bank")
def get_bank_info(
    business_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    business = db.query(Business).filter(
        Business.id == business_id,
        Business.user_id == current_user.id,
    ).first()
    if not business:
        raise HTTPException(status_code=404, detail="사업장을 찾을 수 없습니다.")
    if not business.bank_name:
        return None
    return {
        "bank_name": business.bank_name,
        "account_number": business.account_number,
        "bank_holder": business.bank_holder,
    }

# 주 거래 은행 저장/수정
@router.put("/{business_id}/bank")
def update_bank_info(
    business_id: int,
    data: BankInfoUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    business = db.query(Business).filter(
        Business.id == business_id,
        Business.user_id == current_user.id,
    ).first()
    if not business:
        raise HTTPException(status_code=404, detail="사업장을 찾을 수 없습니다.")
    business.bank_name      = data.bank_name
    business.account_number = data.account_number
    business.bank_holder    = data.bank_holder
    db.commit()
    return {
        "bank_name": business.bank_name,
        "account_number": business.account_number,
        "bank_holder": business.bank_holder,
    }

# 거래처 등록
@router.post("/{business_id}/vendors", response_model=VendorResponse)
def create_vendor(business_id: int, data: VendorCreate, db: Session = Depends(get_db)):
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="사업장을 찾을 수 없습니다.")
    vendor = Vendor(
        business_id=business_id,
        vendor_name=data.vendor_name,
        vendor_type=data.vendor_type,
        business_number=data.business_number,
        contact=data.contact
    )
    db.add(vendor)
    db.commit()
    db.refresh(vendor)
    return vendor

# 거래처 목록 조회
@router.get("/{business_id}/vendors", response_model=List[VendorResponse])
def get_vendors(business_id: int, db: Session = Depends(get_db)):
    return db.query(Vendor).filter(Vendor.business_id == business_id).all()

# 거래처 수정
@router.patch("/{business_id}/vendors/{vendor_id}", response_model=VendorResponse)
def update_vendor(business_id: int, vendor_id: int, data: VendorCreate, db: Session = Depends(get_db)):
    vendor = db.query(Vendor).filter(
        Vendor.id == vendor_id,
        Vendor.business_id == business_id
    ).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="거래처를 찾을 수 없습니다.")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(vendor, field, value)
    db.commit()
    db.refresh(vendor)
    return vendor

# 거래처 삭제
@router.delete("/{business_id}/vendors/{vendor_id}")
def delete_vendor(business_id: int, vendor_id: int, db: Session = Depends(get_db)):
    vendor = db.query(Vendor).filter(
        Vendor.id == vendor_id,
        Vendor.business_id == business_id
    ).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="거래처를 찾을 수 없습니다.")
    db.delete(vendor)
    db.commit()
    return {"message": "거래처가 삭제되었습니다."}

# 사업장 삭제
@router.delete("/{business_id}")
def delete_business(
    business_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    business = db.query(Business).filter(
        Business.id == business_id,
        Business.user_id == current_user.id,
    ).first()
    if not business:
        raise HTTPException(status_code=404, detail="사업장을 찾을 수 없습니다.")
    db.delete(business)
    db.commit()
    return {"message": "사업장이 삭제되었습니다."}