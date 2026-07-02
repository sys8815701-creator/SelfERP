from fastapi import Depends, HTTPException, Header
from typing import Optional
from sqlalchemy.orm import Session
from core.database import get_db
from core.security import decode_access_token
from models.user import User
from models.business import Business


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
    if x_business_id is not None:
        business = db.query(Business).filter(
            Business.id == x_business_id,
            Business.user_id == user.id,
        ).first()
        if business:
            return business
    business = db.query(Business).filter(Business.user_id == user.id).first()
    if not business:
        raise HTTPException(status_code=404, detail="등록된 사업장이 없습니다.")
    return business
