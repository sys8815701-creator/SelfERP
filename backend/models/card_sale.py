from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from core.database import Base
from datetime import datetime

class CardSale(Base):
    __tablename__ = "card_sales"

    id               = Column(Integer, primary_key=True, autoincrement=True)
    business_id      = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    card_company     = Column(String(50))           # 카드사
    approval_no      = Column(String(50))           # 승인번호
    approval_date    = Column(Date)                 # 승인일
    approval_amount  = Column(Numeric(15, 2))       # 승인금액
    fee_amount       = Column(Numeric(15, 2))       # 카드수수료
    deposit_date     = Column(Date)                 # 입금예정일
    deposited_at     = Column(Date)                 # 입금완료일
    status           = Column(String(20), default="pending")  # pending / deposited
    created_at       = Column(DateTime, default=datetime.utcnow)

    business = relationship("Business", back_populates="card_sales")