from sqlalchemy import Column, String, Text, DateTime
from core.database import Base
from datetime import datetime

class SystemSetting(Base):
    __tablename__ = "system_settings"

    key        = Column(String(100), primary_key=True)
    value      = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
