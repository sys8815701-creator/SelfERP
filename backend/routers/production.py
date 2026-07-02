from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional, List
from datetime import date
from decimal import Decimal
from core.database import get_db
from core.deps import get_current_business
from models.production import Item, BOM, BOMLine, ProductionOrder, ProductionResult, InventoryLog

router = APIRouter(prefix="/api/production", tags=["production"])


# ── Pydantic 스키마 ──────────────────────────────────────────────────────────

class ItemCreate(BaseModel):
    item_code:     Optional[str] = None
    item_name:     str
    item_type:     Optional[str] = "원자재"
    unit:          Optional[str] = "개"
    unit_price:    Optional[Decimal] = Decimal("0")
    current_stock: Optional[Decimal] = Decimal("0")
    safety_stock:  Optional[Decimal] = Decimal("0")
    max_stock:     Optional[Decimal] = Decimal("0")
    description:   Optional[str] = None
    is_active:     Optional[int] = 1

class ItemUpdate(BaseModel):
    item_code:     Optional[str] = None
    item_name:     Optional[str] = None
    item_type:     Optional[str] = None
    unit:          Optional[str] = None
    unit_price:    Optional[Decimal] = None
    safety_stock:  Optional[Decimal] = None
    max_stock:     Optional[Decimal] = None
    description:   Optional[str] = None
    is_active:     Optional[int] = None

class BOMLineBody(BaseModel):
    item_id:  int
    quantity: Decimal
    unit:     Optional[str] = None
    note:     Optional[str] = None

class BOMCreate(BaseModel):
    product_id:  int
    version:     Optional[str] = "1.0"
    description: Optional[str] = None
    lines:       List[BOMLineBody] = []

class ProductionOrderCreate(BaseModel):
    order_no:     Optional[str] = None
    product_id:   int
    bom_id:       Optional[int] = None
    planned_qty:  Decimal
    planned_date: Optional[date] = None
    note:         Optional[str] = None

class ProductionResultCreate(BaseModel):
    order_id:       int
    completed_qty:  Decimal
    defect_qty:     Optional[Decimal] = Decimal("0")
    completed_date: date
    worker_note:    Optional[str] = None

class InventoryLogCreate(BaseModel):
    item_id:      int
    log_type:     str
    quantity:     Decimal   # 입고=양수, 출고=음수
    unit_price:   Optional[Decimal] = Decimal("0")
    ref_no:       Optional[str] = None
    reference_no: Optional[str] = None  # alias for ref_no
    note:         Optional[str] = None
    log_date:     Optional[date] = None


# ── 헬퍼 ─────────────────────────────────────────────────────────────────────

def _item_dict(i: Item) -> dict:
    d = {c.name: getattr(i, c.name) for c in i.__table__.columns}
    d["is_low_stock"] = float(i.current_stock) <= float(i.safety_stock) and float(i.safety_stock) > 0
    return d


# ── 요약 ──────────────────────────────────────────────────────────────────────

@router.get("/summary")
def production_summary(
    db: Session = Depends(get_db),
    business=Depends(get_current_business),
):
    bid = business.id
    total_items   = db.query(Item).filter(Item.business_id == bid).count()
    low_stock     = db.query(Item).filter(
        Item.business_id == bid,
        Item.safety_stock > 0,
        Item.current_stock <= Item.safety_stock,
    ).count()
    active_orders = db.query(ProductionOrder).filter(
        ProductionOrder.business_id == bid,
        ProductionOrder.status.in_(["대기", "생산중"]),
    ).count()
    total_boms    = db.query(BOM).filter(BOM.business_id == bid).count()
    return {
        "total_items":   total_items,
        "low_stock":     low_stock,
        "active_orders": active_orders,
        "total_boms":    total_boms,
    }


# ── 품목 ──────────────────────────────────────────────────────────────────────

@router.get("/items")
def list_items(
    item_type:    Optional[str] = None,
    low_stock_only: bool = False,
    search:       Optional[str] = None,
    db: Session = Depends(get_db),
    business=Depends(get_current_business),
):
    q = db.query(Item).filter(Item.business_id == business.id)
    if item_type:      q = q.filter(Item.item_type == item_type)
    if low_stock_only: q = q.filter(Item.safety_stock > 0, Item.current_stock <= Item.safety_stock)
    if search:
        like = f"%{search}%"
        q = q.filter(Item.item_name.like(like) | Item.item_code.like(like))
    return [_item_dict(i) for i in q.order_by(Item.item_name).all()]


@router.post("/items", status_code=201)
def create_item(body: ItemCreate, db: Session = Depends(get_db), business=Depends(get_current_business)):
    item = Item(business_id=business.id, **body.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return _item_dict(item)


@router.put("/items/{item_id}")
def update_item(
    item_id: int, body: ItemUpdate,
    db: Session = Depends(get_db), business=Depends(get_current_business),
):
    item = db.query(Item).filter(Item.id == item_id, Item.business_id == business.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="품목을 찾을 수 없습니다.")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(item, k, v)
    db.commit()
    db.refresh(item)
    return _item_dict(item)


@router.delete("/items/{item_id}")
def delete_item(item_id: int, db: Session = Depends(get_db), business=Depends(get_current_business)):
    item = db.query(Item).filter(Item.id == item_id, Item.business_id == business.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="품목을 찾을 수 없습니다.")
    if item.logs:
        raise HTTPException(status_code=400, detail="입출고 이력이 있는 품목은 삭제할 수 없습니다.")
    db.delete(item)
    db.commit()
    return {"ok": True}


# ── BOM ───────────────────────────────────────────────────────────────────────

@router.get("/boms")
def list_boms(db: Session = Depends(get_db), business=Depends(get_current_business)):
    q = db.query(BOM).filter(BOM.business_id == business.id)
    result = []
    for b in q.all():
        d = {c.name: getattr(b, c.name) for c in b.__table__.columns}
        d["product_name"] = b.product.item_name if b.product else None
        d["lines"] = [{
            **{c.name: getattr(l, c.name) for c in l.__table__.columns},
            "item_name": l.item.item_name if l.item else None,
        } for l in b.lines]
        result.append(d)
    return result


@router.post("/boms", status_code=201)
def create_bom(body: BOMCreate, db: Session = Depends(get_db), business=Depends(get_current_business)):
    bom = BOM(
        business_id=business.id,
        product_id=body.product_id,
        version=body.version,
        description=body.description,
    )
    for l in body.lines:
        bom.lines.append(BOMLine(item_id=l.item_id, quantity=l.quantity, unit=l.unit, note=l.note))
    db.add(bom)
    db.commit()
    db.refresh(bom)
    return {"id": bom.id, "product_id": bom.product_id, "version": bom.version}


@router.delete("/boms/{bom_id}")
def delete_bom(bom_id: int, db: Session = Depends(get_db), business=Depends(get_current_business)):
    b = db.query(BOM).filter(BOM.id == bom_id, BOM.business_id == business.id).first()
    if not b:
        raise HTTPException(status_code=404, detail="BOM을 찾을 수 없습니다.")
    db.delete(b)
    db.commit()
    return {"ok": True}


# ── 생산 지시서 ───────────────────────────────────────────────────────────────

@router.get("/orders")
def list_orders(
    status: Optional[str] = None,
    db: Session = Depends(get_db), business=Depends(get_current_business),
):
    q = db.query(ProductionOrder).filter(ProductionOrder.business_id == business.id)
    if status: q = q.filter(ProductionOrder.status == status)
    result = []
    for o in q.order_by(ProductionOrder.planned_date.desc()).all():
        d = {c.name: getattr(o, c.name) for c in o.__table__.columns}
        d["product_name"] = o.product.item_name if o.product else None
        d["completed_qty"] = sum(float(r.completed_qty) for r in o.results)
        d["defect_qty"]    = sum(float(r.defect_qty)    for r in o.results)
        result.append(d)
    return result


@router.post("/orders", status_code=201)
def create_order(body: ProductionOrderCreate, db: Session = Depends(get_db), business=Depends(get_current_business)):
    order = ProductionOrder(business_id=business.id, **body.model_dump())
    db.add(order)
    db.commit()
    db.refresh(order)
    return {c.name: getattr(order, c.name) for c in order.__table__.columns}


@router.put("/orders/{order_id}")
def update_order(
    order_id: int, body: dict,
    db: Session = Depends(get_db), business=Depends(get_current_business),
):
    o = db.query(ProductionOrder).filter(
        ProductionOrder.id == order_id, ProductionOrder.business_id == business.id
    ).first()
    if not o:
        raise HTTPException(status_code=404, detail="생산 지시서를 찾을 수 없습니다.")
    for k, v in body.items():
        if hasattr(o, k):
            setattr(o, k, v)
    db.commit()
    db.refresh(o)
    return {c.name: getattr(o, c.name) for c in o.__table__.columns}


# ── 생산 실적 ─────────────────────────────────────────────────────────────────

@router.get("/results")
def list_results(
    order_id: Optional[int] = None,
    db: Session = Depends(get_db), business=Depends(get_current_business),
):
    q = db.query(ProductionResult).filter(ProductionResult.business_id == business.id)
    if order_id: q = q.filter(ProductionResult.order_id == order_id)
    result = []
    for r in q.order_by(ProductionResult.completed_date.desc()).all():
        d = {c.name: getattr(r, c.name) for c in r.__table__.columns}
        if r.order:
            d["order_no"]     = r.order.order_no
            d["product_name"] = r.order.product.item_name if r.order.product else None
        else:
            d["order_no"] = None
            d["product_name"] = None
        result.append(d)
    return result


@router.post("/results", status_code=201)
def create_result(body: ProductionResultCreate, db: Session = Depends(get_db), business=Depends(get_current_business)):
    order = db.query(ProductionOrder).filter(
        ProductionOrder.id == body.order_id, ProductionOrder.business_id == business.id
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="생산 지시서를 찾을 수 없습니다.")
    result = ProductionResult(business_id=business.id, **body.model_dump())
    db.add(result)
    # 완제품 재고 증가
    product = db.query(Item).filter(Item.id == order.product_id).first()
    if product:
        product.current_stock = float(product.current_stock) + float(body.completed_qty)
    # 입출고 로그
    log = InventoryLog(
        business_id=business.id,
        item_id=order.product_id,
        log_type="생산완료",
        quantity=body.completed_qty,
        log_date=body.completed_date,
        ref_no=order.order_no,
        note=f"생산 지시서 #{order.id} 완료",
    )
    db.add(log)
    # 모든 수량 완료 시 상태 변경
    total_completed = sum(float(r.completed_qty) for r in order.results) + float(body.completed_qty)
    if total_completed >= float(order.planned_qty):
        order.status = "완료"
    else:
        order.status = "생산중"
    db.commit()
    db.refresh(result)
    return {c.name: getattr(result, c.name) for c in result.__table__.columns}


# ── 원가 분석 ─────────────────────────────────────────────────────────────────

@router.get("/cost-analysis")
def cost_analysis(
    product_id: Optional[int] = None,
    db: Session = Depends(get_db), business=Depends(get_current_business),
):
    """BOM 기반 제품별 단위 원가 분석"""
    q = db.query(BOM).filter(BOM.business_id == business.id, BOM.is_active == 1)
    if product_id:
        q = q.filter(BOM.product_id == product_id)
    result = []
    for bom in q.all():
        material_lines = []
        total_material = 0.0
        for line in bom.lines:
            if line.item:
                line_cost = float(line.quantity) * float(line.item.unit_price or 0)
                material_lines.append({
                    "item_id":    line.item_id,
                    "item_name":  line.item.item_name,
                    "item_code":  line.item.item_code,
                    "unit":       line.unit or line.item.unit,
                    "quantity":   float(line.quantity),
                    "unit_price": float(line.item.unit_price or 0),
                    "line_cost":  round(line_cost, 2),
                })
                total_material += line_cost
        result.append({
            "bom_id":              bom.id,
            "product_id":          bom.product_id,
            "product_name":        bom.product.item_name if bom.product else None,
            "product_unit_price":  float(bom.product.unit_price or 0) if bom.product else 0,
            "version":             bom.version,
            "material_lines":      material_lines,
            "total_material_cost": round(total_material, 2),
            "margin":              round(float(bom.product.unit_price or 0) - total_material, 2) if bom.product else 0,
            "margin_rate":         round((float(bom.product.unit_price or 0) - total_material) / float(bom.product.unit_price) * 100, 1)
                                   if bom.product and float(bom.product.unit_price or 0) > 0 else 0,
        })
    return result


# ── 재고 실사 ─────────────────────────────────────────────────────────────────

class StockAuditBody(BaseModel):
    adjustments: List[dict]  # [{item_id, counted_qty, note}]
    audit_date:  Optional[date] = None

@router.get("/stock-audit")
def stock_audit(
    db: Session = Depends(get_db), business=Depends(get_current_business),
):
    """현재 재고(장부) vs 실사 입력 준비 — 품목 목록 반환"""
    items = db.query(Item).filter(Item.business_id == business.id, Item.is_active == 1).order_by(Item.item_name).all()
    return [
        {
            "id":            i.id,
            "item_code":     i.item_code,
            "item_name":     i.item_name,
            "item_type":     i.item_type,
            "unit":          i.unit,
            "book_qty":      float(i.current_stock),
            "safety_stock":  float(i.safety_stock),
        }
        for i in items
    ]

@router.post("/stock-audit")
def apply_stock_audit(
    body: StockAuditBody,
    db: Session = Depends(get_db), business=Depends(get_current_business),
):
    """실사 결과 적용 — 장부 수량과 차이나는 품목에 조정 InventoryLog 생성"""
    from datetime import date as date_cls
    audit_date = body.audit_date or date_cls.today()
    applied = []
    for adj in body.adjustments:
        item_id    = int(adj.get("item_id", 0))
        counted    = float(adj.get("counted_qty", 0))
        note       = str(adj.get("note", "") or "재고 실사 조정")
        item = db.query(Item).filter(Item.id == item_id, Item.business_id == business.id).first()
        if not item:
            continue
        diff = counted - float(item.current_stock)
        if abs(diff) < 0.001:
            applied.append({"item_id": item_id, "item_name": item.item_name, "diff": 0, "action": "skip"})
            continue
        log = InventoryLog(
            business_id=business.id,
            item_id=item_id,
            log_type="조정",
            quantity=diff,
            log_date=audit_date,
            note=note,
        )
        db.add(log)
        item.current_stock = counted
        applied.append({"item_id": item_id, "item_name": item.item_name, "book_qty": float(item.current_stock) - diff, "counted_qty": counted, "diff": diff, "action": "adjusted"})
    db.commit()
    return {"applied": applied}


# ── 안전재고 알림 ─────────────────────────────────────────────────────────────

@router.get("/safety-stock-alerts")
def safety_stock_alerts(
    db: Session = Depends(get_db), business=Depends(get_current_business),
):
    """안전재고 미달 품목 목록 + 부족 수량"""
    items = db.query(Item).filter(
        Item.business_id == business.id,
        Item.safety_stock > 0,
        Item.current_stock <= Item.safety_stock,
        Item.is_active == 1,
    ).order_by(Item.current_stock).all()
    return [
        {
            "id":           i.id,
            "item_code":    i.item_code,
            "item_name":    i.item_name,
            "item_type":    i.item_type,
            "unit":         i.unit,
            "current_stock": float(i.current_stock),
            "safety_stock":  float(i.safety_stock),
            "shortage":      round(float(i.safety_stock) - float(i.current_stock), 3),
            "shortage_pct":  round((float(i.safety_stock) - float(i.current_stock)) / float(i.safety_stock) * 100, 1) if float(i.safety_stock) > 0 else 0,
        }
        for i in items
    ]


# ── 생산 효율 분석 ─────────────────────────────────────────────────────────────

@router.get("/efficiency")
def production_efficiency(
    db: Session = Depends(get_db), business=Depends(get_current_business),
):
    """생산 지시서 기반 효율 분석"""
    orders = db.query(ProductionOrder).filter(
        ProductionOrder.business_id == business.id,
        ProductionOrder.status.in_(["완료", "생산중"]),
    ).all()
    if not orders:
        return {"orders": [], "summary": {}}

    analyzed = []
    total_planned = 0; total_completed = 0; total_defect = 0
    for o in orders:
        completed = sum(float(r.completed_qty) for r in o.results)
        defect    = sum(float(r.defect_qty)    for r in o.results)
        planned   = float(o.planned_qty)
        achievement = round(completed / planned * 100, 1) if planned > 0 else 0
        defect_rate = round(defect / completed * 100, 1) if completed > 0 else 0
        total_planned   += planned
        total_completed += completed
        total_defect    += defect
        analyzed.append({
            "order_id":    o.id,
            "order_no":    o.order_no,
            "product_name": o.product.item_name if o.product else None,
            "status":       o.status,
            "planned_qty":  planned,
            "completed_qty": completed,
            "defect_qty":    defect,
            "achievement":   achievement,
            "defect_rate":   defect_rate,
            "planned_date":  str(o.planned_date) if o.planned_date else None,
        })

    avg_achievement = round(total_completed / total_planned * 100, 1) if total_planned > 0 else 0
    avg_defect_rate  = round(total_defect / total_completed * 100, 1) if total_completed > 0 else 0
    return {
        "orders": sorted(analyzed, key=lambda x: x["achievement"]),
        "summary": {
            "total_orders":     len(orders),
            "total_planned":    total_planned,
            "total_completed":  total_completed,
            "total_defect":     total_defect,
            "avg_achievement":  avg_achievement,
            "avg_defect_rate":  avg_defect_rate,
        },
    }


# ── 입출고 이력 ───────────────────────────────────────────────────────────────

@router.get("/inventory-logs")
def list_logs(
    item_id:  Optional[int] = None,
    log_type: Optional[str] = None,
    db: Session = Depends(get_db), business=Depends(get_current_business),
):
    q = db.query(InventoryLog).filter(InventoryLog.business_id == business.id)
    if item_id:  q = q.filter(InventoryLog.item_id  == item_id)
    if log_type: q = q.filter(InventoryLog.log_type == log_type)
    result = []
    for log in q.order_by(InventoryLog.log_date.desc()).all():
        d = {c.name: getattr(log, c.name) for c in log.__table__.columns}
        d["item_name"] = log.item.item_name if log.item else None
        result.append(d)
    return result


@router.post("/inventory-logs", status_code=201)
def create_log(body: InventoryLogCreate, db: Session = Depends(get_db), business=Depends(get_current_business)):
    from datetime import date as date_cls
    item = db.query(Item).filter(Item.id == body.item_id, Item.business_id == business.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="품목을 찾을 수 없습니다.")
    data = body.model_dump(exclude_none=True)
    # reference_no → ref_no 별칭 처리
    if "reference_no" in data:
        data["ref_no"] = data.pop("reference_no")
    if "log_date" not in data or data["log_date"] is None:
        data["log_date"] = date_cls.today()
    log = InventoryLog(business_id=business.id, **data)
    db.add(log)
    # 재고 업데이트
    item.current_stock = float(item.current_stock) + float(body.quantity)
    db.commit()
    db.refresh(log)
    return {c.name: getattr(log, c.name) for c in log.__table__.columns}
