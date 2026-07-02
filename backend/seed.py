"""
SelfERP — MySQL 더미데이터 시더
실행: python seed.py  (backend/ 디렉터리에서)

초기화 후 다음 데이터를 생성합니다:
  - 사용자: 김상진 (kim@bookkeep.ai / password123)
  - 사업장: 행복한 베이커리
  - 2026년 1~6월 은행거래 내역 (월별 매출·비용 반영)
  - 최근 거래 6건 (dashboard 화면용)
  - 오늘의 할 일 4건
"""

import sys
import os

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from datetime import date
from sqlalchemy import text
from sqlalchemy.orm import Session
from core.database import engine, Base
from core.security import hash_password
from models.user import User
from models.business import Business
from models.bank_transaction import BankTransaction
from models.todo import Todo
import models  # 모든 모델 임포트 (테이블 생성용)


def clear_data(db: Session):
    db.execute(text("SET FOREIGN_KEY_CHECKS=0"))
    for tbl in ["todos", "bank_transactions", "card_sales", "receipts",
                "expenses", "journal_lines", "journals", "businesses",
                "users"]:
        db.execute(text(f"DELETE FROM `{tbl}`"))
    db.execute(text("SET FOREIGN_KEY_CHECKS=1"))
    db.commit()
    print("[OK] 기존 데이터 초기화 완료")


def seed(db: Session):
    # ── 사용자 ────────────────────────────────────────────────
    user = User(
        email="kim@bookkeep.ai",
        password=hash_password("password123"),
        name="김상진",
        role="admin",
    )
    db.add(user)
    db.flush()

    # ── 사업장 ────────────────────────────────────────────────
    biz = Business(
        user_id=user.id,
        business_name="행복한 베이커리",
        business_number="123-45-67890",
        owner_name="김상진",
        industry="식품업",
        business_type="개인사업자",
        open_date=date(2020, 3, 15),
    )
    db.add(biz)
    db.flush()
    bid = biz.id

    # ── 월별 거래 (2026년 1~5월 요약 + 6월 세부) ──────────────
    # format: (date, description, deposit, withdrawal, category)
    txns = [
        # === 1월 ===
        (date(2026, 1,  3), "신한은행 카드매출 정산",    4500000, 0,       "상품매출"),
        (date(2026, 1,  7), "국민카드 매출 정산",         1800000, 0,       "상품매출"),
        (date(2026, 1, 10), "나이스페이 정산",             1900000, 0,       "상품매출"),
        (date(2026, 1,  5), "CJ 밀가루 외 식재료",              0, 2100000, "상품매입"),
        (date(2026, 1, 10), "임차료 (강남구 역삼동)",           0, 1800000, "임차료"),
        (date(2026, 1, 15), "직원 급여",                        0, 800000,  "급여"),
        (date(2026, 1, 20), "전기·수도·가스",                   0, 250000,  "공과금"),
        (date(2026, 1, 25), "네이버 광고비",                    0, 150000,  "광고선전비"),
        # === 2월 ===
        (date(2026, 2,  3), "신한은행 카드매출 정산",    5000000, 0,       "상품매출"),
        (date(2026, 2,  8), "쿠팡 오픈마켓 정산",         2300000, 0,       "상품매출"),
        (date(2026, 2, 12), "네이버 스마트스토어 정산",    2200000, 0,       "상품매출"),
        (date(2026, 2,  5), "CJ 밀가루 외 식재료",              0, 2400000, "상품매입"),
        (date(2026, 2, 10), "임차료 (강남구 역삼동)",           0, 1800000, "임차료"),
        (date(2026, 2, 15), "직원 급여",                        0, 800000,  "급여"),
        (date(2026, 2, 20), "복리후생비 (간식·경조사)",         0, 320000,  "복리후생비"),
        (date(2026, 2, 25), "사무용품비",                       0, 480000,  "사무용품비"),
        # === 3월 ===
        (date(2026, 3,  3), "신한은행 카드매출 정산",    4100000, 0,       "상품매출"),
        (date(2026, 3,  8), "쿠팡 오픈마켓 정산",         1800000, 0,       "상품매출"),
        (date(2026, 3, 12), "네이버 스마트스토어 정산",    1900000, 0,       "상품매출"),
        (date(2026, 3,  5), "CJ 밀가루 외 식재료",              0, 1900000, "상품매입"),
        (date(2026, 3, 10), "임차료 (강남구 역삼동)",           0, 1800000, "임차료"),
        (date(2026, 3, 15), "직원 급여",                        0, 800000,  "급여"),
        (date(2026, 3, 20), "전기·수도·가스",                   0, 250000,  "공과금"),
        (date(2026, 3, 25), "네이버 광고비",                    0, 150000,  "광고선전비"),
        # === 4월 ===
        (date(2026, 4,  3), "신한은행 카드매출 정산",    5800000, 0,       "상품매출"),
        (date(2026, 4,  8), "쿠팡 오픈마켓 정산",         2700000, 0,       "상품매출"),
        (date(2026, 4, 12), "네이버 스마트스토어 정산",    2700000, 0,       "상품매출"),
        (date(2026, 4,  5), "CJ 밀가루 외 식재료",              0, 2500000, "상품매입"),
        (date(2026, 4, 10), "임차료 (강남구 역삼동)",           0, 1800000, "임차료"),
        (date(2026, 4, 15), "직원 급여",                        0, 900000,  "급여"),
        (date(2026, 4, 20), "광고선전비 (네이버+카카오)",       0, 580000,  "광고선전비"),
        (date(2026, 4, 25), "사무용품비",                       0, 420000,  "사무용품비"),
        # === 5월 ===
        (date(2026, 5,  3), "신한은행 카드매출 정산",    7000000, 0,       "상품매출"),
        (date(2026, 5,  8), "쿠팡 오픈마켓 정산",         3200000, 0,       "상품매출"),
        (date(2026, 5, 12), "네이버 스마트스토어 정산",    3200000, 0,       "상품매출"),
        (date(2026, 5,  5), "CJ 밀가루 외 식재료",              0, 2900000, "상품매입"),
        (date(2026, 5, 10), "임차료 (강남구 역삼동)",           0, 1800000, "임차료"),
        (date(2026, 5, 15), "직원 급여",                        0, 1000000, "급여"),
        (date(2026, 5, 20), "광고선전비 (네이버+카카오)",       0, 850000,  "광고선전비"),
        (date(2026, 5, 25), "복리후생비 (단체회식)",            0, 350000,  "복리후생비"),
        (date(2026, 5, 28), "사무용품비",                       0, 200000,  "사무용품비"),
        # === 6월 (세부 거래) ===
        (date(2026, 6,  1), "신한은행 카드매출 1차 정산", 4800000, 0,       "상품매출"),
        (date(2026, 6,  2), "쿠팡 오픈마켓 정산",          2100000, 0,       "상품매출"),
        (date(2026, 6,  3), "이마트 트레이더스",                 0, 284500,  "상품매입"),
        (date(2026, 6,  4), "CJ 밀가루 외 식재료",              0, 1650000, "상품매입"),
        (date(2026, 6,  5), "네이버 스마트스토어 정산",   1600000, 0,       "상품매출"),
        (date(2026, 6,  8), "임차료 (강남구 역삼동)",           0, 1800000, "임차료"),
        (date(2026, 6,  9), "직원 급여",                        0, 1000000, "급여"),
        (date(2026, 6, 10), "신한은행 카드매출 2차 정산", 3100000, 0,       "상품매출"),
        (date(2026, 6, 11), "광고선전비 (카카오 디스플레이)",   0, 420000,  "광고선전비"),
        (date(2026, 6, 12), "사무용품비 (복합기 잉크 외)",      0, 68000,   "사무용품비"),
        (date(2026, 6, 13), "쿠팡 로켓배송 정산",          1800000, 0,       "상품매출"),
        (date(2026, 6, 14), "네이버페이 정산",              1284000, 0,       "상품매출"),
        (date(2026, 6, 14), "이마트 트레이더스",                 0, 284500,  "상품매입"),
        (date(2026, 6, 15), "전기·수도·가스",                   0, 290000,  "공과금"),
        (date(2026, 6, 15), "(주)미라클디자인",             2750000, 0,       "용역수익"),
        (date(2026, 6, 15), "GS25 역삼점",                       0, 12300,   "복리후생비"),
        (date(2026, 6, 16), "신한은행 카드매출 3차 정산",  580000,  0,       "상품매출"),
        (date(2026, 6, 16), "네이버페이 정산",              406000,  0,       "상품매출"),
        (date(2026, 6, 18), "스타벅스 강남점",                   0, 8400,    "복리후생비"),
        (date(2026, 6, 18), "쿠팡 비즈니스",                    0, 42600,   "사무용품비"),
    ]

    for tx_date, desc, dep, wd, cat in txns:
        db.add(BankTransaction(
            business_id=bid,
            transaction_date=tx_date,
            description=desc,
            deposit=dep,
            withdrawal=wd,
            balance=0,
            category=cat,
            is_matched=0,
        ))

    # ── 할 일 목록 ─────────────────────────────────────────────
    todos_data = [
        ("5월 부가세 매입세액 확인", True),
        ("직원 식대 영수증 7건 검토", False),
        ("거래처 정산서 발행 (미라클디자인)", False),
        ("신한카드 매출 누락분 확인", False),
    ]
    for text, done in todos_data:
        db.add(Todo(business_id=bid, text=text, done=done))

    db.commit()
    print(f"[OK] 사용자: {user.email} (비밀번호: password123)")
    print(f"[OK] 사업장: {biz.business_name} ({biz.business_number})")
    print(f"[OK] 은행거래: {len(txns)}건")
    print(f"[OK] 할 일: {len(todos_data)}건")
    print("\n로그인 정보:")
    print("  이메일: kim@bookkeep.ai")
    print("  비밀번호: password123")


if __name__ == "__main__":
    print("SelfERP 더미데이터 시더 시작...")
    Base.metadata.create_all(bind=engine)

    from sqlalchemy.orm import sessionmaker
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        clear_data(db)
        seed(db)
        print("\n[완료] 시딩 성공!")
    except Exception as e:
        db.rollback()
        print(f"[오류] {e}")
        raise
    finally:
        db.close()
