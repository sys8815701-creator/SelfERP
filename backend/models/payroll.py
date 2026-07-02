from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Enum, Numeric, Text
from sqlalchemy.orm import relationship
from core.database import Base
from datetime import datetime


class Payroll(Base):
    __tablename__ = "payrolls"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    business_id     = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    employee_id     = Column(Integer, ForeignKey("employees.id"), nullable=False)

    pay_year        = Column(Integer, nullable=False)
    pay_month       = Column(Integer, nullable=False)

    base_salary     = Column(Numeric(15, 2), default=0)   # 기본급
    overtime_pay    = Column(Numeric(15, 2), default=0)   # 연장근로수당
    bonus           = Column(Numeric(15, 2), default=0)   # 상여금
    meal_allowance  = Column(Numeric(15, 2), default=0)   # 식대
    transport_allow = Column(Numeric(15, 2), default=0)   # 교통비
    other_allowance = Column(Numeric(15, 2), default=0)   # 기타수당

    national_pension   = Column(Numeric(15, 2), default=0)  # 국민연금
    health_insurance   = Column(Numeric(15, 2), default=0)  # 건강보험
    employment_insurance = Column(Numeric(15, 2), default=0) # 고용보험
    income_tax         = Column(Numeric(15, 2), default=0)  # 소득세
    local_income_tax   = Column(Numeric(15, 2), default=0)  # 지방소득세
    other_deduction    = Column(Numeric(15, 2), default=0)  # 기타공제

    advance_payment = Column(Numeric(15, 2), default=0)  # 가불
    status          = Column(Enum("작성중", "확정", "지급완료"), default="작성중")
    note            = Column(Text)
    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    business = relationship("Business", back_populates="payrolls")
    employee = relationship("Employee", back_populates="payrolls")


class Severance(Base):
    __tablename__ = "severances"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)

    resign_date  = Column(Date, nullable=False)
    total_pay    = Column(Numeric(15, 2), nullable=False)   # 퇴직금 총액
    avg_wage_3m  = Column(Numeric(15, 2), nullable=False)   # 3개월 평균임금
    work_years   = Column(Numeric(6, 2), nullable=False)    # 근속연수
    status       = Column(Enum("계산완료", "지급완료"), default="계산완료")
    note         = Column(Text)
    created_at   = Column(DateTime, default=datetime.utcnow)

    business = relationship("Business", back_populates="severances")
    employee = relationship("Employee", back_populates="severances")
