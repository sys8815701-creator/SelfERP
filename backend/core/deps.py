from fastapi import Depends, HTTPException, Header
from typing import Optional
from sqlalchemy.orm import Session
from core.database import get_db
from core.security import decode_access_token
from models.user import User
from models.business import Business
from models.employee import Employee
from models.business_join_request import BusinessJoinRequest


def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="인증이 필요합니다.")
    token = authorization.split(" ", 1)[1]
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    return user


def get_current_business(
    x_business_id: Optional[int] = Header(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Business:
    # 1. 소유자로서 접근 (관리자/담당자)
    if x_business_id is not None:
        business = db.query(Business).filter(
            Business.id == x_business_id,
            Business.user_id == user.id,
        ).first()
        if business:
            return business

        # 2. 직원 계정으로 해당 사업장 접근 (user_id 또는 이메일 매칭)
        emp = (
            db.query(Employee)
            .filter(Employee.business_id == x_business_id)
            .filter(Employee.status == "재직")
            .filter(
                (Employee.user_id == user.id) |
                (Employee.email == user.email)
            )
            .first()
        )
        if emp:
            business = db.query(Business).filter(Business.id == x_business_id).first()
            if business:
                return business

        # 2b. 승인된 가입 요청으로 접근 (Employee 레코드 없는 경우 fallback)
        join_req = (
            db.query(BusinessJoinRequest)
            .filter(
                BusinessJoinRequest.user_id == user.id,
                BusinessJoinRequest.business_id == x_business_id,
                BusinessJoinRequest.status == "approved",
            )
            .first()
        )
        if join_req:
            business = db.query(Business).filter(Business.id == x_business_id).first()
            if business:
                return business

    # 3. x_business_id 없을 때 소유 사업장 조회
    business = db.query(Business).filter(Business.user_id == user.id).first()
    if business:
        return business

    # 4. x_business_id 없을 때 소속 직원 사업장 조회 (user_id 또는 이메일)
    emp = (
        db.query(Employee)
        .filter(Employee.status == "재직")
        .filter(
            (Employee.user_id == user.id) |
            (Employee.email == user.email)
        )
        .first()
    )
    if emp:
        business = db.query(Business).filter(Business.id == emp.business_id).first()
        if business:
            return business

    # 5. 승인된 가입 요청으로 사업장 조회 (fallback)
    join_req = (
        db.query(BusinessJoinRequest)
        .filter(
            BusinessJoinRequest.user_id == user.id,
            BusinessJoinRequest.status == "approved",
        )
        .first()
    )
    if join_req:
        business = db.query(Business).filter(Business.id == join_req.business_id).first()
        if business:
            return business

    raise HTTPException(status_code=404, detail="등록된 사업장이 없습니다.")


def get_role_for_business(business: Business, user: User, db: Session) -> str:
    """특정 business 맥락에서 user의 역할을 구하는 순수 함수 버전 — path parameter로
    business_id를 받는 라우터(예: business.py)처럼 X-Business-Id 헤더가 아니라
    이미 조회된 Business 객체를 기준으로 역할을 판정해야 할 때 직접 호출한다."""
    if business.user_id == user.id:
        return "admin"
    emp = (
        db.query(Employee)
        .filter(Employee.business_id == business.id)
        .filter(Employee.status == "재직")
        .filter((Employee.user_id == user.id) | (Employee.email == user.email))
        .first()
    )
    if emp and emp.role:
        return emp.role
    return "employee"


def get_current_role(
    business: Business = Depends(get_current_business),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> str:
    """현재 X-Business-Id 사업장 맥락에서 user의 역할. User.role(전역)이 아니라
    사업장별 소속(Employee.role)에서 구한다 — 한 계정이 사업장마다 다른 역할을
    가질 수 있어야 하므로, 소유자가 아니면 반드시 이 사업장의 Employee.role을 본다."""
    return get_role_for_business(business, user, db)
