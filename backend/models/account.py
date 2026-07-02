from sqlalchemy import Column, Integer, String, Enum
from sqlalchemy.orm import relationship
from core.database import Base

class Account(Base):
    __tablename__ = "accounts"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    code        = Column(String(10), unique=True, nullable=False)  # ex) 10100
    name        = Column(String(50), nullable=False)               # ex) 현금
    type        = Column(Enum("asset", "liability", "equity", "revenue", "expense"))
    normal_side = Column(Enum("debit", "credit"))                  # 정상잔액 방향

    journal_lines = relationship("JournalLine", back_populates="account")