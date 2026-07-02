from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from core.database import Base
from datetime import datetime

class BankTransaction(Base):
    __tablename__ = "bank_transactions"

    id               = Column(Integer, primary_key=True, autoincrement=True)
    business_id      = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    transaction_date = Column(Date, nullable=False)     # 거래일
    description      = Column(String(255))              # 적요
    deposit          = Column(Numeric(15, 2), default=0)   # 입금
    withdrawal       = Column(Numeric(15, 2), default=0)   # 출금
    balance          = Column(Numeric(15, 2))           # 잔액
    category         = Column(String(50))               # 자동분류 결과
    is_matched       = Column(Integer, default=0)       # 영수증 매칭 여부
    created_at       = Column(DateTime, default=datetime.utcnow)

    business = relationship("Business", back_populates="bank_transactions")