from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from core.database import get_db
from core.deps import get_current_business
from models.vendor import Vendor
from schemas.vendor import VendorCreate, VendorUpdate, VendorResponse

router = APIRouter(prefix="/api/accounting/vendors", tags=["vendors"])


@router.get("/summary")
def get_vendor_summary(
    db: Session = Depends(get_db),
    business=Depends(get_current_business),
):
    q = db.query(Vendor).filter(Vendor.business_id == business.id)
    total       = q.count()
    active      = q.filter(Vendor.is_active == 1).count()
    by_type     = {}
    for v in q.all():
        t = v.vendor_type or "기타"
        by_type[t] = by_type.get(t, 0) + 1
    return {
        "total":   total,
        "active":  active,
        "by_type": by_type,
    }


@router.get("/", response_model=List[VendorResponse])
def list_vendors(
    vendor_type: Optional[str] = None,
    is_active:   Optional[int] = None,
    search:      Optional[str] = None,
    db:          Session = Depends(get_db),
    business=Depends(get_current_business),
):
    q = db.query(Vendor).filter(Vendor.business_id == business.id)
    if vendor_type:
        q = q.filter(Vendor.vendor_type == vendor_type)
    if is_active is not None:
        q = q.filter(Vendor.is_active == is_active)
    if search:
        like = f"%{search}%"
        q = q.filter(
            Vendor.vendor_name.like(like) |
            Vendor.contact.like(like) |
            Vendor.business_number.like(like) |
            Vendor.ceo_name.like(like)
        )
    return q.order_by(Vendor.vendor_name).all()


@router.get("/{vendor_id}", response_model=VendorResponse)
def get_vendor(
    vendor_id: int,
    db: Session = Depends(get_db),
    business=Depends(get_current_business),
):
    v = db.query(Vendor).filter(
        Vendor.id == vendor_id,
        Vendor.business_id == business.id,
    ).first()
    if not v:
        raise HTTPException(status_code=404, detail="거래처를 찾을 수 없습니다.")
    return v


@router.post("/", response_model=VendorResponse, status_code=201)
def create_vendor(
    body: VendorCreate,
    db: Session = Depends(get_db),
    business=Depends(get_current_business),
):
    vendor = Vendor(business_id=business.id, **body.model_dump())
    db.add(vendor)
    db.commit()
    db.refresh(vendor)
    return vendor


@router.put("/{vendor_id}", response_model=VendorResponse)
def update_vendor(
    vendor_id: int,
    body: VendorUpdate,
    db: Session = Depends(get_db),
    business=Depends(get_current_business),
):
    v = db.query(Vendor).filter(
        Vendor.id == vendor_id,
        Vendor.business_id == business.id,
    ).first()
    if not v:
        raise HTTPException(status_code=404, detail="거래처를 찾을 수 없습니다.")
    for field, val in body.model_dump(exclude_none=True).items():
        setattr(v, field, val)
    db.commit()
    db.refresh(v)
    return v


@router.delete("/{vendor_id}")
def delete_vendor(
    vendor_id: int,
    db: Session = Depends(get_db),
    business=Depends(get_current_business),
):
    v = db.query(Vendor).filter(
        Vendor.id == vendor_id,
        Vendor.business_id == business.id,
    ).first()
    if not v:
        raise HTTPException(status_code=404, detail="거래처를 찾을 수 없습니다.")
    db.delete(v)
    db.commit()
    return {"ok": True}
