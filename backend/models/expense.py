from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Numeric
from sqlalchemy.orm import relationship
from core.database import Base
from datetime import datetime

class Expense(Base):
    __tablename__ = "expenses"

    id           = Column(Integer, primary_key=True, autoincrement=True)
    title        = Column(String(100))
    amount       = Column(Numeric(15, 2))
    category     = Column(String(50))
    receipt_id   = Column(Integer, ForeignKey("receipts.id"), nullable=True)
    requested_by = Column(Integer, ForeignKey("users.id"))
    approved_by  = Column(Integer, ForeignKey("users.id"), nullable=True)
    status       = Column(Enum("draft", "pending", "approved", "rejected"), default="draft")
    requested_at = Column(DateTime)
    approved_at  = Column(DateTime, nullable=True)
    created_at   = Column(DateTime, default=datetime.utcnow)

    receipt              = relationship("Receipt", back_populates="expenses")
    requested_by_user    = relationship("User", foreign_keys=[requested_by], back_populates="expenses")
    approved_by_user     = relationship("User", foreign_keys=[approved_by])