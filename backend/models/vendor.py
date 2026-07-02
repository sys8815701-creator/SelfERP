from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from core.database import Base
from datetime import datetime

class Vendor(Base):
    __tablename__ = "vendors"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    business_id   = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    vendor_name   = Column(String(100), nullable=False)   # 거래처명
    vendor_type   = Column(String(50))                    # 매출처 / 매입처 / 기타
    business_number = Column(String(20))                  # 사업자번호
    contact       = Column(String(50))                    # 연락처
    created_at    = Column(DateTime, default=datetime.utcnow)

    business = relationship("Business", back_populates="vendors")