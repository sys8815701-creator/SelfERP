from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Enum, Text, Numeric
from sqlalchemy.orm import relationship
from core.database import Base
from datetime import datetime


class Leave(Base):
    __tablename__ = "leaves"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)

    leave_type  = Column(Enum("연차", "반차(오전)", "반차(오후)", "병가", "경조사", "무급", "기타"), nullable=False)
    start_date  = Column(Date, nullable=False)
    end_date    = Column(Date, nullable=False)
    days        = Column(Numeric(4, 1), nullable=False)  # 사용 일수 (반차=0.5)
    reason      = Column(String(500))
    status      = Column(Enum("대기", "승인", "거절"), default="대기")
    note        = Column(Text)
    created_at  = Column(DateTime, default=datetime.utcnow)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    business = relationship("Business", back_populates="leaves")
    employee = relationship("Employee", back_populates="leaves")
