from sqlalchemy import Column, Integer, String, DateTime, Date, ForeignKey, Enum, Numeric, Text
from sqlalchemy.orm import relationship
from core.database import Base
from datetime import datetime

class TaxInvoice(Base):
    """세금계산서"""
    __tablename__ = "tax_invoices"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    business_id     = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    vendor_id       = Column(Integer, ForeignKey("vendors.id"), nullable=True)
    direction       = Column(Enum("발행", "수취"), nullable=False)   # 매출세금계산서 / 매입세금계산서
    invoice_no      = Column(String(50))                             # 승인번호 / 문서번호
    issue_date      = Column(Date, nullable=False)
    supply_amount   = Column(Numeric(15, 2), nullable=False)         # 공급가액
    tax_amount      = Column(Numeric(15, 2), nullable=False)         # 세액 (공급가액 × 10%)
    total_amount    = Column(Numeric(15, 2), nullable=False)         # 합계
    item_name       = Column(String(200))                            # 품목
    status          = Column(Enum("임시저장", "발행완료", "취소"), default="임시저장")
    note            = Column(Text)
    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    business = relationship("Business", back_populates="tax_invoices")
    vendor   = relationship("Vendor")
