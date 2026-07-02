from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import date
from decimal import Decimal
from core.database import get_db
from core.deps import get_current_business
from models.estimate import Estimate, EstimateItem

router = APIRouter(prefix="/api/accounting/estimates", tags=["estimates"])


class EstimateItemBody(BaseModel):
    item_name:  str
    quantity:   float = 1
    unit_price: float = 0
    note:       Optional[str] = None

class EstimateCreate(BaseModel):
    vendor_id:    Optional[int] = None
    doc_type:     str = "견적서"
    doc_no:       Optional[str] = None
    issue_date:   date
    due_date:     Optional[date] = None
    tax_rate:     float = 0.1   # 0.1 = 10%
    status:       Optional[str] = "초안"
    note:         Optional[str] = None
    items:        List[EstimateItemBody] = []

class EstimateUpdate(BaseModel):
    vendor_id:  Optional[int] = None
    doc_type:   Optional[str] = None
    doc_no:     Optional[str] = None
    issue_date: Optional[date] = None
    due_date:   Optional[date] = None
    status:     Optional[str] = None
    note:       Optional[str] = None
    items:      Optional[List[EstimateItemBody]] = None


def _to_dict(e: Estimate) -> dict:
    d = {c.name: getattr(e, c.name) for c in e.__table__.columns}
    d["vendor_name"] = e.vendor.vendor_name if e.vendor else None
    d["items"] = [
        {c.name: getattr(i, c.name) for c in i.__table__.columns}
        for i in e.items
    ]
    return d


def _calc_totals(items: List[EstimateItemBody], tax_rate: float = 0.1):
    supply = sum(round(i.quantity * i.unit_price, 2) for i in items)
    tax    = round(supply * tax_rate, 2)
    total  = supply + tax
    return supply, tax, total


@router.get("/")
def list_estimates(
    doc_type: Optional[str] = None,
    status:   Optional[str] = None,
    db: Session = Depends(get_db),
    business=Depends(get_current_business),
):
    q = db.query(Estimate).filter(Estimate.business_id == business.id)
    if doc_type: q = q.filter(Estimate.doc_type == doc_type)
    if status:   q = q.filter(Estimate.status   == status)
    return [_to_dict(e) for e in q.order_by(Estimate.issue_date.desc()).all()]


@router.get("/{eid}")
def get_estimate(
    eid: int,
    db: Session = Depends(get_db),
    business=Depends(get_current_business),
):
    e = db.query(Estimate).filter(Estimate.id == eid, Estimate.business_id == business.id).first()
    if not e:
        raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다.")
    return _to_dict(e)


@router.post("/", status_code=201)
def create_estimate(
    body: EstimateCreate,
    db: Session = Depends(get_db),
    business=Depends(get_current_business),
):
    supply, tax, total = _calc_totals(body.items, body.tax_rate)
    e = Estimate(
        business_id=business.id,
        vendor_id=body.vendor_id,
        doc_type=body.doc_type,
        doc_no=body.doc_no,
        issue_date=body.issue_date,
        due_date=body.due_date,
        supply_amount=supply,
        tax_amount=tax,
        total_amount=total,
        status=body.status,
        note=body.note,
    )
    for it in body.items:
        amt = round(it.quantity * it.unit_price, 2)
        e.items.append(EstimateItem(
            item_name=it.item_name,
            quantity=it.quantity,
            unit_price=it.unit_price,
            amount=amt,
            note=it.note,
        ))
    db.add(e)
    db.commit()
    db.refresh(e)
    return _to_dict(e)


@router.put("/{eid}")
def update_estimate(
    eid: int,
    body: EstimateUpdate,
    db: Session = Depends(get_db),
    business=Depends(get_current_business),
):
    e = db.query(Estimate).filter(Estimate.id == eid, Estimate.business_id == business.id).first()
    if not e:
        raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다.")
    for k, v in body.model_dump(exclude_none=True).items():
        if k == "items":
            for item in e.items:
                db.delete(item)
            supply, tax, total = _calc_totals(v)
            e.supply_amount = supply
            e.tax_amount    = tax
            e.total_amount  = total
            for it in v:
                amt = round(it["quantity"] * it["unit_price"], 2)
                e.items.append(EstimateItem(
                    item_name=it["item_name"], quantity=it["quantity"],
                    unit_price=it["unit_price"], amount=amt, note=it.get("note"),
                ))
        else:
            setattr(e, k, v)
    db.commit()
    db.refresh(e)
    return _to_dict(e)


@router.delete("/{eid}")
def delete_estimate(
    eid: int,
    db: Session = Depends(get_db),
    business=Depends(get_current_business),
):
    e = db.query(Estimate).filter(Estimate.id == eid, Estimate.business_id == business.id).first()
    if not e:
        raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다.")
    db.delete(e)
    db.commit()
    return {"ok": True}
