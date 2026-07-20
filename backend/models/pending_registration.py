from sqlalchemy import Column, Integer, String, Enum, DateTime, Text
from core.database import Base
from datetime import datetime


class PendingRegistration(Base):
    __tablename__ = "pending_registrations"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    status          = Column(Enum("pending", "approved", "rejected"), default="pending", nullable=False)

    # 사업자 정보
    business_name   = Column(String(100), nullable=False)
    business_number = Column(String(20), nullable=False)
    owner_name      = Column(String(50), nullable=False)
    industry        = Column(String(100))
    business_type   = Column(String(100))
    open_date       = Column(String(20))
    address         = Column(String(200))

    # 계정 정보 (비밀번호는 해시 저장)
    email           = Column(String(100), nullable=False, unique=True)
    password_hash   = Column(String(255), nullable=False)

    reject_reason   = Column(Text, nullable=True)
    reviewed_at     = Column(DateTime, nullable=True)
    created_at      = Column(DateTime, default=datetime.utcnow)
