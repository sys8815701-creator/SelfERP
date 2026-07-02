from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
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
from schemas.user import UserCreate, UserLogin, UserResponse, TokenResponse
from utils.email import send_verification_email

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None

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
        role=user_data.role
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

# 로그인
@router.post("/login", response_model=TokenResponse)
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_data.email).first()
    if not user or not verify_password(user_data.password, user.password):
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 올바르지 않습니다.")

    token = create_access_token(data={"sub": str(user.id), "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

# 내 정보 조회
@router.get("/me", response_model=UserResponse)
def get_me(token: str, db: Session = Depends(get_db)):
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")

    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    return user

# 내 이름 수정
@router.patch("/me", response_model=UserResponse)
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