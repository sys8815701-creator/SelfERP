from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from core.database import Base
from datetime import datetime


class Todo(Base):
    __tablename__ = "todos"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    text        = Column(String(255), nullable=False)
    done        = Column(Boolean, default=False)
    created_at  = Column(DateTime, default=datetime.utcnow)
