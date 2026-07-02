from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Enum, Numeric
from sqlalchemy.orm import relationship
from core.database import Base
from datetime import datetime


class Employee(Base):
    __tablename__ = "employees"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    business_id     = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    department_id   = Column(Integer, ForeignKey("departments.id"), nullable=True)
    position_id     = Column(Integer, ForeignKey("positions.id"), nullable=True)
    user_id         = Column(Integer, ForeignKey("users.id"), nullable=True)

    name            = Column(String(50), nullable=False)
    email           = Column(String(100))
    phone           = Column(String(20))
    birth_date      = Column(Date, nullable=True)
    gender          = Column(Enum("남", "여"), nullable=True)
    hire_date       = Column(Date, nullable=False)
    resign_date     = Column(Date, nullable=True)
    employment_type = Column(Enum("정규직", "계약직", "일용직", "파트타임"), default="정규직")
    status          = Column(Enum("재직", "휴직", "퇴직"), default="재직")

    base_salary     = Column(Numeric(15, 2), default=0)
    bank_name       = Column(String(50))
    account_number  = Column(String(50))
    bank_holder     = Column(String(50))

    address         = Column(String(200))
    emergency_name  = Column(String(50))
    emergency_phone = Column(String(20))
    note            = Column(String(500))

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    business   = relationship("Business", back_populates="employees")
    department = relationship("Department", back_populates="employees")
    position   = relationship("Position", back_populates="employees")
    contracts  = relationship("Contract", back_populates="employee")
    leaves     = relationship("Leave", back_populates="employee")
