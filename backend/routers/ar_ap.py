from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime
from decimal import Decimal
from core.database import get_db
from routers.auth import get_current_business
from models.ar_ap import AccountReceivable, AccountPayable
from models.vendor import Vendor
from schemas.ar_ap import ARCreate, ARUpdate, ARResponse, APCreate, APUpdate, APResponse

router = APIRouter(prefix="/api/accounting", tags=["ar-ap"])


def _ar_response(ar: AccountReceivable) -> dict:
    r = {c.name: getattr(ar, c.name) for c in ar.__table__.columns}
    r["vendor_name"] = ar.vendor.vendor_name if ar.vendor else None
    return r

def _ap_response(ap: AccountPayable) -> dict:
    r = {c.name: getattr(ap, c.name) for c in ap.__table__.columns}
    r["vendor_name"] = ap.vendor.vendor_name if ap.vendor else None
    return r


# ── AR (미수금) ──

@router.get("/ar/summary")
def ar_summary(
    db: Session = Depends(get_db),
    business=Depends(get_current_business),
):
    today = date.today()
    q = db.query(AccountReceivable).filter(AccountReceivable.business_id == business.id)
    items = q.all()
    total_amount    = sum(float(i.amount) for i in items)
    total_paid      = sum(float(i.paid_amount) for i in items)
    overdue_count   = sum(1 for i in items if i.due_date < today and i.status not in ("완료", "대손"))
    overdue_amount  = sum(float(i.amount) - float(i.paid_amount) for i in items if i.due_date < today and i.status not in ("완료", "대손"))
    return {
        "total_count":   len(items),
        "total_amount":  total_amount,
        "collected":     total_paid,
        "remaining":     total_amount - total_paid,
        "overdue_count":  overdue_count,
        "overdue_amount": overdue_amount,
    }


@router.get("/ar/", response_model=List[ARResponse])
def list_ar(
    status: Optional[str] = None,
    vendor_id: Optional[int] = None,
    overdue_only: bool = False,
    db: Session = Depends(get_db),
    business=Depends(get_current_business),
):
    q = db.query(AccountReceivable).filter(AccountReceivable.business_id == business.id)
    if status:    q = q.filter(AccountReceivable.status == status)
    if vendor_id: q = q.filter(AccountReceivable.vendor_id == vendor_id)
    if overdue_only:
        today = date.today()
        q = q.filter(AccountReceivable.due_date < today, AccountReceivable.status.notin_(["완료", "대손"]))
    items = q.order_by(AccountReceivable.due_date).all()
    return [_ar_response(i) for i in items]


@router.post("/ar/", status_code=201)
def create_ar(
    body: ARCreate,
    db: Session = Depends(get_db),
    business=Depends(get_current_business),
):
    ar = AccountReceivable(business_id=business.id, **body.model_dump())
    db.add(ar)
    db.commit()
    db.refresh(ar)
    return _ar_response(ar)


@router.put("/ar/{ar_id}")
def update_ar(
    ar_id: int,
    body: ARUpdate,
    db: Session = Depends(get_db),
    business=Depends(get_current_business),
):
    ar = db.query(AccountReceivable).filter(
        AccountReceivable.id == ar_id,
        AccountReceivable.business_id == business.id,
    ).first()
    if not ar:
        raise HTTPException(status_code=404, detail="미수금 항목을 찾을 수 없습니다.")
    for field, val in body.model_dump(exclude_none=True).items():
        setattr(ar, field, val)
    db.commit()
    db.refresh(ar)
    return _ar_response(ar)


@router.delete("/ar/{ar_id}")
def delete_ar(
    ar_id: int,
    db: Session = Depends(get_db),
    business=Depends(get_current_business),
):
    ar = db.query(AccountReceivable).filter(
        AccountReceivable.id == ar_id,
        AccountReceivable.business_id == business.id,
    ).first()
    if not ar:
        raise HTTPException(status_code=404, detail="미수금 항목을 찾을 수 없습니다.")
    db.delete(ar)
    db.commit()
    return {"ok": True}


# ── AP (미지급금) ──

@router.get("/ap/summary")
def ap_summary(
    db: Session = Depends(get_db),
    business=Depends(get_current_business),
):
    today = date.today()
    q = db.query(AccountPayable).filter(AccountPayable.business_id == business.id)
    items = q.all()
    total_amount    = sum(float(i.amount) for i in items)
    total_paid      = sum(float(i.paid_amount) for i in items)
    overdue_count   = sum(1 for i in items if i.due_date < today and i.status != "완료")
    overdue_amount  = sum(float(i.amount) - float(i.paid_amount) for i in items if i.due_date < today and i.status != "완료")
    return {
        "total_count":   len(items),
        "total_amount":  total_amount,
        "paid":          total_paid,
        "remaining":     total_amount - total_paid,
        "overdue_count":  overdue_count,
        "overdue_amount": overdue_amount,
    }


@router.get("/ap/", response_model=List[APResponse])
def list_ap(
    status: Optional[str] = None,
    vendor_id: Optional[int] = None,
    overdue_only: bool = False,
    db: Session = Depends(get_db),
    business=Depends(get_current_business),
):
    q = db.query(AccountPayable).filter(AccountPayable.business_id == business.id)
    if status:    q = q.filter(AccountPayable.status == status)
    if vendor_id: q = q.filter(AccountPayable.vendor_id == vendor_id)
    if overdue_only:
        today = date.today()
        q = q.filter(AccountPayable.due_date < today, AccountPayable.status != "완료")
    items = q.order_by(AccountPayable.due_date).all()
    return [_ap_response(i) for i in items]


@router.post("/ap/", status_code=201)
def create_ap(
    body: APCreate,
    db: Session = Depends(get_db),
    business=Depends(get_current_business),
):
    ap = AccountPayable(business_id=business.id, **body.model_dump())
    db.add(ap)
    db.commit()
    db.refresh(ap)
    return _ap_response(ap)


@router.put("/ap/{ap_id}")
def update_ap(
    ap_id: int,
    body: APUpdate,
    db: Session = Depends(get_db),
    business=Depends(get_current_business),
):
    ap = db.query(AccountPayable).filter(
        AccountPayable.id == ap_id,
        AccountPayable.business_id == business.id,
    ).first()
    if not ap:
        raise HTTPException(status_code=404, detail="미지급금 항목을 찾을 수 없습니다.")
    for field, val in body.model_dump(exclude_none=True).items():
        setattr(ap, field, val)
    db.commit()
    db.refresh(ap)
    return _ap_response(ap)


@router.delete("/ap/{ap_id}")
def delete_ap(
    ap_id: int,
    db: Session = Depends(get_db),
    business=Depends(get_current_business),
):
    ap = db.query(AccountPayable).filter(
        AccountPayable.id == ap_id,
        AccountPayable.business_id == business.id,
    ).first()
    if not ap:
        raise HTTPException(status_code=404, detail="미지급금 항목을 찾을 수 없습니다.")
    db.delete(ap)
    db.commit()
    return {"ok": True}
