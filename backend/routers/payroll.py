from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from core.database import get_db
from core.deps import get_current_business, get_current_user
from models.business import Business
from models.user import User
from models.employee import Employee
from models.payroll import Payroll, Severance
from pydantic import BaseModel
from typing import Optional, List
from datetime import date
from decimal import Decimal

router = APIRouter(prefix="/api/hr/payroll", tags=["payroll"])


def require_admin(
    current_user: User = Depends(get_current_user),
    business: Business = Depends(get_current_business),
) -> Business:
    """급여·퇴직금 정보는 사업장 admin만 접근 가능."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="급여 정보에 접근할 권한이 없습니다.")
    return business


# ── Schemas ────────────────────────────────────────────
class PayrollCreate(BaseModel):
    employee_id: int
    pay_year: int
    pay_month: int
    base_salary: float = 0
    overtime_pay: float = 0
    bonus: float = 0
    meal_allowance: float = 0
    transport_allow: float = 0
    other_allowance: float = 0
    national_pension: float = 0
    health_insurance: float = 0
    employment_insurance: float = 0
    income_tax: float = 0
    local_income_tax: float = 0
    other_deduction: float = 0
    advance_payment: float = 0
    note: Optional[str] = None


class PayrollUpdate(BaseModel):
    base_salary: Optional[float] = None
    overtime_pay: Optional[float] = None
    bonus: Optional[float] = None
    meal_allowance: Optional[float] = None
    transport_allow: Optional[float] = None
    other_allowance: Optional[float] = None
    national_pension: Optional[float] = None
    health_insurance: Optional[float] = None
    employment_insurance: Optional[float] = None
    income_tax: Optional[float] = None
    local_income_tax: Optional[float] = None
    other_deduction: Optional[float] = None
    advance_payment: Optional[float] = None
    status: Optional[str] = None
    note: Optional[str] = None


class SeveranceCreate(BaseModel):
    employee_id: int
    resign_date: date
    avg_wage_3m: float
    note: Optional[str] = None


# ── Payroll 목록 ─────────────────────────────────────
@router.get("/")
def list_payrolls(
    year: int = None, month: int = None,
    employee_id: int = None,
    business: Business = Depends(require_admin),
    db: Session = Depends(get_db),
):
    from datetime import date as dt
    y = year or dt.today().year
    m = month or dt.today().month

    q = db.query(Payroll).filter(
        Payroll.business_id == business.id,
        Payroll.pay_year == y,
        Payroll.pay_month == m,
    )
    if employee_id:
        q = q.filter(Payroll.employee_id == employee_id)
    payrolls = q.all()
    result = []
    for p in payrolls:
        gross = float(p.base_salary + p.overtime_pay + p.bonus + p.meal_allowance + p.transport_allow + p.other_allowance)
        deductions = float(p.national_pension + p.health_insurance + p.employment_insurance + p.income_tax + p.local_income_tax + p.other_deduction + p.advance_payment)
        net = gross - deductions
        result.append({
            "id": p.id,
            "employee_id": p.employee_id,
            "employee_name": p.employee.name if p.employee else None,
            "pay_year": p.pay_year,
            "pay_month": p.pay_month,
            "base_salary": float(p.base_salary),
            "overtime_pay": float(p.overtime_pay),
            "bonus": float(p.bonus),
            "meal_allowance": float(p.meal_allowance),
            "transport_allow": float(p.transport_allow),
            "other_allowance": float(p.other_allowance),
            "national_pension": float(p.national_pension),
            "health_insurance": float(p.health_insurance),
            "employment_insurance": float(p.employment_insurance),
            "income_tax": float(p.income_tax),
            "local_income_tax": float(p.local_income_tax),
            "other_deduction": float(p.other_deduction),
            "advance_payment": float(p.advance_payment),
            "gross_pay": gross,
            "total_deduction": deductions,
            "net_pay": net,
            "status": p.status,
            "note": p.note,
            "created_at": p.created_at.isoformat(),
        })
    return result


@router.post("/", status_code=201)
def create_payroll(
    data: PayrollCreate,
    business: Business = Depends(require_admin),
    db: Session = Depends(get_db),
):
    emp = db.query(Employee).filter(Employee.id == data.employee_id, Employee.business_id == business.id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="직원을 찾을 수 없습니다.")
    existing = db.query(Payroll).filter(
        Payroll.employee_id == data.employee_id,
        Payroll.pay_year == data.pay_year,
        Payroll.pay_month == data.pay_month,
        Payroll.business_id == business.id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="해당 월 급여명세서가 이미 존재합니다.")
    payroll = Payroll(**data.dict(), business_id=business.id)
    db.add(payroll)
    db.commit()
    db.refresh(payroll)
    return {"id": payroll.id, "message": "급여명세서가 생성되었습니다."}


@router.put("/{payroll_id}")
def update_payroll(
    payroll_id: int,
    data: PayrollUpdate,
    business: Business = Depends(require_admin),
    db: Session = Depends(get_db),
):
    payroll = db.query(Payroll).filter(Payroll.id == payroll_id, Payroll.business_id == business.id).first()
    if not payroll:
        raise HTTPException(status_code=404, detail="급여 데이터를 찾을 수 없습니다.")
    for k, v in data.dict(exclude_none=True).items():
        setattr(payroll, k, v)
    db.commit()
    return {"message": "수정되었습니다."}


@router.delete("/{payroll_id}", status_code=204)
def delete_payroll(
    payroll_id: int,
    business: Business = Depends(require_admin),
    db: Session = Depends(get_db),
):
    payroll = db.query(Payroll).filter(Payroll.id == payroll_id, Payroll.business_id == business.id).first()
    if not payroll:
        raise HTTPException(status_code=404, detail="급여 데이터를 찾을 수 없습니다.")
    db.delete(payroll)
    db.commit()


# ── 자동 계산 ─────────────────────────────────────────
@router.post("/calculate")
def calculate_payroll(
    employee_id: int,
    business: Business = Depends(require_admin),
    db: Session = Depends(get_db),
):
    emp = db.query(Employee).filter(Employee.id == employee_id, Employee.business_id == business.id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="직원을 찾을 수 없습니다.")
    base = float(emp.base_salary or 0)
    # 4대보험 자동 계산 (2024년 기준 대략적 요율)
    national_pension    = round(base * 0.045, 0)   # 국민연금 4.5%
    health_insurance    = round(base * 0.0354, 0)  # 건강보험 3.545%
    employment_insurance = round(base * 0.009, 0)  # 고용보험 0.9%
    # 소득세: 간이세액표 (단순화)
    taxable = base - national_pension - health_insurance - employment_insurance
    if taxable <= 1060000:
        income_tax = 0
    elif taxable <= 1500000:
        income_tax = round((taxable - 1060000) * 0.06, 0)
    elif taxable <= 3000000:
        income_tax = round(26400 + (taxable - 1500000) * 0.15, 0)
    else:
        income_tax = round(251400 + (taxable - 3000000) * 0.24, 0)
    local_income_tax = round(income_tax * 0.1, 0)

    return {
        "base_salary": base,
        "national_pension": national_pension,
        "health_insurance": health_insurance,
        "employment_insurance": employment_insurance,
        "income_tax": income_tax,
        "local_income_tax": local_income_tax,
        "estimated_net": base - national_pension - health_insurance - employment_insurance - income_tax - local_income_tax,
    }


# ── 퇴직금 계산 ───────────────────────────────────────
@router.post("/severance/calculate")
def calculate_severance(
    employee_id: int,
    resign_date: date,
    avg_wage_3m: Optional[float] = None,
    business: Business = Depends(require_admin),
    db: Session = Depends(get_db),
):
    emp = db.query(Employee).filter(Employee.id == employee_id, Employee.business_id == business.id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="직원을 찾을 수 없습니다.")
    hire = emp.hire_date
    from datetime import timedelta
    days_worked = (resign_date - hire).days
    years_worked = days_worked / 365
    if years_worked < 1:
        raise HTTPException(status_code=400, detail="근속 1년 미만은 퇴직금 대상이 아닙니다.")
    avg_wage = float(avg_wage_3m) if avg_wage_3m is not None else float(emp.base_salary or 0)
    # 퇴직금 = 평균임금 × 30일 × (근속연수)
    severance = round(avg_wage / 30 * 30 * years_worked, 0)
    return {
        "employee_id": employee_id,
        "employee_name": emp.name,
        "hire_date": hire.isoformat(),
        "resign_date": resign_date.isoformat(),
        "days_worked": days_worked,
        "years_worked": round(years_worked, 2),
        "avg_wage_monthly": avg_wage,
        "severance_pay": severance,
    }


@router.get("/severance/")
def list_severances(
    business: Business = Depends(require_admin),
    db: Session = Depends(get_db),
):
    severances = db.query(Severance).filter(Severance.business_id == business.id).all()
    return [{
        "id": s.id,
        "employee_id": s.employee_id,
        "employee_name": s.employee.name if s.employee else None,
        "resign_date": s.resign_date.isoformat(),
        "total_pay": float(s.total_pay),
        "work_years": float(s.work_years),
        "status": s.status,
    } for s in severances]


@router.post("/severance/", status_code=201)
def create_severance(
    data: SeveranceCreate,
    business: Business = Depends(require_admin),
    db: Session = Depends(get_db),
):
    emp = db.query(Employee).filter(Employee.id == data.employee_id, Employee.business_id == business.id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="직원을 찾을 수 없습니다.")
    from datetime import timedelta
    days_worked = (data.resign_date - emp.hire_date).days
    years_worked = days_worked / 365
    total_pay = round(data.avg_wage_3m / 30 * 30 * years_worked, 0)
    sev = Severance(
        business_id=business.id, employee_id=data.employee_id,
        resign_date=data.resign_date, total_pay=total_pay,
        avg_wage_3m=data.avg_wage_3m, work_years=round(years_worked, 2),
        note=data.note,
    )
    db.add(sev)
    emp.status = "퇴직"
    emp.resign_date = data.resign_date
    db.commit()
    return {"message": "퇴직금이 정산되었습니다.", "total_pay": total_pay}
