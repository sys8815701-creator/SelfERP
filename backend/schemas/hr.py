from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime


# ── Department ──────────────────────────────────────────
class DepartmentCreate(BaseModel):
    name: str
    code: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[int] = None


class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[int] = None


class DepartmentResponse(BaseModel):
    id: int
    business_id: int
    name: str
    code: Optional[str]
    description: Optional[str]
    parent_id: Optional[int]
    employee_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


# ── Position ─────────────────────────────────────────────
class PositionCreate(BaseModel):
    name: str
    level: int = 1
    description: Optional[str] = None


class PositionUpdate(BaseModel):
    name: Optional[str] = None
    level: Optional[int] = None
    description: Optional[str] = None


class PositionResponse(BaseModel):
    id: int
    business_id: int
    name: str
    level: int
    description: Optional[str]
    employee_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


# ── Employee ──────────────────────────────────────────────
class EmployeeCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    birth_date: Optional[date] = None
    gender: Optional[str] = None
    hire_date: date
    employment_type: str = "정규직"
    department_id: Optional[int] = None
    position_id: Optional[int] = None
    base_salary: float = 0
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    bank_holder: Optional[str] = None
    address: Optional[str] = None
    emergency_name: Optional[str] = None
    emergency_phone: Optional[str] = None
    note: Optional[str] = None


class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    birth_date: Optional[date] = None
    gender: Optional[str] = None
    hire_date: Optional[date] = None
    resign_date: Optional[date] = None
    employment_type: Optional[str] = None
    status: Optional[str] = None
    department_id: Optional[int] = None
    position_id: Optional[int] = None
    base_salary: Optional[float] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    bank_holder: Optional[str] = None
    address: Optional[str] = None
    emergency_name: Optional[str] = None
    emergency_phone: Optional[str] = None
    note: Optional[str] = None


class EmployeeResponse(BaseModel):
    id: int
    business_id: int
    department_id: Optional[int]
    position_id: Optional[int]
    name: str
    email: Optional[str]
    phone: Optional[str]
    birth_date: Optional[date]
    gender: Optional[str]
    hire_date: date
    resign_date: Optional[date]
    employment_type: str
    status: str
    base_salary: float
    department_name: Optional[str] = None
    position_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
