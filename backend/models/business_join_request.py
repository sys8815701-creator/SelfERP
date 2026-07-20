from sqlalchemy import Column, Integer, String, Enum, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from core.database import Base
from datetime import datetime


class BusinessJoinRequest(Base):
    __tablename__ = "business_join_requests"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    user_id     = Column(Integer, ForeignKey("users.id"), nullable=False)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    status      = Column(Enum("pending", "approved", "rejected"), default="pending", nullable=False)
    reject_reason = Column(String(300), nullable=True)
    created_at  = Column(DateTime, default=datetime.utcnow)
    reviewed_at = Column(DateTime, nullable=True)

    user     = relationship("User",     foreign_keys=[user_id])
    business = relationship("Business", foreign_keys=[business_id])
