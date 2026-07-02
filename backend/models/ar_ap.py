from sqlalchemy import Column, Integer, String, DateTime, Date, ForeignKey, Enum, Numeric, Text
from sqlalchemy.orm import relationship
from core.database import Base
from datetime import datetime

class AccountReceivable(Base):
    """미수금(외상매출금)"""
    __tablename__ = "account_receivables"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    business_id   = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    vendor_id     = Column(Integer, ForeignKey("vendors.id"), nullable=True)
    title         = Column(String(200), nullable=False)
    amount        = Column(Numeric(15, 2), nullable=False)
    paid_amount   = Column(Numeric(15, 2), default=0)
    issue_date    = Column(Date, nullable=False)
    due_date      = Column(Date, nullable=False)
    status        = Column(Enum("미수", "일부수금", "완료", "대손"), default="미수")
    note          = Column(Text)
    created_at    = Column(DateTime, default=datetime.utcnow)
    updated_at    = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    business = relationship("Business", back_populates="receivables")
    vendor   = relationship("Vendor")


class AccountPayable(Base):
    """미지급금(외상매입금)"""
    __tablename__ = "account_payables"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    business_id   = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    vendor_id     = Column(Integer, ForeignKey("vendors.id"), nullable=True)
    title         = Column(String(200), nullable=False)
    amount        = Column(Numeric(15, 2), nullable=False)
    paid_amount   = Column(Numeric(15, 2), default=0)
    issue_date    = Column(Date, nullable=False)
    due_date      = Column(Date, nullable=False)
    status        = Column(Enum("미지급", "일부지급", "완료"), default="미지급")
    note          = Column(Text)
    created_at    = Column(DateTime, default=datetime.utcnow)
    updated_at    = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    business = relationship("Business", back_populates="payables")
    vendor   = relationship("Vendor")
