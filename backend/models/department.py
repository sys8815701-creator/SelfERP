from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from core.database import Base
from datetime import datetime


class Department(Base):
    __tablename__ = "departments"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    name        = Column(String(100), nullable=False)
    code        = Column(String(20))
    description = Column(String(500))
    parent_id   = Column(Integer, ForeignKey("departments.id"), nullable=True)
    created_at  = Column(DateTime, default=datetime.utcnow)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    business  = relationship("Business", back_populates="departments")
    parent    = relationship("Department", remote_side=[id], back_populates="children")
    children  = relationship("Department", back_populates="parent")
    employees = relationship("Employee", back_populates="department")
