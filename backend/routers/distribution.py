from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal
from core.database import get_db
from core.deps import get_current_business
from models.distribution import Vehicle, SalesOrder, SalesOrderItem, Delivery, DeliveryReturn
from models.production import Item, InventoryLog

router = APIRouter(prefix="/api/distribution", tags=["distribution"])


# ── Pydantic 스키마 ──────────────────────────────────────────────────────────

class VehicleCreate(BaseModel):
    plate_no:     str
    vehicle_type: Optional[str] = None
    driver_name:  Optional[str] = None
    driver_phone: Optional[str] = None
    max_weight:   Optional[Decimal] = None
    note:         Optional[str] = None

class VehicleUpdate(BaseModel):
    plate_no:     Optional[str] = None
    vehicle_type: Optional[str] = None
    driver_name:  Optional[str] = None
    driver_phone: Optional[str] = None
    max_weight:   Optional[Decimal] = None
    note:         Optional[str] = None
    is_active:    Optional[int] = None

class SalesOrderItemBody(BaseModel):
    item_id:    Optional[int] = None
    item_name:  Optional[str] = None
    quantity:   Decimal
    unit_price: Optional[Decimal] = Decimal("0")
    note:       Optional[str] = None

class SalesOrderCreate(BaseModel):
    vendor_id:   Optional[int] = None
    order_no:    Optional[str] = None
    order_date:  Optional[date] = None
    due_date:    Optional[date] = None
    note:        Optional[str] = None
    items:       List[SalesOrderItemBody] = []

class SalesOrderUpdate(BaseModel):
    vendor_id:   Optional[int] = None
    order_no:    Optional[str] = None
    order_date:  Optional[date] = None
    due_date:    Optional[date] = None
    status:      Optional[str] = None
    note:        Optional[str] = None

class DeliveryCreate(BaseModel):
    sales_order_id:  Optional[int] = None
    vehicle_id:      Optional[int] = None
    delivery_no:     Optional[str] = None
    scheduled_date:  Optional[date] = None
    destination:     Optional[str] = None
    recipient:       Optional[str] = None
    recipient_phone: Optional[str] = None
    delivery_fee:    Optional[Decimal] = Decimal("0")
    note:            Optional[str] = None

class DeliveryUpdate(BaseModel):
    vehicle_id:      Optional[int] = None
    scheduled_date:  Optional[date] = None
    completed_date:  Optional[date] = None
    destination:     Optional[str] = None
    recipient:       Optional[str] = None
    recipient_phone: Optional[str] = None
    status:          Optional[str] = None
    delivery_fee:    Optional[Decimal] = None
    note:            Optional[str] = None

class ReturnCreate(BaseModel):
    delivery_id:  Optional[int] = None
    item_id:      Optional[int] = None
    item_name:    Optional[str] = None
    return_qty:   Decimal
    reason:       Optional[str] = "기타"
    return_date:  date
    note:         Optional[str] = None
    restock:      bool = False   # 재고 복원 여부


# ── 요약 ──────────────────────────────────────────────────────────────────────

@router.get("/summary")
def distribution_summary(
    db: Session = Depends(get_db), business=Depends(get_current_business),
):
    bid = business.id
    total_vehicles   = db.query(Vehicle).filter(Vehicle.business_id == bid, Vehicle.is_active == 1).count()
    pending_orders   = db.query(SalesOrder).filter(
        SalesOrder.business_id == bid,
        SalesOrder.status.in_(["접수", "생산중", "출하대기"]),
    ).count()
    active_deliveries = db.query(Delivery).filter(
        Delivery.business_id == bid,
        Delivery.status.in_(["대기", "배송중"]),
    ).count()
    total_returns    = db.query(DeliveryReturn).filter(DeliveryReturn.business_id == bid).count()
    return {
        "total_vehicles":    total_vehicles,
        "pending_orders":    pending_orders,
        "active_deliveries": active_deliveries,
        "total_returns":     total_returns,
    }


# ── 차량 관리 ─────────────────────────────────────────────────────────────────

@router.get("/vehicles")
def list_vehicles(db: Session = Depends(get_db), business=Depends(get_current_business)):
    rows = db.query(Vehicle).filter(Vehicle.business_id == business.id).order_by(Vehicle.plate_no).all()
    return [{c.name: getattr(v, c.name) for c in v.__table__.columns} for v in rows]

@router.post("/vehicles", status_code=201)
def create_vehicle(body: VehicleCreate, db: Session = Depends(get_db), business=Depends(get_current_business)):
    v = Vehicle(business_id=business.id, **body.model_dump())
    db.add(v); db.commit(); db.refresh(v)
    return {c.name: getattr(v, c.name) for c in v.__table__.columns}

@router.put("/vehicles/{vid}")
def update_vehicle(vid: int, body: VehicleUpdate, db: Session = Depends(get_db), business=Depends(get_current_business)):
    v = db.query(Vehicle).filter(Vehicle.id == vid, Vehicle.business_id == business.id).first()
    if not v: raise HTTPException(404, "차량을 찾을 수 없습니다.")
    for k, val in body.model_dump(exclude_none=True).items(): setattr(v, k, val)
    db.commit(); db.refresh(v)
    return {c.name: getattr(v, c.name) for c in v.__table__.columns}

@router.delete("/vehicles/{vid}")
def delete_vehicle(vid: int, db: Session = Depends(get_db), business=Depends(get_current_business)):
    v = db.query(Vehicle).filter(Vehicle.id == vid, Vehicle.business_id == business.id).first()
    if not v: raise HTTPException(404, "차량을 찾을 수 없습니다.")
    db.delete(v); db.commit()
    return {"ok": True}


# ── 수주 관리 ─────────────────────────────────────────────────────────────────

@router.get("/orders")
def list_sales_orders(
    status: Optional[str] = None,
    vendor_id: Optional[int] = None,
    db: Session = Depends(get_db), business=Depends(get_current_business),
):
    q = db.query(SalesOrder).filter(SalesOrder.business_id == business.id)
    if status:    q = q.filter(SalesOrder.status == status)
    if vendor_id: q = q.filter(SalesOrder.vendor_id == vendor_id)
    result = []
    for o in q.order_by(SalesOrder.due_date.asc()).all():
        d = {c.name: getattr(o, c.name) for c in o.__table__.columns}
        d["vendor_name"] = o.vendor.vendor_name if o.vendor else None
        d["item_count"]  = len(o.items)
        result.append(d)
    return result

@router.get("/orders/{order_id}")
def get_sales_order(order_id: int, db: Session = Depends(get_db), business=Depends(get_current_business)):
    o = db.query(SalesOrder).filter(SalesOrder.id == order_id, SalesOrder.business_id == business.id).first()
    if not o: raise HTTPException(404, "수주를 찾을 수 없습니다.")
    d = {c.name: getattr(o, c.name) for c in o.__table__.columns}
    d["vendor_name"] = o.vendor.vendor_name if o.vendor else None
    d["items"] = [{
        **{c.name: getattr(i, c.name) for c in i.__table__.columns},
        "item_display_name": i.item.item_name if i.item else i.item_name,
    } for i in o.items]
    return d

@router.post("/orders", status_code=201)
def create_sales_order(body: SalesOrderCreate, db: Session = Depends(get_db), business=Depends(get_current_business)):
    total = sum(float(i.quantity) * float(i.unit_price or 0) for i in body.items)
    order = SalesOrder(
        business_id=business.id,
        vendor_id=body.vendor_id,
        order_no=body.order_no,
        order_date=body.order_date,
        due_date=body.due_date,
        note=body.note,
        total_amount=total,
    )
    for i in body.items:
        item_name = i.item_name
        if i.item_id and not item_name:
            it = db.query(Item).filter(Item.id == i.item_id).first()
            if it: item_name = it.item_name
        order.items.append(SalesOrderItem(
            item_id=i.item_id,
            item_name=item_name,
            quantity=i.quantity,
            unit_price=i.unit_price or 0,
            amount=float(i.quantity) * float(i.unit_price or 0),
            note=i.note,
        ))
    db.add(order); db.commit(); db.refresh(order)
    return {c.name: getattr(order, c.name) for c in order.__table__.columns}

@router.put("/orders/{order_id}")
def update_sales_order(order_id: int, body: SalesOrderUpdate, db: Session = Depends(get_db), business=Depends(get_current_business)):
    o = db.query(SalesOrder).filter(SalesOrder.id == order_id, SalesOrder.business_id == business.id).first()
    if not o: raise HTTPException(404, "수주를 찾을 수 없습니다.")
    for k, v in body.model_dump(exclude_none=True).items(): setattr(o, k, v)
    db.commit(); db.refresh(o)
    return {c.name: getattr(o, c.name) for c in o.__table__.columns}

@router.delete("/orders/{order_id}")
def delete_sales_order(order_id: int, db: Session = Depends(get_db), business=Depends(get_current_business)):
    o = db.query(SalesOrder).filter(SalesOrder.id == order_id, SalesOrder.business_id == business.id).first()
    if not o: raise HTTPException(404, "수주를 찾을 수 없습니다.")
    db.delete(o); db.commit()
    return {"ok": True}


# ── 배송 지시 ─────────────────────────────────────────────────────────────────

@router.get("/deliveries")
def list_deliveries(
    status: Optional[str] = None,
    scheduled_date: Optional[date] = None,
    vehicle_id: Optional[int] = None,
    db: Session = Depends(get_db), business=Depends(get_current_business),
):
    q = db.query(Delivery).filter(Delivery.business_id == business.id)
    if status:         q = q.filter(Delivery.status == status)
    if scheduled_date: q = q.filter(Delivery.scheduled_date == scheduled_date)
    if vehicle_id:     q = q.filter(Delivery.vehicle_id == vehicle_id)
    result = []
    for d in q.order_by(Delivery.scheduled_date.desc()).all():
        row = {c.name: getattr(d, c.name) for c in d.__table__.columns}
        row["vehicle_plate"] = d.vehicle.plate_no if d.vehicle else None
        row["driver_name"]   = d.vehicle.driver_name if d.vehicle else None
        row["order_no"]      = d.sales_order.order_no if d.sales_order else None
        result.append(row)
    return result

@router.post("/deliveries", status_code=201)
def create_delivery(body: DeliveryCreate, db: Session = Depends(get_db), business=Depends(get_current_business)):
    d = Delivery(business_id=business.id, **body.model_dump())
    db.add(d); db.commit(); db.refresh(d)
    return {c.name: getattr(d, c.name) for c in d.__table__.columns}

@router.put("/deliveries/{did}")
def update_delivery(did: int, body: DeliveryUpdate, db: Session = Depends(get_db), business=Depends(get_current_business)):
    d = db.query(Delivery).filter(Delivery.id == did, Delivery.business_id == business.id).first()
    if not d: raise HTTPException(404, "배송 지시를 찾을 수 없습니다.")
    for k, v in body.model_dump(exclude_none=True).items(): setattr(d, k, v)
    # 완료 상태이면 수주도 완료로
    if body.status == "완료" and d.sales_order:
        d.sales_order.status = "완료"
    db.commit(); db.refresh(d)
    return {c.name: getattr(d, c.name) for c in d.__table__.columns}

@router.delete("/deliveries/{did}")
def delete_delivery(did: int, db: Session = Depends(get_db), business=Depends(get_current_business)):
    d = db.query(Delivery).filter(Delivery.id == did, Delivery.business_id == business.id).first()
    if not d: raise HTTPException(404, "배송 지시를 찾을 수 없습니다.")
    db.delete(d); db.commit()
    return {"ok": True}


# ── 반품 처리 ─────────────────────────────────────────────────────────────────

@router.get("/returns")
def list_returns(db: Session = Depends(get_db), business=Depends(get_current_business)):
    rows = db.query(DeliveryReturn).filter(DeliveryReturn.business_id == business.id).order_by(DeliveryReturn.return_date.desc()).all()
    result = []
    for r in rows:
        d = {c.name: getattr(r, c.name) for c in r.__table__.columns}
        d["item_display_name"] = r.item.item_name if r.item else r.item_name
        d["delivery_no"] = r.delivery.delivery_no if r.delivery else None
        result.append(d)
    return result

@router.post("/returns", status_code=201)
def create_return(body: ReturnCreate, db: Session = Depends(get_db), business=Depends(get_current_business)):
    ret = DeliveryReturn(
        business_id=business.id,
        delivery_id=body.delivery_id,
        item_id=body.item_id,
        item_name=body.item_name,
        return_qty=body.return_qty,
        reason=body.reason,
        return_date=body.return_date,
        note=body.note,
        is_restocked=1 if body.restock else 0,
    )
    db.add(ret)
    # 재고 복원
    if body.restock and body.item_id:
        item = db.query(Item).filter(Item.id == body.item_id, Item.business_id == business.id).first()
        if item:
            item.current_stock = float(item.current_stock) + float(body.return_qty)
            log = InventoryLog(
                business_id=business.id,
                item_id=body.item_id,
                log_type="반품",
                quantity=body.return_qty,
                log_date=body.return_date,
                note=f"반품 입고: {body.reason or ''}",
            )
            db.add(log)
    db.commit(); db.refresh(ret)
    return {c.name: getattr(ret, c.name) for c in ret.__table__.columns}


# ── 유통 분석 ─────────────────────────────────────────────────────────────────

@router.get("/delivery-fee-summary")
def delivery_fee_summary(
    year:  Optional[int] = None,
    month: Optional[int] = None,
    db: Session = Depends(get_db), business=Depends(get_current_business),
):
    """배송비 정산 — 차량별·월별 합계"""
    from sqlalchemy import extract, func
    bid = business.id
    q = db.query(Delivery).filter(
        Delivery.business_id == bid,
        Delivery.status == "완료",
    )
    if year:  q = q.filter(extract("year",  Delivery.scheduled_date) == year)
    if month: q = q.filter(extract("month", Delivery.scheduled_date) == month)

    deliveries = q.all()
    # 차량별 집계
    by_vehicle: dict = {}
    total_fee = 0.0
    for d in deliveries:
        fee = float(d.delivery_fee or 0)
        total_fee += fee
        vkey = d.vehicle_id or 0
        if vkey not in by_vehicle:
            by_vehicle[vkey] = {
                "vehicle_id":    d.vehicle_id,
                "vehicle_plate": d.vehicle.plate_no if d.vehicle else "차량 미지정",
                "driver_name":   d.vehicle.driver_name if d.vehicle else None,
                "count":         0,
                "total_fee":     0.0,
            }
        by_vehicle[vkey]["count"] += 1
        by_vehicle[vkey]["total_fee"] += fee

    # 월별 집계
    monthly_q = db.query(
        extract("year",  Delivery.scheduled_date).label("year"),
        extract("month", Delivery.scheduled_date).label("month"),
        func.count(Delivery.id).label("count"),
        func.sum(Delivery.delivery_fee).label("total_fee"),
    ).filter(
        Delivery.business_id == bid,
        Delivery.status == "완료",
        Delivery.scheduled_date.isnot(None),
    ).group_by("year", "month").order_by("year", "month")

    return {
        "total_fee":    round(total_fee, 2),
        "total_count":  len(deliveries),
        "by_vehicle":   sorted(by_vehicle.values(), key=lambda x: -x["total_fee"]),
        "monthly":      [{"year": int(r.year), "month": int(r.month), "count": int(r.count), "total_fee": float(r.total_fee or 0)} for r in monthly_q.all()],
    }


@router.get("/route-grouping")
def route_grouping(
    scheduled_date: Optional[date] = None,
    db: Session = Depends(get_db), business=Depends(get_current_business),
):
    """배송 경로 최적화 — 같은 날 배송 지역별 그룹핑 제안"""
    from datetime import date as date_cls
    target = scheduled_date or date_cls.today()
    deliveries = db.query(Delivery).filter(
        Delivery.business_id == business.id,
        Delivery.scheduled_date == target,
        Delivery.status.in_(["대기", "배송중"]),
    ).all()

    groups: dict = {}
    for d in deliveries:
        dest = d.destination or ""
        # 시/도 추출 (앞 2~3자)
        region = dest[:3].strip() if dest else "기타"
        if region not in groups:
            groups[region] = []
        groups[region].append({
            "id":              d.id,
            "delivery_no":     d.delivery_no or f"#{d.id}",
            "destination":     dest,
            "recipient":       d.recipient,
            "vehicle_plate":   d.vehicle.plate_no if d.vehicle else None,
            "status":          d.status,
        })
    return {
        "date":   str(target),
        "total":  len(deliveries),
        "groups": [{"region": k, "count": len(v), "deliveries": v} for k, v in sorted(groups.items())],
    }


@router.get("/analytics")
def distribution_analytics(
    db: Session = Depends(get_db), business=Depends(get_current_business),
):
    bid = business.id
    from sqlalchemy import func
    # 배송 완료율
    total_d   = db.query(Delivery).filter(Delivery.business_id == bid).count()
    done_d    = db.query(Delivery).filter(Delivery.business_id == bid, Delivery.status == "완료").count()
    # 반품률 (반품건 / 완료 배송건)
    total_ret = db.query(DeliveryReturn).filter(DeliveryReturn.business_id == bid).count()
    # 월별 수주 합계
    from sqlalchemy import extract
    monthly = db.query(
        extract("year",  SalesOrder.order_date).label("year"),
        extract("month", SalesOrder.order_date).label("month"),
        func.sum(SalesOrder.total_amount).label("amount"),
        func.count(SalesOrder.id).label("count"),
    ).filter(
        SalesOrder.business_id == bid,
        SalesOrder.order_date.isnot(None),
    ).group_by("year", "month").order_by("year", "month").all()
    return {
        "total_deliveries":    total_d,
        "completed_deliveries": done_d,
        "delivery_rate":       round(done_d / total_d * 100, 1) if total_d > 0 else 0,
        "total_returns":       total_ret,
        "return_rate":         round(total_ret / done_d * 100, 1) if done_d > 0 else 0,
        "monthly_orders": [
            {"year": int(r.year), "month": int(r.month), "amount": float(r.amount or 0), "count": int(r.count)}
            for r in monthly
        ],
    }
