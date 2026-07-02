from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from core.database import get_db
from core.deps import get_current_business
from models.business import Business
from models.department import Department
from models.position import Position
from models.employee import Employee
from models.contract import Contract
from models.leave import Leave
from schemas.hr import (
    DepartmentCreate, DepartmentUpdate, DepartmentResponse,
    PositionCreate, PositionUpdate, PositionResponse,
    EmployeeCreate, EmployeeUpdate, EmployeeResponse,
    ContractCreate, ContractUpdate, ContractResponse,
    LeaveCreate, LeaveUpdate, LeaveResponse,
)
from typing import List

router = APIRouter(prefix="/api/hr", tags=["hr"])


# ── HR 개요 ───────────────────────────────────────────────
@router.get("/summary")
def get_hr_summary(
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    dept_count = db.query(Department).filter(Department.business_id == business.id).count()
    pos_count  = db.query(Position).filter(Position.business_id == business.id).count()
    emp_total  = db.query(Employee).filter(Employee.business_id == business.id, Employee.status == "재직").count()
    emp_new    = db.query(Employee).filter(
        Employee.business_id == business.id,
        func.date_format(Employee.hire_date, "%Y-%m") == func.date_format(func.now(), "%Y-%m"),
    ).count()

    dept_stats = (
        db.query(Department.name, func.count(Employee.id).label("cnt"))
        .outerjoin(Employee, (Employee.department_id == Department.id) & (Employee.status == "재직"))
        .filter(Department.business_id == business.id)
        .group_by(Department.id)
        .all()
    )

    return {
        "dept_count": dept_count,
        "position_count": pos_count,
        "employee_count": emp_total,
        "new_hires_this_month": emp_new,
        "dept_stats": [{"name": d.name, "count": d.cnt} for d in dept_stats],
    }


# ── Departments ────────────────────────────────────────────
@router.get("/departments", response_model=List[DepartmentResponse])
def list_departments(
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    depts = db.query(Department).filter(Department.business_id == business.id).all()
    result = []
    for d in depts:
        cnt = db.query(Employee).filter(
            Employee.department_id == d.id, Employee.status == "재직"
        ).count()
        r = DepartmentResponse.from_orm(d)
        r.employee_count = cnt
        result.append(r)
    return result


@router.post("/departments", response_model=DepartmentResponse, status_code=201)
def create_department(
    data: DepartmentCreate,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    dept = Department(**data.dict(), business_id=business.id)
    db.add(dept)
    db.commit()
    db.refresh(dept)
    r = DepartmentResponse.from_orm(dept)
    r.employee_count = 0
    return r


@router.put("/departments/{dept_id}", response_model=DepartmentResponse)
def update_department(
    dept_id: int,
    data: DepartmentUpdate,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    dept = db.query(Department).filter(
        Department.id == dept_id, Department.business_id == business.id
    ).first()
    if not dept:
        raise HTTPException(status_code=404, detail="부서를 찾을 수 없습니다.")
    for k, v in data.dict(exclude_none=True).items():
        setattr(dept, k, v)
    db.commit()
    db.refresh(dept)
    cnt = db.query(Employee).filter(
        Employee.department_id == dept.id, Employee.status == "재직"
    ).count()
    r = DepartmentResponse.from_orm(dept)
    r.employee_count = cnt
    return r


@router.delete("/departments/{dept_id}", status_code=204)
def delete_department(
    dept_id: int,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    dept = db.query(Department).filter(
        Department.id == dept_id, Department.business_id == business.id
    ).first()
    if not dept:
        raise HTTPException(status_code=404, detail="부서를 찾을 수 없습니다.")
    emp_count = db.query(Employee).filter(Employee.department_id == dept_id).count()
    if emp_count > 0:
        raise HTTPException(status_code=400, detail="소속 직원이 있는 부서는 삭제할 수 없습니다.")
    db.delete(dept)
    db.commit()


# ── Positions ─────────────────────────────────────────────
@router.get("/positions", response_model=List[PositionResponse])
def list_positions(
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    positions = db.query(Position).filter(
        Position.business_id == business.id
    ).order_by(Position.level.desc()).all()
    result = []
    for p in positions:
        cnt = db.query(Employee).filter(
            Employee.position_id == p.id, Employee.status == "재직"
        ).count()
        r = PositionResponse.from_orm(p)
        r.employee_count = cnt
        result.append(r)
    return result


@router.post("/positions", response_model=PositionResponse, status_code=201)
def create_position(
    data: PositionCreate,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    pos = Position(**data.dict(), business_id=business.id)
    db.add(pos)
    db.commit()
    db.refresh(pos)
    r = PositionResponse.from_orm(pos)
    r.employee_count = 0
    return r


@router.put("/positions/{pos_id}", response_model=PositionResponse)
def update_position(
    pos_id: int,
    data: PositionUpdate,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    pos = db.query(Position).filter(
        Position.id == pos_id, Position.business_id == business.id
    ).first()
    if not pos:
        raise HTTPException(status_code=404, detail="직급을 찾을 수 없습니다.")
    for k, v in data.dict(exclude_none=True).items():
        setattr(pos, k, v)
    db.commit()
    db.refresh(pos)
    cnt = db.query(Employee).filter(
        Employee.position_id == pos.id, Employee.status == "재직"
    ).count()
    r = PositionResponse.from_orm(pos)
    r.employee_count = cnt
    return r


@router.delete("/positions/{pos_id}", status_code=204)
def delete_position(
    pos_id: int,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    pos = db.query(Position).filter(
        Position.id == pos_id, Position.business_id == business.id
    ).first()
    if not pos:
        raise HTTPException(status_code=404, detail="직급을 찾을 수 없습니다.")
    emp_count = db.query(Employee).filter(Employee.position_id == pos_id).count()
    if emp_count > 0:
        raise HTTPException(status_code=400, detail="소속 직원이 있는 직급은 삭제할 수 없습니다.")
    db.delete(pos)
    db.commit()


# ── Employees ─────────────────────────────────────────────
@router.get("/employees", response_model=List[EmployeeResponse])
def list_employees(
    status: str = "재직",
    dept_id: int = None,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    q = db.query(Employee).filter(Employee.business_id == business.id)
    if status and status != "전체":
        q = q.filter(Employee.status == status)
    if dept_id:
        q = q.filter(Employee.department_id == dept_id)
    employees = q.order_by(Employee.hire_date.desc()).all()
    result = []
    for e in employees:
        r = EmployeeResponse.from_orm(e)
        r.department_name = e.department.name if e.department else None
        r.position_name   = e.position.name   if e.position   else None
        result.append(r)
    return result


@router.post("/employees", response_model=EmployeeResponse, status_code=201)
def create_employee(
    data: EmployeeCreate,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    emp = Employee(**data.dict(), business_id=business.id)
    db.add(emp)
    db.commit()
    db.refresh(emp)
    r = EmployeeResponse.from_orm(emp)
    r.department_name = emp.department.name if emp.department else None
    r.position_name   = emp.position.name   if emp.position   else None
    return r


@router.get("/employees/{emp_id}", response_model=EmployeeResponse)
def get_employee(
    emp_id: int,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    emp = db.query(Employee).filter(
        Employee.id == emp_id, Employee.business_id == business.id
    ).first()
    if not emp:
        raise HTTPException(status_code=404, detail="직원을 찾을 수 없습니다.")
    r = EmployeeResponse.from_orm(emp)
    r.department_name = emp.department.name if emp.department else None
    r.position_name   = emp.position.name   if emp.position   else None
    return r


@router.put("/employees/{emp_id}", response_model=EmployeeResponse)
def update_employee(
    emp_id: int,
    data: EmployeeUpdate,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    emp = db.query(Employee).filter(
        Employee.id == emp_id, Employee.business_id == business.id
    ).first()
    if not emp:
        raise HTTPException(status_code=404, detail="직원을 찾을 수 없습니다.")
    for k, v in data.dict(exclude_none=True).items():
        setattr(emp, k, v)
    db.commit()
    db.refresh(emp)
    r = EmployeeResponse.from_orm(emp)
    r.department_name = emp.department.name if emp.department else None
    r.position_name   = emp.position.name   if emp.position   else None
    return r


@router.delete("/employees/{emp_id}", status_code=204)
def delete_employee(
    emp_id: int,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    emp = db.query(Employee).filter(
        Employee.id == emp_id, Employee.business_id == business.id
    ).first()
    if not emp:
        raise HTTPException(status_code=404, detail="직원을 찾을 수 없습니다.")
    db.delete(emp)
    db.commit()


# ── Contracts ─────────────────────────────────────────────
@router.get("/contracts", response_model=List[ContractResponse])
def list_contracts(
    contract_type: str = None,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    q = db.query(Contract).filter(Contract.business_id == business.id)
    if contract_type:
        q = q.filter(Contract.contract_type == contract_type)
    contracts = q.order_by(Contract.created_at.desc()).all()
    result = []
    for c in contracts:
        r = ContractResponse.from_orm(c)
        r.employee_name = c.employee.name if c.employee else None
        result.append(r)
    return result


@router.post("/contracts", response_model=ContractResponse, status_code=201)
def create_contract(
    data: ContractCreate,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    contract = Contract(**data.dict(), business_id=business.id)
    db.add(contract)
    db.commit()
    db.refresh(contract)
    r = ContractResponse.from_orm(contract)
    r.employee_name = contract.employee.name if contract.employee else None
    return r


@router.put("/contracts/{contract_id}", response_model=ContractResponse)
def update_contract(
    contract_id: int,
    data: ContractUpdate,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    contract = db.query(Contract).filter(
        Contract.id == contract_id, Contract.business_id == business.id
    ).first()
    if not contract:
        raise HTTPException(status_code=404, detail="계약서를 찾을 수 없습니다.")
    for k, v in data.dict(exclude_none=True).items():
        setattr(contract, k, v)
    db.commit()
    db.refresh(contract)
    r = ContractResponse.from_orm(contract)
    r.employee_name = contract.employee.name if contract.employee else None
    return r


@router.delete("/contracts/{contract_id}", status_code=204)
def delete_contract(
    contract_id: int,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    contract = db.query(Contract).filter(
        Contract.id == contract_id, Contract.business_id == business.id
    ).first()
    if not contract:
        raise HTTPException(status_code=404, detail="계약서를 찾을 수 없습니다.")
    db.delete(contract)
    db.commit()


# ── Leaves ────────────────────────────────────────────────
@router.get("/leaves", response_model=List[LeaveResponse])
def list_leaves(
    status: str = None,
    employee_id: int = None,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    q = db.query(Leave).filter(Leave.business_id == business.id)
    if status:
        q = q.filter(Leave.status == status)
    if employee_id:
        q = q.filter(Leave.employee_id == employee_id)
    leaves = q.order_by(Leave.start_date.desc()).all()
    result = []
    for lv in leaves:
        r = LeaveResponse.from_orm(lv)
        r.employee_name = lv.employee.name if lv.employee else None
        result.append(r)
    return result


@router.post("/leaves", response_model=LeaveResponse, status_code=201)
def create_leave(
    data: LeaveCreate,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    emp = db.query(Employee).filter(
        Employee.id == data.employee_id, Employee.business_id == business.id
    ).first()
    if not emp:
        raise HTTPException(status_code=404, detail="직원을 찾을 수 없습니다.")
    leave = Leave(**data.dict(), business_id=business.id)
    db.add(leave)
    db.commit()
    db.refresh(leave)
    r = LeaveResponse.from_orm(leave)
    r.employee_name = leave.employee.name if leave.employee else None
    return r


@router.put("/leaves/{leave_id}", response_model=LeaveResponse)
def update_leave(
    leave_id: int,
    data: LeaveUpdate,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    leave = db.query(Leave).filter(
        Leave.id == leave_id, Leave.business_id == business.id
    ).first()
    if not leave:
        raise HTTPException(status_code=404, detail="휴가 신청을 찾을 수 없습니다.")
    for k, v in data.dict(exclude_none=True).items():
        setattr(leave, k, v)
    db.commit()
    db.refresh(leave)
    r = LeaveResponse.from_orm(leave)
    r.employee_name = leave.employee.name if leave.employee else None
    return r


@router.delete("/leaves/{leave_id}", status_code=204)
def delete_leave(
    leave_id: int,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    leave = db.query(Leave).filter(
        Leave.id == leave_id, Leave.business_id == business.id
    ).first()
    if not leave:
        raise HTTPException(status_code=404, detail="휴가 신청을 찾을 수 없습니다.")
    db.delete(leave)
    db.commit()


@router.get("/leaves/summary/{employee_id}")
def get_leave_summary(
    employee_id: int,
    year: int = None,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    from datetime import date as date_type
    y = year or date_type.today().year
    emp = db.query(Employee).filter(
        Employee.id == employee_id, Employee.business_id == business.id
    ).first()
    if not emp:
        raise HTTPException(status_code=404, detail="직원을 찾을 수 없습니다.")
    leaves = db.query(Leave).filter(
        Leave.employee_id == employee_id,
        Leave.status == "승인",
        func.year(Leave.start_date) == y,
    ).all()
    used = sum(float(lv.days) for lv in leaves if lv.leave_type in ["연차", "반차(오전)", "반차(오후)"])
    # 입사연도에 따른 연차 계산 (근속 1년 미만: 월 1개 최대 11개, 1년 이상: 15개)
    from datetime import date as dt
    today = dt.today()
    hire = emp.hire_date
    months_worked = (today.year - hire.year) * 12 + (today.month - hire.month)
    if months_worked < 12:
        total = min(months_worked, 11)
    else:
        years = months_worked // 12
        total = min(15 + (years - 1), 25)
    return {
        "employee_id": employee_id,
        "employee_name": emp.name,
        "year": y,
        "total_annual_leave": total,
        "used_annual_leave": used,
        "remaining_annual_leave": total - used,
    }
