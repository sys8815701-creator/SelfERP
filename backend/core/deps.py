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
