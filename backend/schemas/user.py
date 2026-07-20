from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# 회원가입 요청
class UserCreate(BaseModel):
    email:           str
    password:        str
    name:            Optional[str] = None
    role:            Optional[str] = "employee"
    phone:           Optional[str] = None
    department_name: Optional[str] = None
    position_name:   Optional[str] = None
    employee_number: Optional[str] = None
    hire_date:       Optional[str] = None
    business_number: Optional[str] = None  # 가입 시 소속 사업장 지정 (선택)

# 로그인 요청
class UserLogin(BaseModel):
    email: str
    password: str

# 응답 (비밀번호 제외)
class UserResponse(BaseModel):
    id: int
    email: str
    name: Optional[str]
    role: str
    is_platform_admin: Optional[bool] = False

    class Config:
        from_attributes = True

# 전체 프로필 응답
class UserFullResponse(UserResponse):
    phone:           Optional[str] = None
    department_name: Optional[str] = None
    position_name:   Optional[str] = None
    employee_number: Optional[str] = None
    hire_date:       Optional[str] = None
    is_active:       Optional[int] = 1
    created_at:      Optional[datetime] = None

# 권한 변경 요청
class UserRoleUpdate(BaseModel):
    role: str

# 토큰 응답
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse