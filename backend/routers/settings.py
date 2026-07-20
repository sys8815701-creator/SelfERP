import json
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from core.database import get_db
from core.deps import get_current_user, get_current_business
from models.user import User
from models.business import Business
from models.system_setting import SystemSetting

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("/role-access")
def get_role_access(
    current_user: User = Depends(get_current_user),
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    key = f"role-access:{business.id}"
    setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if setting and setting.value:
        return json.loads(setting.value)
    return None


@router.put("/role-access")
async def save_role_access(
    request: Request,
    current_user: User = Depends(get_current_user),
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="관리자만 변경할 수 있습니다.")
    data = await request.json()
    key = f"role-access:{business.id}"
    setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if setting:
        setting.value = json.dumps(data, ensure_ascii=False)
    else:
        setting = SystemSetting(key=key, value=json.dumps(data, ensure_ascii=False))
        db.add(setting)
    db.commit()
    return {"message": "저장되었습니다."}
