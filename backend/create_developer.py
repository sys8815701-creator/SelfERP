"""
플랫폼 관리자(개발자) 계정 1회 생성 스크립트.
기존 사업장/계정 데이터를 건드리지 않는 순수 추가(INSERT) 전용 — seed.py의
clear_data()와 달리 아무것도 삭제하지 않는다. 이미 존재하면 그대로 둔다.

실행: venv\\Scripts\\python.exe create_developer.py
"""
from core.database import SessionLocal, engine, Base
from core.security import hash_password
from models.user import User
import models  # noqa: F401  (모든 모델 등록을 위해 필요)

DEVELOPER_EMAIL = "dev@selferp.io"
DEVELOPER_PASSWORD = "developer123"
DEVELOPER_NAME = "플랫폼 운영자"


def main():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == DEVELOPER_EMAIL).first()
        if existing:
            if not existing.is_platform_admin:
                existing.is_platform_admin = True
                existing.is_active = 1
                db.commit()
                print(f"기존 계정을 플랫폼 관리자로 승격했습니다: {DEVELOPER_EMAIL}")
            else:
                print(f"이미 존재하는 플랫폼 관리자 계정입니다: {DEVELOPER_EMAIL}")
            return
        dev = User(
            email=DEVELOPER_EMAIL,
            password=hash_password(DEVELOPER_PASSWORD),
            name=DEVELOPER_NAME,
            role="admin",
            is_active=1,
            is_platform_admin=True,
        )
        db.add(dev)
        db.commit()
        print(f"플랫폼 관리자 계정을 생성했습니다: {DEVELOPER_EMAIL} / {DEVELOPER_PASSWORD}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
