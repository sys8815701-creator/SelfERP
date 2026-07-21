"""
세 번째 사업장("든든공구상회") 생성 스크립트 — RBAC 검증 전용.
더미데이터(부서·직급·회계·생산·유통 등)는 넣지 않고, 사업장과 admin·accountant·employee
3개 로그인 계정만 생성한다. 기존 사업장(행복한 베이커리·정성반찬)은 전혀 건드리지 않는다.

실행: venv\\Scripts\\python.exe seed_business3_rbac_test.py  (backend/ 디렉터리에서)
"""
import sys
import os

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from datetime import date
from core.database import engine, Base, SessionLocal
from core.security import hash_password
from models.user import User
from models.business import Business
from models.employee import Employee
import models  # noqa: F401

BUSINESS_NUMBER = "310-22-77777"
OWNER_EMAIL = "doyoon@dundun.kr"
MANAGER_EMAIL = "minseo@dundun.kr"
EMPLOYEE_EMAIL = "haram@dundun.kr"


def seed_business3(db):
    existing = db.query(Business).filter(Business.business_number == BUSINESS_NUMBER).first()
    if existing:
        print(f"이미 존재하는 사업장입니다 (id={existing.id}) — 중복 생성을 건너뜁니다.")
        return

    # ── 사용자 3계정 ──────────────────────────────────────────
    owner = User(email=OWNER_EMAIL, password=hash_password("password123"), name="최도윤", role="admin")
    manager = User(email=MANAGER_EMAIL, password=hash_password("password123"), name="강민서", role="accountant")
    staff = User(email=EMPLOYEE_EMAIL, password=hash_password("password123"), name="오하람", role="employee")
    db.add_all([owner, manager, staff])
    db.flush()

    # ── 사업장 ────────────────────────────────────────────────
    biz = Business(
        user_id=owner.id, business_name="든든공구상회", business_number=BUSINESS_NUMBER,
        owner_name="최도윤", industry="도소매업", business_type="개인사업자",
        open_date=date(2023, 2, 1),
    )
    db.add(biz)
    db.flush()
    bid = biz.id

    # ── 직원(로그인 계정 3개, 부서/직급/더미데이터 없음) ──────
    employees_data = [
        ("최도윤", OWNER_EMAIL,   "010-3000-0001", date(2023, 2, 1), 0, "admin"),
        ("강민서", MANAGER_EMAIL, "010-3000-0002", date(2023, 3, 1), 0, "accountant"),
        ("오하람", EMPLOYEE_EMAIL,"010-3000-0003", date(2023, 6, 1), 0, "employee"),
    ]
    user_links = {"최도윤": owner.id, "강민서": manager.id, "오하람": staff.id}
    for name, email, phone, hire, salary, role in employees_data:
        e = Employee(
            business_id=bid, user_id=user_links.get(name), role=role,
            name=name, email=email, phone=phone, hire_date=hire,
            employment_type="정규직", status="재직", base_salary=salary,
        )
        db.add(e)
    db.commit()

    print(f"[OK] 사업장 생성 완료 (id={bid}) — 든든공구상회")
    print("로그인 정보:")
    print(f"  [관리자] {OWNER_EMAIL}   / password123  (role=admin)")
    print(f"  [매니저] {MANAGER_EMAIL} / password123  (role=accountant)")
    print(f"  [일반]   {EMPLOYEE_EMAIL} / password123  (role=employee)")


if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_business3(db)
    finally:
        db.close()
