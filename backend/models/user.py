from sqlalchemy import Column, Integer, String, Enum, DateTime, Boolean
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
    # 사업장 소속과 무관한 플랫폼 운영자 계정 — 신규 가입 승인 등 플랫폼 차원 작업 전용
    is_platform_admin = Column(Boolean, default=False)
    provider        = Column(String(20), nullable=True)
    provider_id     = Column(String(100), nullable=True)
    phone           = Column(String(20), nullable=True)
    department_name = Column(String(50), nullable=True)
    position_name   = Column(String(50), nullable=True)
    employee_number = Column(String(30), nullable=True)
    hire_date       = Column(String(10), nullable=True)   # YYYY-MM-DD
    is_active       = Column(Integer, default=1)           # 0=승인 대기, 1=활성
    created_at      = Column(DateTime, default=datetime.utcnow)

    journals   = relationship("Journal", back_populates="created_by_user")
    receipts   = relationship("Receipt", back_populates="uploaded_by_user")
    expenses   = relationship(
        "Expense",
        foreign_keys="[Expense.requested_by]",
        back_populates="requested_by_user"
    )
    businesses = relationship("Business", back_populates="user")