from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from core.database import Base
from datetime import datetime

class Vendor(Base):
    __tablename__ = "vendors"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    business_id     = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    vendor_name     = Column(String(100), nullable=False)
    vendor_type     = Column(Enum("매출처", "매입처", "양방향", "기타"), default="기타")
    business_number = Column(String(20))
    ceo_name        = Column(String(50))
    contact_name    = Column(String(50))
    contact         = Column(String(50))
    email           = Column(String(100))
    address         = Column(String(200))
    industry        = Column(String(50))
    bank_name       = Column(String(50))
    account_number  = Column(String(50))
    bank_holder     = Column(String(50))
    credit_limit    = Column(Integer, default=0)   # 여신한도
    payment_terms   = Column(Integer, default=30)  # 결제조건(일)
    note            = Column(Text)
    is_active       = Column(Integer, default=1)   # 0=거래중지
    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    business = relationship("Business", back_populates="vendors")