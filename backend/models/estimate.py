from sqlalchemy import Column, Integer, String, DateTime, Date, ForeignKey, Enum, Numeric, Text
from sqlalchemy.orm import relationship
from core.database import Base
from datetime import datetime

class Estimate(Base):
    """견적서·청구서"""
    __tablename__ = "estimates"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    business_id   = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    vendor_id     = Column(Integer, ForeignKey("vendors.id"), nullable=True)
    doc_type      = Column(Enum("견적서", "청구서", "발주서"), default="견적서")
    doc_no        = Column(String(50))
    issue_date    = Column(Date, nullable=False)
    due_date      = Column(Date)
    supply_amount = Column(Numeric(15, 2), default=0)
    tax_amount    = Column(Numeric(15, 2), default=0)
    total_amount  = Column(Numeric(15, 2), default=0)
    status        = Column(Enum("초안", "발송", "승인", "취소"), default="초안")
    note          = Column(Text)
    created_at    = Column(DateTime, default=datetime.utcnow)
    updated_at    = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    business = relationship("Business", back_populates="estimates")
    vendor   = relationship("Vendor")
    items    = relationship("EstimateItem", back_populates="estimate", cascade="all, delete-orphan")


class EstimateItem(Base):
    """견적서 품목 라인"""
    __tablename__ = "estimate_items"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    estimate_id = Column(Integer, ForeignKey("estimates.id"), nullable=False)
    item_name   = Column(String(200), nullable=False)
    quantity    = Column(Numeric(10, 2), default=1)
    unit_price  = Column(Numeric(15, 2), default=0)
    amount      = Column(Numeric(15, 2), default=0)   # quantity × unit_price
    note        = Column(String(200))

    estimate = relationship("Estimate", back_populates="items")
