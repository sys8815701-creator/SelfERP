from sqlalchemy import Column, Integer, String, DateTime, Date, ForeignKey, Enum, Numeric, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from core.database import Base
from datetime import datetime

class Item(Base):
    """품목 (원자재/반제품/완제품)"""
    __tablename__ = "items"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    business_id     = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    item_code       = Column(String(50))
    item_name       = Column(String(200), nullable=False)
    item_type       = Column(Enum("원자재", "반제품", "완제품", "소모품"), default="원자재")
    unit            = Column(String(20), default="개")
    unit_price      = Column(Numeric(15, 2), default=0)    # 기준단가
    current_stock   = Column(Numeric(15, 3), default=0)    # 현재고
    safety_stock    = Column(Numeric(15, 3), default=0)    # 안전재고
    max_stock       = Column(Numeric(15, 3), default=0)    # 최대재고
    description     = Column(Text)
    is_active       = Column(Integer, default=1)
    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    business  = relationship("Business", back_populates="items")
    bom_lines = relationship("BOMLine", back_populates="item")
    logs      = relationship("InventoryLog", back_populates="item")


class BOM(Base):
    """자재명세서 (완제품 기준)"""
    __tablename__ = "boms"

    id             = Column(Integer, primary_key=True, autoincrement=True)
    business_id    = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    product_id     = Column(Integer, ForeignKey("items.id"), nullable=False)  # 완제품
    version        = Column(String(20), default="1.0")
    is_active      = Column(Integer, default=1)
    description    = Column(Text)
    created_at     = Column(DateTime, default=datetime.utcnow)

    business = relationship("Business", back_populates="boms")
    product  = relationship("Item", foreign_keys=[product_id])
    lines    = relationship("BOMLine", back_populates="bom", cascade="all, delete-orphan")


class BOMLine(Base):
    """BOM 구성 자재"""
    __tablename__ = "bom_lines"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    bom_id      = Column(Integer, ForeignKey("boms.id"), nullable=False)
    item_id     = Column(Integer, ForeignKey("items.id"), nullable=False)
    quantity    = Column(Numeric(15, 3), nullable=False)
    unit        = Column(String(20))
    note        = Column(String(200))

    bom  = relationship("BOM", back_populates="lines")
    item = relationship("Item", back_populates="bom_lines")


class ProductionOrder(Base):
    """생산 지시서"""
    __tablename__ = "production_orders"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    business_id     = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    order_no        = Column(String(50))
    product_id      = Column(Integer, ForeignKey("items.id"), nullable=False)
    bom_id          = Column(Integer, ForeignKey("boms.id"), nullable=True)
    planned_qty     = Column(Numeric(15, 3), nullable=False)
    planned_date    = Column(Date)
    status          = Column(Enum("대기", "생산중", "완료", "취소"), default="대기")
    note            = Column(Text)
    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    business = relationship("Business", back_populates="production_orders")
    product  = relationship("Item", foreign_keys=[product_id])
    results  = relationship("ProductionResult", back_populates="order")


class ProductionResult(Base):
    """생산 실적"""
    __tablename__ = "production_results"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    business_id     = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    order_id        = Column(Integer, ForeignKey("production_orders.id"), nullable=False)
    completed_qty   = Column(Numeric(15, 3), nullable=False)
    defect_qty      = Column(Numeric(15, 3), default=0)
    completed_date  = Column(Date, nullable=False)
    worker_note     = Column(Text)
    created_at      = Column(DateTime, default=datetime.utcnow)

    business = relationship("Business", back_populates="production_results")
    order    = relationship("ProductionOrder", back_populates="results")


class InventoryLog(Base):
    """입출고 이력"""
    __tablename__ = "inventory_logs"

    id           = Column(Integer, primary_key=True, autoincrement=True)
    business_id  = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    item_id      = Column(Integer, ForeignKey("items.id"), nullable=False)
    log_type     = Column(Enum("입고", "출고", "생산소비", "생산완료", "조정", "반품"), nullable=False)
    quantity     = Column(Numeric(15, 3), nullable=False)   # 양수=입고, 음수=출고
    unit_price   = Column(Numeric(15, 2), default=0)
    ref_no       = Column(String(50))    # 관련 생산지시서 번호 등
    note         = Column(Text)
    log_date     = Column(Date, nullable=False)
    created_at   = Column(DateTime, default=datetime.utcnow)

    business = relationship("Business", back_populates="inventory_logs")
    item     = relationship("Item", back_populates="logs")
