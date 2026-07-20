from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from core.database import get_db
from core.deps import get_current_user, get_current_business, get_role_for_business
from models.user import User
from models.business import Business
from models.employee import Employee
from models.vendor import Vendor
from models.business_join_request import BusinessJoinRequest
from schemas.business import BusinessCreate, BusinessResponse
from schemas.vendor import VendorCreate, VendorResponse
from typing import List, Optional
from pydantic import BaseModel
from datetime import date as DateType, datetime

class BusinessUpdate(BaseModel):
    business_name:   Optional[str] = None
    business_number: Optional[str] = None
    owner_name:      Optional[str] = None
    industry:        Optional[str] = None
    business_type:   Optional[str] = None
    open_date:       Optional[DateType] = None

class BankInfoUpdate(BaseModel):
    bank_name:      str
    account_number: str
    bank_holder:    str

router = APIRouter(prefix="/api/business", tags=["business"])


def _authorize_business_access(business_id: int, current_user: User, db: Session) -> Business:
    """current_user가 소유자이거나, 소속 직원이거나, 승인된 가입 요청이 있는 사업장인지 확인."""
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="사업장을 찾을 수 없습니다.")
    if business.user_id == current_user.id:
        return business
    emp = (
        db.query(Employee)
        .filter(Employee.business_id == business_id)
        .filter(Employee.status == "재직")
        .filter((Employee.user_id == current_user.id) | (Employee.email == current_user.email))
        .first()
    )
    if emp:
        return business
    join_req = (
        db.query(BusinessJoinRequest)
        .filter(
            BusinessJoinRequest.user_id == current_user.id,
            BusinessJoinRequest.business_id == business_id,
            BusinessJoinRequest.status == "approved",
        )
        .first()
    )
    if join_req:
        return business
    raise HTTPException(status_code=403, detail="이 사업장에 접근할 권한이 없습니다.")


class JoinRequestBody(BaseModel):
    business_number: str


class JoinRejectBody(BaseModel):
    reject_reason: Optional[str] = None


# ── 사업장 가입 요청 생성 (직원이 사업장에 가입 요청) ──────────────────────
@router.post("/join-request")
def create_join_request(
    data: JoinRequestBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    raw = data.business_number.replace("-", "")
    fmt = f"{raw[:3]}-{raw[3:5]}-{raw[5:]}" if len(raw) == 10 else raw
    business = db.query(Business).filter(
        (Business.business_number == raw) | (Business.business_number == fmt)
    ).first()
    if not business:
        raise HTTPException(status_code=404, detail="해당 사업자번호의 사업장을 찾을 수 없습니다.")

    # 이미 소속된 경우 방지
    already = (
        db.query(Employee)
        .filter(Employee.business_id == business.id)
        .filter((Employee.user_id == current_user.id) | (Employee.email == current_user.email))
        .first()
    )
    if already:
        raise HTTPException(status_code=400, detail="이미 해당 사업장에 소속되어 있습니다.")

    # 중복 요청 방지
    existing = (
        db.query(BusinessJoinRequest)
        .filter(BusinessJoinRequest.user_id == current_user.id)
        .filter(BusinessJoinRequest.business_id == business.id)
        .filter(BusinessJoinRequest.status == "pending")
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="이미 가입 요청 중입니다.")

    req = BusinessJoinRequest(user_id=current_user.id, business_id=business.id)
    db.add(req)
    db.commit()
    db.refresh(req)
    return {"message": "가입 요청이 접수되었습니다.", "business_name": business.business_name, "request_id": req.id}


# ── 사업장 가입 요청 목록 조회 (사업장 관리자) ────────────────────────────────
@router.get("/join-requests")
def get_join_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_ids = [b.id for b in db.query(Business).filter(Business.user_id == current_user.id).all()]
    if not biz_ids:
        return []
    requests = (
        db.query(BusinessJoinRequest)
        .filter(BusinessJoinRequest.business_id.in_(biz_ids))
        .filter(BusinessJoinRequest.status == "pending")
        .order_by(BusinessJoinRequest.created_at.desc())
        .all()
    )
    return [
        {
            "id":            r.id,
            "user_id":       r.user_id,
            "user_name":     r.user.name,
            "user_email":    r.user.email,
            "business_id":   r.business_id,
            "business_name": r.business.business_name,
            "status":        r.status,
            "created_at":    r.created_at.isoformat() if r.created_at else None,
        }
        for r in requests
    ]


# ── 가입 요청 승인 ──────────────────────────────────────────────────────────
@router.patch("/join-requests/{req_id}/approve")
def approve_join_request(
    req_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    req = db.query(BusinessJoinRequest).filter(BusinessJoinRequest.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="요청을 찾을 수 없습니다.")

    business = db.query(Business).filter(Business.id == req.business_id).first()
    if not business or get_role_for_business(business, current_user, db) != "admin":
        raise HTTPException(status_code=403, detail="이 사업장의 관리자만 승인할 수 있습니다.")

    # 유저 활성화 (가입 후 대기 중인 경우)
    user = db.query(User).filter(User.id == req.user_id).first()
    if user and user.is_active == 0:
        user.is_active = 1

    # 직원 레코드 연결 or 신규 생성
    if user:
        from datetime import date
        emp = (
            db.query(Employee)
            .filter(Employee.business_id == req.business_id)
            .filter(Employee.email == user.email)
            .first()
        )
        if emp:
            if not emp.user_id:
                emp.user_id = user.id
        else:
            # Employee 레코드가 없으면 최소 정보로 신규 생성 — role은 최소 권한(employee)으로
            # 시작하고, 이후 사업장 admin이 필요에 따라 승격시킨다
            new_emp = Employee(
                business_id=req.business_id,
                user_id=user.id,
                name=user.name,
                email=user.email,
                hire_date=date.today(),
                role="employee",
            )
            db.add(new_emp)

    req.status      = "approved"
    req.reviewed_at = datetime.utcnow()
    db.commit()
    return {"message": "승인되었습니다."}


# ── 가입 요청 거절 ──────────────────────────────────────────────────────────
@router.patch("/join-requests/{req_id}/reject")
def reject_join_request(
    req_id: int,
    data: JoinRejectBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    req = db.query(BusinessJoinRequest).filter(BusinessJoinRequest.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="요청을 찾을 수 없습니다.")

    business = db.query(Business).filter(Business.id == req.business_id).first()
    if not business or get_role_for_business(business, current_user, db) != "admin":
        raise HTTPException(status_code=403, detail="이 사업장의 관리자만 거절할 수 있습니다.")

    req.status        = "rejected"
    req.reject_reason = data.reject_reason or "거절되었습니다."
    req.reviewed_at   = datetime.utcnow()
    db.commit()
    return {"message": "거절되었습니다."}


# 사업장 등록
@router.post("/", response_model=BusinessResponse)
def create_business(
    data: BusinessCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    business = Business(user_id=current_user.id, **data.model_dump())
    db.add(business)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="이미 등록된 사업자번호입니다.")
    db.refresh(business)
    return business

# 사업장 목록 조회 (소유자 또는 소속 직원)
@router.get("/", response_model=List[BusinessResponse])
def get_businesses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    seen_ids: set = set()
    result: list = []

    # 1. 소유 사업장
    owned = db.query(Business).filter(Business.user_id == current_user.id).all()
    for b in owned:
        seen_ids.add(b.id)
        result.append(b)

    # 2. Employee 레코드로 연결된 사업장 (user_id 또는 이메일, 재직 중인 경우만)
    emps = (
        db.query(Employee)
        .filter(Employee.status == "재직")
        .filter(
            (Employee.user_id == current_user.id) |
            (Employee.email == current_user.email)
        )
        .all()
    )
    for emp in emps:
        if emp.business_id not in seen_ids:
            biz = db.query(Business).filter(Business.id == emp.business_id).first()
            if biz:
                seen_ids.add(biz.id)
                result.append(biz)

    # 3. 승인된 가입 요청으로 연결된 사업장 (Employee 레코드 생성 전 fallback)
    approved_reqs = (
        db.query(BusinessJoinRequest)
        .filter(
            BusinessJoinRequest.user_id == current_user.id,
            BusinessJoinRequest.status == "approved",
        )
        .all()
    )
    for req in approved_reqs:
        if req.business_id not in seen_ids:
            biz = db.query(Business).filter(Business.id == req.business_id).first()
            if biz:
                seen_ids.add(biz.id)
                result.append(biz)

    return result

# 사업장 단건 조회
@router.get("/{business_id}", response_model=BusinessResponse)
def get_business(
    business_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _authorize_business_access(business_id, current_user, db)

# 사업장 정보 수정
@router.patch("/{business_id}", response_model=BusinessResponse)
def update_business(
    business_id: int,
    data: BusinessUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    business = _authorize_business_access(business_id, current_user, db)
    if get_role_for_business(business, current_user, db) not in ("admin", "accountant"):
        raise HTTPException(status_code=403, detail="사업장 정보를 수정할 권한이 없습니다.")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(business, field, value)
    db.commit()
    db.refresh(business)
    return business

# 주 거래 은행 조회
@router.get("/{business_id}/bank")
def get_bank_info(
    business_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    business = _authorize_business_access(business_id, current_user, db)
    if not business.bank_name:
        return None
    return {
        "bank_name": business.bank_name,
        "account_number": business.account_number,
        "bank_holder": business.bank_holder,
    }

# 주 거래 은행 저장/수정
@router.put("/{business_id}/bank")
def update_bank_info(
    business_id: int,
    data: BankInfoUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    business = _authorize_business_access(business_id, current_user, db)
    if get_role_for_business(business, current_user, db) not in ("admin", "accountant"):
        raise HTTPException(status_code=403, detail="주 거래 은행 정보를 수정할 권한이 없습니다.")
    business.bank_name      = data.bank_name
    business.account_number = data.account_number
    business.bank_holder    = data.bank_holder
    db.commit()
    return {
        "bank_name": business.bank_name,
        "account_number": business.account_number,
        "bank_holder": business.bank_holder,
    }

# 거래처 등록
@router.post("/{business_id}/vendors", response_model=VendorResponse)
def create_vendor(
    business_id: int,
    data: VendorCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _authorize_business_access(business_id, current_user, db)
    vendor = Vendor(
        business_id=business_id,
        vendor_name=data.vendor_name,
        vendor_type=data.vendor_type,
        business_number=data.business_number,
        contact=data.contact
    )
    db.add(vendor)
    db.commit()
    db.refresh(vendor)
    return vendor

# 거래처 목록 조회
@router.get("/{business_id}/vendors", response_model=List[VendorResponse])
def get_vendors(
    business_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _authorize_business_access(business_id, current_user, db)
    try:
        return db.query(Vendor).filter(Vendor.business_id == business_id).all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 거래처 수정
@router.patch("/{business_id}/vendors/{vendor_id}", response_model=VendorResponse)
def update_vendor(
    business_id: int,
    vendor_id: int,
    data: VendorCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _authorize_business_access(business_id, current_user, db)
    vendor = db.query(Vendor).filter(
        Vendor.id == vendor_id,
        Vendor.business_id == business_id
    ).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="거래처를 찾을 수 없습니다.")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(vendor, field, value)
    db.commit()
    db.refresh(vendor)
    return vendor

# 거래처 삭제
@router.delete("/{business_id}/vendors/{vendor_id}")
def delete_vendor(
    business_id: int,
    vendor_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _authorize_business_access(business_id, current_user, db)
    vendor = db.query(Vendor).filter(
        Vendor.id == vendor_id,
        Vendor.business_id == business_id
    ).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="거래처를 찾을 수 없습니다.")
    db.delete(vendor)
    db.commit()
    return {"message": "거래처가 삭제되었습니다."}

# PRO 플랜 구독 (결제 완료 후 서버에 반영)
@router.patch("/{business_id}/subscribe", response_model=BusinessResponse)
def subscribe_pro(
    business_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    business = _authorize_business_access(business_id, current_user, db)
    if get_role_for_business(business, current_user, db) not in ("admin", "accountant"):
        raise HTTPException(status_code=403, detail="구독 정보를 변경할 권한이 없습니다.")
    business.is_pro = 1
    db.commit()
    db.refresh(business)
    return business

# PRO 플랜 해지
@router.patch("/{business_id}/unsubscribe", response_model=BusinessResponse)
def unsubscribe_pro(
    business_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    business = _authorize_business_access(business_id, current_user, db)
    if get_role_for_business(business, current_user, db) not in ("admin", "accountant"):
        raise HTTPException(status_code=403, detail="구독 정보를 변경할 권한이 없습니다.")
    business.is_pro = 0
    db.commit()
    db.refresh(business)
    return business

# 사업장 삭제
@router.delete("/{business_id}")
def delete_business(
    business_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    business = db.query(Business).filter(
        Business.id == business_id,
        Business.user_id == current_user.id,
    ).first()
    if not business:
        raise HTTPException(status_code=404, detail="사업장을 찾을 수 없습니다.")
    db.delete(business)
    db.commit()
    return {"message": "사업장이 삭제되었습니다."}