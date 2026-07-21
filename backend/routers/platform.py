from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from core.database import get_db
from core.deps import get_current_user
from models.user import User
from models.business import Business
from models.employee import Employee

router = APIRouter(prefix="/api/platform", tags=["platform"])


def require_platform_admin(current_user: User = Depends(get_current_user)) -> User:
    """사업장 소속과 무관한 플랫폼 운영 작업 — is_platform_admin 계정만 접근 가능."""
    if not current_user.is_platform_admin:
        raise HTTPException(status_code=403, detail="플랫폼 관리자만 접근 가능합니다.")
    return current_user


# 전체 사업장 목록 (플랫폼 관리자 전용)
@router.get("/businesses")
def list_businesses(
    _: User = Depends(require_platform_admin),
    db: Session = Depends(get_db),
):
    businesses = db.query(Business).order_by(Business.created_at.desc()).all()
    result = []
    for b in businesses:
        owner = db.query(User).filter(User.id == b.user_id).first()
        member_count = db.query(Employee).filter(
            Employee.business_id == b.id, Employee.status == "재직"
        ).count()
        result.append({
            "id": b.id,
            "business_name": b.business_name,
            "business_number": b.business_number,
            "owner_name": b.owner_name,
            "owner_email": owner.email if owner else None,
            "created_at": b.created_at.isoformat() if b.created_at else None,
            "member_count": member_count,
            "is_pro": bool(b.is_pro),
        })
    return result


# PRO 플랜 토글 (고객지원용, 플랫폼 관리자 전용)
@router.patch("/businesses/{business_id}/pro")
def set_business_pro(
    business_id: int,
    data: dict,
    _: User = Depends(require_platform_admin),
    db: Session = Depends(get_db),
):
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="사업장을 찾을 수 없습니다.")
    business.is_pro = 1 if data.get("is_pro") else 0
    db.commit()
    return {"message": "변경되었습니다.", "id": business.id, "is_pro": bool(business.is_pro)}
