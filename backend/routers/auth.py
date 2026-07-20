from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime, timedelta
import random, string
from core.database import get_db
from core.security import hash_password, verify_password, create_access_token, decode_access_token
from core.deps import get_current_user
from models.user import User
from models.business import Business
from models.email_verification import EmailVerification
from models.journal import Journal, JournalLine
from models.receipt import Receipt
from models.expense import Expense
from models.todo import Todo
from models.card_sale import CardSale
from models.bank_transaction import BankTransaction
from models.vendor import Vendor
from models.employee import Employee
from models.business_join_request import BusinessJoinRequest
from schemas.user import UserCreate, UserLogin, UserResponse, UserFullResponse, UserRoleUpdate, TokenResponse
from utils.email import send_verification_email

class UserProfileUpdate(BaseModel):
    name:            Optional[str] = None
    phone:           Optional[str] = None
    department_name: Optional[str] = None
    position_name:   Optional[str] = None
    employee_number: Optional[str] = None
    hire_date:       Optional[str] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class DeleteAccountRequest(BaseModel):
    password: str

class SendCodeRequest(BaseModel):
    email: str

class VerifyCodeRequest(BaseModel):
    email: str
    code: str

router = APIRouter(prefix="/api/auth", tags=["auth"])


# ── 이메일 인증 코드 발송 ─────────────────────────────────────────────────
@router.post("/email/send-code")
def send_code(req: SendCodeRequest, db: Session = Depends(get_db)):
    # 이미 가입된 이메일 거부
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="이미 가입된 이메일입니다.")

    # 기존 미인증 코드 만료 처리
    db.query(EmailVerification).filter(
        EmailVerification.email == req.email,
        EmailVerification.verified_at.is_(None),
    ).update({"expires_at": datetime.utcnow()})
    db.commit()

    code = "".join(random.choices(string.digits, k=6))
    ev = EmailVerification(
        email=req.email,
        code=code,
        expires_at=datetime.utcnow() + timedelta(minutes=10),
    )
    db.add(ev)
    db.commit()

    try:
        send_verification_email(req.email, code)
    except Exception:
        raise HTTPException(status_code=500, detail="이메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.")

    return {"message": "인증 코드가 발송되었습니다."}


# ── 이메일 인증 코드 확인 ─────────────────────────────────────────────────
@router.post("/email/verify")
def verify_code(req: VerifyCodeRequest, db: Session = Depends(get_db)):
    ev = (
        db.query(EmailVerification)
        .filter(
            EmailVerification.email == req.email,
            EmailVerification.verified_at.is_(None),
        )
        .order_by(EmailVerification.created_at.desc())
        .first()
    )
    if not ev:
        raise HTTPException(status_code=400, detail="인증 코드를 먼저 발송해주세요.")
    if ev.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="인증 코드가 만료되었습니다. 다시 발송해주세요.")
    if ev.code != req.code:
        raise HTTPException(status_code=400, detail="인증 코드가 올바르지 않습니다.")

    ev.verified_at = datetime.utcnow()
    db.commit()
    return {"message": "이메일 인증이 완료되었습니다."}

# 회원가입
@router.post("/register", response_model=UserResponse)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="이미 존재하는 이메일입니다.")

    # 개인 회원(employee/admin이 아닌 기본 employee)은 이메일 인증 필수
    if user_data.role == "employee":
        ev = (
            db.query(EmailVerification)
            .filter(
                EmailVerification.email == user_data.email,
                EmailVerification.verified_at.isnot(None),
                EmailVerification.verified_at >= datetime.utcnow() - timedelta(minutes=30),
            )
            .first()
        )
        if not ev:
            raise HTTPException(status_code=403, detail="이메일 인증을 먼저 완료해주세요.")

    user = User(
        email=user_data.email,
        password=hash_password(user_data.password),
        name=user_data.name,
        role=user_data.role,
        phone=user_data.phone,
        department_name=user_data.department_name,
        position_name=user_data.position_name,
        employee_number=user_data.employee_number,
        hire_date=user_data.hire_date,
        is_active=0,  # 승인 대기 (관리자 승인 후 활성화)
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # 사업장 가입 요청 생성 (business_number가 제공된 경우)
    if user_data.business_number:
        raw = user_data.business_number.replace("-", "")
        fmt = f"{raw[:3]}-{raw[3:5]}-{raw[5:]}" if len(raw) == 10 else raw
        biz = db.query(Business).filter(
            (Business.business_number == raw) | (Business.business_number == fmt)
        ).first()
        if biz:
            join_req = BusinessJoinRequest(user_id=user.id, business_id=biz.id)
            db.add(join_req)
            db.commit()

    return user

# 로그인
@router.post("/login", response_model=TokenResponse)
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_data.email).first()
    if not user or not verify_password(user_data.password, user.password):
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 올바르지 않습니다.")
    if user.is_active == 0:
        raise HTTPException(status_code=403, detail="계정 승인 대기 중입니다. 관리자의 승인을 기다려주세요.")

    token = create_access_token(data={"sub": str(user.id), "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

# 현재 로그인 사용자의 소속 부서명 반환 (로그인 후 대시보드 라우팅 용)
@router.get("/my-department")
def get_my_department(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if emp and emp.department:
        return {"department_name": emp.department.name, "role": current_user.role}
    return {"department_name": None, "role": current_user.role}


# 내 정보 조회
@router.get("/me", response_model=UserFullResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# 내 정보 수정
@router.patch("/me", response_model=UserFullResponse)
def update_me(
    data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if data.name is not None:
        name = data.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="이름을 입력해주세요.")
        current_user.name = name
    if data.phone is not None:
        current_user.phone = data.phone or None
    if data.department_name is not None:
        current_user.department_name = data.department_name or None
    if data.position_name is not None:
        current_user.position_name = data.position_name or None
    if data.employee_number is not None:
        current_user.employee_number = data.employee_number or None
    if data.hire_date is not None:
        current_user.hire_date = data.hire_date or None
    db.commit()
    db.refresh(current_user)
    return current_user

# 비밀번호 변경
@router.patch("/password")
def change_password(
    data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(data.current_password, current_user.password):
        raise HTTPException(status_code=400, detail="현재 비밀번호가 일치하지 않습니다.")
    if len(data.new_password) < 8:
        raise HTTPException(status_code=400, detail="새 비밀번호는 8자 이상이어야 합니다.")
    current_user.password = hash_password(data.new_password)
    db.commit()
    return {"message": "비밀번호가 변경되었습니다."}


# 사업자 로그인
@router.post("/login/business", response_model=TokenResponse)
def login_business(data: UserLogin, db: Session = Depends(get_db)):
    # 사업자번호로 사업장 조회
    business = db.query(Business).filter(
        Business.business_number == data.email  # email 필드에 사업자번호 입력
    ).first()
    if not business:
        raise HTTPException(status_code=401, detail="사업자번호를 확인해주세요.")

    # 사업장 소유자 계정으로 로그인
    user = db.query(User).filter(User.id == business.user_id).first()
    if not user or not verify_password(data.password, user.password):
        raise HTTPException(status_code=401, detail="사업자번호 또는 비밀번호가 올바르지 않습니다.")

    token = create_access_token(data={"sub": str(user.id), "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }


# 회원 탈퇴
@router.delete("/me")
def delete_account(
    data: DeleteAccountRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(data.password, current_user.password):
        raise HTTPException(status_code=400, detail="비밀번호가 일치하지 않습니다.")

    user_id    = current_user.id
    user_email = current_user.email

    # 사용자 소유 사업장 ID 목록
    biz_ids = [b.id for b in db.query(Business).filter(Business.user_id == user_id).all()]

    if biz_ids:
        db.query(Todo).filter(Todo.business_id.in_(biz_ids)).delete(synchronize_session=False)
        db.query(CardSale).filter(CardSale.business_id.in_(biz_ids)).delete(synchronize_session=False)
        db.query(BankTransaction).filter(BankTransaction.business_id.in_(biz_ids)).delete(synchronize_session=False)
        db.query(Vendor).filter(Vendor.business_id.in_(biz_ids)).delete(synchronize_session=False)
        db.query(Business).filter(Business.id.in_(biz_ids)).delete(synchronize_session=False)

    # 회계 장부 삭제 (JournalLine 먼저)
    journal_ids = [j.id for j in db.query(Journal).filter(Journal.created_by == user_id).all()]
    if journal_ids:
        db.query(JournalLine).filter(JournalLine.journal_id.in_(journal_ids)).delete(synchronize_session=False)
        db.query(Journal).filter(Journal.id.in_(journal_ids)).delete(synchronize_session=False)

    # 영수증 / 경비 삭제
    db.query(Expense).filter(Expense.requested_by == user_id).delete(synchronize_session=False)
    db.query(Receipt).filter(Receipt.uploaded_by == user_id).delete(synchronize_session=False)

    # 이메일 인증 기록 삭제
    db.query(EmailVerification).filter(EmailVerification.email == user_email).delete(synchronize_session=False)

    # 사용자 삭제
    db.delete(current_user)
    db.commit()

    return {"message": "계정이 삭제되었습니다."}


def _my_org_user_ids(current_user: User, db: Session) -> set:
    """current_user가 소유한 사업장에 소속된(Employee) 사용자 id 집합."""
    biz_ids = [b.id for b in db.query(Business).filter(Business.user_id == current_user.id).all()]
    if not biz_ids:
        return set()
    emps = db.query(Employee).filter(Employee.business_id.in_(biz_ids)).all()
    ids = {e.user_id for e in emps if e.user_id}
    emails = {e.email for e in emps if e.email and not e.user_id}
    if emails:
        ids |= {u.id for u in db.query(User).filter(User.email.in_(emails)).all()}
    return ids


# 사용자 목록 조회 (관리자 전용) - 자신의 사업장에 소속된 활성 계정만
@router.get("/users", response_model=List[UserFullResponse])
def list_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="관리자만 접근 가능합니다.")
    ids = _my_org_user_ids(current_user, db)
    if not ids:
        return []
    return db.query(User).filter(User.is_active != 0, User.id.in_(ids)).order_by(User.created_at).all()


# 사용자 권한 변경 (관리자 전용)
@router.patch("/users/{user_id}/role")
def change_user_role(
    user_id: int,
    data: UserRoleUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="관리자만 접근 가능합니다.")
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="자신의 권한은 변경할 수 없습니다.")
    if data.role not in ("admin", "accountant", "employee"):
        raise HTTPException(status_code=400, detail="유효하지 않은 권한입니다.")
    if user_id not in _my_org_user_ids(current_user, db):
        raise HTTPException(status_code=403, detail="자신의 사업장에 소속된 사용자만 관리할 수 있습니다.")
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    target.role = data.role
    db.commit()
    return {"message": "권한이 변경되었습니다.", "user_id": target.id, "role": target.role}


# 승인 대기 중인 사용자 목록 (관리자 전용)
@router.get("/users/pending", response_model=List[UserFullResponse])
def list_pending_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="관리자만 접근 가능합니다.")
    return db.query(User).filter(User.is_active == 0).order_by(User.created_at).all()


# 사용자 계정 승인 (관리자 전용)
@router.patch("/users/{user_id}/approve")
def approve_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="관리자만 접근 가능합니다.")
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    target.is_active = 1
    db.commit()
    return {"message": "계정이 승인되었습니다.", "user_id": target.id}


# 사용자 계정 삭제/거절 (관리자 전용)
@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="관리자만 접근 가능합니다.")
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="자신의 계정은 삭제할 수 없습니다.")
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    db.delete(target)
    db.commit()
    return {"message": "계정이 삭제되었습니다."}