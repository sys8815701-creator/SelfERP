from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from pydantic import BaseModel
from typing import Optional, List
from datetime import date
from decimal import Decimal
from core.database import get_db
from core.deps import get_current_business
from models.tax_invoice import TaxInvoice
from models.vendor import Vendor

router = APIRouter(prefix="/api/accounting/tax-invoice", tags=["tax-invoice"])


class TaxInvoiceCreate(BaseModel):
    vendor_id:     Optional[int] = None
    direction:     str = "발행"
    invoice_no:    Optional[str] = None
    issue_date:    date
    supply_amount: Decimal
    tax_amount:    Optional[Decimal] = None   # None이면 supply_amount × 0.1 자동 계산
    item_name:     Optional[str] = None
    status:        Optional[str] = "임시저장"
    note:          Optional[str] = None

class TaxInvoiceUpdate(BaseModel):
    vendor_id:     Optional[int] = None
    direction:     Optional[str] = None
    invoice_no:    Optional[str] = None
    issue_date:    Optional[date] = None
    supply_amount: Optional[Decimal] = None
    tax_amount:    Optional[Decimal] = None
    item_name:     Optional[str] = None
    status:        Optional[str] = None
    note:          Optional[str] = None


def _to_dict(t: TaxInvoice) -> dict:
    d = {c.name: getattr(t, c.name) for c in t.__table__.columns}
    d["vendor_name"] = t.vendor.vendor_name if t.vendor else None
    return d


@router.get("/summary")
def summary(
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    business=Depends(get_current_business),
):
    q = db.query(TaxInvoice).filter(TaxInvoice.business_id == business.id)
    if year:
        q = q.filter(extract("year", TaxInvoice.issue_date) == year)
    items = q.all()
    issued   = [i for i in items if i.direction == "발행"]
    received = [i for i in items if i.direction == "수취"]
    return {
        "total_count":     len(items),
        "issued_count":    len(issued),
        "received_count":  len(received),
        "issued_supply":   float(sum(i.supply_amount for i in issued)),
        "issued_tax":      float(sum(i.tax_amount    for i in issued)),
        "received_supply": float(sum(i.supply_amount for i in received)),
        "received_tax":    float(sum(i.tax_amount    for i in received)),
        "vat_payable":     float(sum(i.tax_amount for i in issued)) - float(sum(i.tax_amount for i in received)),
    }


@router.get("/")
def list_invoices(
    direction: Optional[str] = None,
    status:    Optional[str] = None,
    year:      Optional[int] = None,
    month:     Optional[int] = None,
    db: Session = Depends(get_db),
    business=Depends(get_current_business),
):
    q = db.query(TaxInvoice).filter(TaxInvoice.business_id == business.id)
    if direction: q = q.filter(TaxInvoice.direction == direction)
    if status:    q = q.filter(TaxInvoice.status    == status)
    if year:      q = q.filter(extract("year",  TaxInvoice.issue_date) == year)
    if month:     q = q.filter(extract("month", TaxInvoice.issue_date) == month)
    return [_to_dict(t) for t in q.order_by(TaxInvoice.issue_date.desc()).all()]


@router.post("/", status_code=201)
def create_invoice(
    body: TaxInvoiceCreate,
    db: Session = Depends(get_db),
    business=Depends(get_current_business),
):
    data = body.model_dump()
    if data["tax_amount"] is None:
        data["tax_amount"] = round(float(data["supply_amount"]) * 0.1, 2)
    data["total_amount"] = float(data["supply_amount"]) + float(data["tax_amount"])
    t = TaxInvoice(business_id=business.id, **data)
    db.add(t)
    db.commit()
    db.refresh(t)
    return _to_dict(t)


@router.put("/{tid}")
def update_invoice(
    tid: int,
    body: TaxInvoiceUpdate,
    db: Session = Depends(get_db),
    business=Depends(get_current_business),
):
    t = db.query(TaxInvoice).filter(
        TaxInvoice.id == tid,
        TaxInvoice.business_id == business.id,
    ).first()
    if not t:
        raise HTTPException(status_code=404, detail="세금계산서를 찾을 수 없습니다.")
    updates = body.model_dump(exclude_none=True)
    for k, v in updates.items():
        setattr(t, k, v)
    # total 재계산
    t.total_amount = float(t.supply_amount) + float(t.tax_amount)
    db.commit()
    db.refresh(t)
    return _to_dict(t)


@router.delete("/{tid}")
def delete_invoice(
    tid: int,
    db: Session = Depends(get_db),
    business=Depends(get_current_business),
):
    t = db.query(TaxInvoice).filter(
        TaxInvoice.id == tid,
        TaxInvoice.business_id == business.id,
    ).first()
    if not t:
        raise HTTPException(status_code=404, detail="세금계산서를 찾을 수 없습니다.")
    db.delete(t)
    db.commit()
    return {"ok": True}
