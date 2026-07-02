from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from core.database import Base
from datetime import datetime


class Position(Base):
    __tablename__ = "positions"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    name        = Column(String(100), nullable=False)
    level       = Column(Integer, default=1)
    description = Column(String(500))
    created_at  = Column(DateTime, default=datetime.utcnow)

    business  = relationship("Business", back_populates="positions")
    employees = relationship("Employee", back_populates="position")
