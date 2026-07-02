from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from core.database import Base
from datetime import datetime

class Business(Base):
    __tablename__ = "businesses"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    user_id         = Column(Integer, ForeignKey("users.id"), nullable=False)
    business_name   = Column(String(100), nullable=False)
    business_number = Column(String(20), unique=True)
    owner_name      = Column(String(50))
    industry        = Column(String(50))
    business_type   = Column(String(50))
    open_date       = Column(Date)
    created_at      = Column(DateTime, default=datetime.utcnow)
    bank_name       = Column(String(50), nullable=True)
    account_number  = Column(String(50), nullable=True)
    bank_holder     = Column(String(100), nullable=True)

    user              = relationship("User", back_populates="businesses")
    card_sales        = relationship("CardSale", back_populates="business")
    bank_transactions = relationship("BankTransaction", back_populates="business")
    vendors           = relationship("Vendor", back_populates="business")
    departments       = relationship("Department", back_populates="business")
    positions         = relationship("Position", back_populates="business")
    employees         = relationship("Employee", back_populates="business")
    contracts         = relationship("Contract", back_populates="business")
    leaves            = relationship("Leave", back_populates="business")
    payrolls          = relationship("Payroll", back_populates="business")
    severances        = relationship("Severance", back_populates="business")
    receivables       = relationship("AccountReceivable", back_populates="business")
    payables          = relationship("AccountPayable",    back_populates="business")
    tax_invoices      = relationship("TaxInvoice",        back_populates="business")
    estimates         = relationship("Estimate",          back_populates="business")
    budgets           = relationship("BudgetItem",        back_populates="business")