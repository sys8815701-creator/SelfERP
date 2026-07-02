from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Enum, Numeric, Text
from sqlalchemy.orm import relationship
from core.database import Base
from datetime import datetime

class Receipt(Base):
    __tablename__ = "receipts"

    id           = Column(Integer, primary_key=True, autoincrement=True)
    file_path    = Column(String(255))
    vendor       = Column(String(100))        # 거래처
    total_amount = Column(Numeric(15, 2))
    tax_amount   = Column(Numeric(15, 2))
    issued_at    = Column(Date)
    raw_text     = Column(Text)               # OCR 원문
    status       = Column(Enum("pending", "approved", "rejected"), default="pending")
    uploaded_by  = Column(Integer, ForeignKey("users.id"))
    created_at   = Column(DateTime, default=datetime.utcnow)

    uploaded_by_user = relationship("User", back_populates="receipts")
    journals         = relationship("Journal", back_populates="receipt")
    expenses         = relationship("Expense", back_populates="receipt")