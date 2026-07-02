from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Enum, Numeric
from sqlalchemy.orm import relationship
from core.database import Base
from datetime import datetime

class Journal(Base):
    __tablename__ = "journals"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    date        = Column(Date, nullable=False)
    description = Column(String(255))
    receipt_id  = Column(Integer, ForeignKey("receipts.id"), nullable=True)
    created_by  = Column(Integer, ForeignKey("users.id"))
    created_at  = Column(DateTime, default=datetime.utcnow)

    created_by_user = relationship("User", back_populates="journals")
    receipt         = relationship("Receipt", back_populates="journals")
    lines           = relationship("JournalLine", back_populates="journal")


class JournalLine(Base):
    __tablename__ = "journal_lines"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    journal_id = Column(Integer, ForeignKey("journals.id"), nullable=False)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    side       = Column(Enum("debit", "credit"), nullable=False)
    amount     = Column(Numeric(15, 2), nullable=False)

    journal = relationship("Journal", back_populates="lines")
    account = relationship("Account", back_populates="journal_lines")