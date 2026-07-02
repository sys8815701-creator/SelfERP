from sqlalchemy import Column, Integer, String, Enum, DateTime
from sqlalchemy.orm import relationship
from core.database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    email       = Column(String(100), unique=True, nullable=False)
    password    = Column(String(255), nullable=True)
    name        = Column(String(50))
    role        = Column(Enum("admin", "accountant", "employee"), default="employee")
    provider    = Column(String(20), nullable=True)    # "kakao" | "naver" | "google"
    provider_id = Column(String(100), nullable=True)   # 각 플랫폼의 고유 사용자 ID
    created_at  = Column(DateTime, default=datetime.utcnow)

    journals   = relationship("Journal", back_populates="created_by_user")
    receipts   = relationship("Receipt", back_populates="uploaded_by_user")
    expenses   = relationship(
        "Expense",
        foreign_keys="[Expense.requested_by]",
        back_populates="requested_by_user"
    )
    businesses = relationship("Business", back_populates="user")