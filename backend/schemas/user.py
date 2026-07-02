from pydantic import BaseModel, EmailStr
from typing import Optional

# 회원가입 요청
class UserCreate(BaseModel):
    email: str
    password: str
    name: Optional[str] = None
    role: Optional[str] = "employee"

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

    class Config:
        from_attributes = True

# 토큰 응답
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse