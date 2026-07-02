from sqlalchemy import Column, Integer, String, DateTime
from core.database import Base
from datetime import datetime

class EmailVerification(Base):
    __tablename__ = "email_verifications"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    email       = Column(String(100), nullable=False, index=True)
    code        = Column(String(6),   nullable=False)
    expires_at  = Column(DateTime,    nullable=False)
    verified_at = Column(DateTime,    nullable=True)
    created_at  = Column(DateTime,    default=datetime.utcnow)
