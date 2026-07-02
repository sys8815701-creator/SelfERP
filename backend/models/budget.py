from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Numeric, UniqueConstraint
from sqlalchemy.orm import relationship
from core.database import Base
from datetime import datetime

class BudgetItem(Base):
    """예산 항목 (월별·계정과목별)"""
    __tablename__ = "budget_items"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    budget_year = Column(Integer, nullable=False)
    budget_month= Column(Integer, nullable=False)
    category    = Column(String(100), nullable=False)   # 계정과목·비용 유형
    btype       = Column(String(20), default="expense") # "revenue" or "expense"
    amount      = Column(Numeric(15, 2), nullable=False)
    note        = Column(String(200))
    created_at  = Column(DateTime, default=datetime.utcnow)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("business_id", "budget_year", "budget_month", "category", "btype", name="uq_budget"),
    )

    business = relationship("Business", back_populates="budgets")
