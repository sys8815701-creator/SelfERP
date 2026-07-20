from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from core.database import get_db
from core.deps import get_current_user
from core.security import hash_password, create_access_token
from models.pending_registration import PendingRegistration
from models.user import User
from models.business import Business

router = APIRouter(prefix="/api/pending-registration", tags=["pending-registration"])


class PendingRegisterRequest(BaseModel):
    business_name:   str
    business_number: str
    owner_name:      str
    industry:        Optional[str] = None
    business_type:   Optional[str] = None
    open_date:       Optional[str] = None
    address:         Optional[str] = None
    email:           str
    password:        str


class PendingRegisterResponse(BaseModel):
    id:              int
    status:          str
    business_name:   str
    business_number: str
    owner_name:      str
    email:           str
    reject_reason:   Optional[str]
    created_at:      datetime

    class Config:
        from_attributes = True


class ReviewRequest(BaseModel):
    action:        str   # "approve" | "reject"
    reject_reason: Optional[str] = None


def validate_business_number(bn: str) -> bool:
    bn = bn.replace("-", "").replace(" ", "")
    if len(bn) != 10 or not bn.isdigit():
        return False
    weights = [1, 3, 7, 1, 3, 7, 1, 3, 5]
    total = sum(int(bn[i]) * weights[i] for i in range(9))
    total += (int(bn[8]) * 5) // 10
    return (total + int(bn[9])) % 10 == 0


@router.post("/verify-number")
def verify_business_number(data: dict, db: Session = Depends(get_db)):
    bn = data.get("business_number", "")
    is_valid = validate_business_number(bn)
    return {"valid": is_valid, "business_number": bn.replace("-", "")}


@router.post("/submit", response_model=PendingRegisterResponse, status_code=201)
def submit_registration(data: PendingRegisterRequest, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="이미 가입된 이메일입니다.")
    existing_pending = db.query(PendingRegistration).filter(PendingRegistration.email == data.email).first()
    if existing_pending:
        if existing_pending.status == "pending":
            raise HTTPException(status_code=400, detail="이미 승인 대기 중인 신청이 있습니다.")
        if existing_pending.status == "approved":
            raise HTTPException(status_code=400, detail="이미 승인된 계정입니다.")
        db.delete(existing_pending)
        db.commit()

    pending = PendingRegistration(
        business_name=data.business_name,
        business_number=data.business_number.replace("-", ""),
        owner_name=data.owner_name,
        industry=data.industry,
        business_type=data.business_type,
        open_date=data.open_date or None,
        address=data.address,
        email=data.email,
        password_hash=hash_password(data.password),
    )
    db.add(pending)
    db.commit()
    db.refresh(pending)
    return pending


@router.get("/status")
def check_status(email: str, db: Session = Depends(get_db)):
    pending = db.query(PendingRegistration).filter(PendingRegistration.email == email).first()
    if not pending:
        return {"status": "not_found"}
    return {
        "status": pending.status,
        "reject_reason": pending.reject_reason,
        "business_name": pending.business_name,
    }


# 신규 사업장 승인은 특정 사업장에 속한 일이 아니라 플랫폼에 새 테넌트를
# 등록하는 일이므로, 사업장 admin이 아니라 플랫폼 관리자만 접근 가능
@router.get("/list", response_model=List[PendingRegisterResponse])
def list_pending(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.is_platform_admin:
        raise HTTPException(status_code=403, detail="플랫폼 관리자만 접근 가능합니다.")
    return db.query(PendingRegistration).order_by(PendingRegistration.created_at.desc()).all()


@router.post("/{pending_id}/review")
def review_registration(
    pending_id: int,
    data: ReviewRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.is_platform_admin:
        raise HTTPException(status_code=403, detail="플랫폼 관리자만 접근 가능합니다.")
    pending = db.query(PendingRegistration).filter(PendingRegistration.id == pending_id).first()
    if not pending:
        raise HTTPException(status_code=404, detail="신청 내역을 찾을 수 없습니다.")
    if pending.status != "pending":
        raise HTTPException(status_code=400, detail="이미 처리된 신청입니다.")

    if data.action == "approve":
        existing = db.query(User).filter(User.email == pending.email).first()
        if existing:
            raise HTTPException(
                status_code=400,
                detail="이미 해당 이메일로 가입된 계정이 있어 승인할 수 없습니다. 신청을 거절해 주세요.",
            )
        user = User(
            email=pending.email,
            password=pending.password_hash,
            name=pending.owner_name,
            role="admin",
        )
        db.add(user)
        db.flush()
        biz = Business(
            user_id=user.id,
            business_name=pending.business_name,
            business_number=pending.business_number,
            owner_name=pending.owner_name,
            industry=pending.industry,
            business_type=pending.business_type,
            open_date=pending.open_date,
        )
        db.add(biz)
        pending.status = "approved"
        pending.reviewed_at = datetime.utcnow()
        db.commit()
        return {"message": "승인되었습니다. 사용자 계정과 사업장이 생성되었습니다."}
    elif data.action == "reject":
        pending.status = "rejected"
        pending.reject_reason = data.reject_reason or "승인이 거절되었습니다."
        pending.reviewed_at = datetime.utcnow()
        db.commit()
        return {"message": "거절 처리되었습니다."}
    else:
        raise HTTPException(status_code=400, detail="action은 approve 또는 reject이어야 합니다.")
