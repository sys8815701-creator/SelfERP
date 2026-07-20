"""
SelfERP — MySQL 더미데이터 시더
실행: python seed.py  (backend/ 디렉터리에서)

초기화 후 다음 데이터를 생성합니다:
  - 사용자: 김상진 (kim@bookkeep.ai / password123) — admin
  - 사업장: 행복한 베이커리
  - 회계: 은행거래(2026년 1~6월), 카드매출, 영수증(OCR), 경비, 거래처,
          미수금/미지급금, 세금계산서, 견적서/청구서/발주서, 예산
  - 인사: 부서·직급, 직원(재직/휴직/퇴직), 계약서, 휴가, 급여, 퇴직금
  - 생산: 품목(원자재/완제품), BOM, 생산지시서, 생산실적, 입출고이력
  - 유통: 차량, 수주, 배송지시, 반품
  - 오늘의 할 일
"""

import sys
import os

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from datetime import date, datetime, timedelta
from sqlalchemy import text
from sqlalchemy.orm import Session
from core.database import engine, Base
from core.security import hash_password
from models.user import User
from models.business import Business
from models.bank_transaction import BankTransaction
from models.card_sale import CardSale
from models.todo import Todo
from models.receipt import Receipt
from models.expense import Expense
from models.vendor import Vendor
from models.ar_ap import AccountReceivable, AccountPayable
from models.tax_invoice import TaxInvoice
from models.estimate import Estimate, EstimateItem
from models.budget import BudgetItem
from models.department import Department
from models.position import Position
from models.employee import Employee
from models.contract import Contract
from models.leave import Leave
from models.payroll import Payroll, Severance
from models.production import Item, BOM, BOMLine, ProductionOrder, ProductionResult, InventoryLog
from models.distribution import Vehicle, SalesOrder, SalesOrderItem, Delivery, DeliveryReturn
from models.business_join_request import BusinessJoinRequest
from models.pending_registration import PendingRegistration
import models  # 모든 모델 임포트 (테이블 생성용)

TODAY = date.today()


def clear_data(db: Session):
    db.execute(text("SET FOREIGN_KEY_CHECKS=0"))
    for tbl in [
        "todos", "bank_transactions", "card_sales", "receipts", "expenses",
        "journal_lines", "journals",
        "vendors", "account_receivables", "account_payables", "tax_invoices",
        "estimate_items", "estimates", "budget_items",
        "leaves", "contracts", "severances", "payrolls", "employees",
        "positions", "departments",
        "bom_lines", "boms", "production_results", "production_orders",
        "inventory_logs", "items",
        "delivery_returns", "deliveries", "sales_order_items", "sales_orders", "vehicles",
        "business_join_requests", "pending_registrations",
        "businesses", "users",
    ]:
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
        bank_name="신한은행",
        account_number="110-123-456789",
        bank_holder="김상진",
    )
    db.add(biz)
    db.flush()
    bid = biz.id

    # ── 권한별 테스트 계정 (매니저 · 일반) ───────────────────
    # 관리자(admin) 계정은 위 김상진(kim@bookkeep.ai) 사용.
    # 아래 두 계정은 employees_data의 실제 직원과 이메일을 맞춰 로그인 시 자동으로
    # 같은 사업장("행복한 베이커리")에 연결되도록 한다 (core/deps.py 인가 로직).
    manager_user = User(
        email="seoyeon@bakery.kr", password=hash_password("password123"),
        name="이서연", role="accountant",
    )
    general_user = User(
        email="haneul@bakery.kr", password=hash_password("password123"),
        name="정하늘", role="employee",
    )
    db.add_all([manager_user, general_user])
    db.flush()

    # ── 가입 승인 대기 더미 (integrated/pending 페이지용) ─────
    pending_user = User(
        email="newbie@bakery.kr", password=hash_password("password123"),
        name="윤서준", role="employee", is_active=0,
        department_name="영업팀", position_name="사원",
    )
    db.add(pending_user)

    outside_user = User(
        email="outside@otherco.kr", password=hash_password("password123"),
        name="한소미", role="employee",
    )
    db.add(outside_user)
    db.flush()
    db.add(BusinessJoinRequest(user_id=outside_user.id, business_id=bid, status="pending"))

    db.add(PendingRegistration(
        status="pending", business_name="달콤제과점", business_number="777-88-99999",
        owner_name="서지호", industry="식품업", business_type="개인사업자",
        open_date="2025-01-10", address="서울시 마포구 합정동 12",
        email="dalkomm@example.com", password_hash=hash_password("password123"),
    ))
    db.add(PendingRegistration(
        status="approved", business_name="청년카페", business_number="888-99-00001",
        owner_name="문지아", industry="외식업", business_type="개인사업자",
        open_date="2024-05-20", address="서울시 서초구 서초동 5",
        email="youthcafe@example.com", password_hash=hash_password("password123"),
        reviewed_at=TODAY - timedelta(days=10),
    ))

    # ── 은행 거래 (2026년 1~6월) ──────────────────────────────
    txns = [
        (date(2026, 1,  3), "신한은행 카드매출 정산",    4500000, 0,       "상품매출"),
        (date(2026, 1,  7), "국민카드 매출 정산",         1800000, 0,       "상품매출"),
        (date(2026, 1, 10), "나이스페이 정산",             1900000, 0,       "상품매출"),
        (date(2026, 1,  5), "CJ 밀가루 외 식재료",              0, 2100000, "상품매입"),
        (date(2026, 1, 10), "임차료 (강남구 역삼동)",           0, 1800000, "임차료"),
        (date(2026, 1, 15), "직원 급여",                        0, 800000,  "급여"),
        (date(2026, 1, 20), "전기·수도·가스",                   0, 250000,  "공과금"),
        (date(2026, 1, 25), "네이버 광고비",                    0, 150000,  "광고선전비"),
        (date(2026, 2,  3), "신한은행 카드매출 정산",    5000000, 0,       "상품매출"),
        (date(2026, 2,  8), "쿠팡 오픈마켓 정산",         2300000, 0,       "상품매출"),
        (date(2026, 2, 12), "네이버 스마트스토어 정산",    2200000, 0,       "상품매출"),
        (date(2026, 2,  5), "CJ 밀가루 외 식재료",              0, 2400000, "상품매입"),
        (date(2026, 2, 10), "임차료 (강남구 역삼동)",           0, 1800000, "임차료"),
        (date(2026, 2, 15), "직원 급여",                        0, 800000,  "급여"),
        (date(2026, 2, 20), "복리후생비 (간식·경조사)",         0, 320000,  "복리후생비"),
        (date(2026, 2, 25), "사무용품비",                       0, 480000,  "사무용품비"),
        (date(2026, 3,  3), "신한은행 카드매출 정산",    4100000, 0,       "상품매출"),
        (date(2026, 3,  8), "쿠팡 오픈마켓 정산",         1800000, 0,       "상품매출"),
        (date(2026, 3, 12), "네이버 스마트스토어 정산",    1900000, 0,       "상품매출"),
        (date(2026, 3,  5), "CJ 밀가루 외 식재료",              0, 1900000, "상품매입"),
        (date(2026, 3, 10), "임차료 (강남구 역삼동)",           0, 1800000, "임차료"),
        (date(2026, 3, 15), "직원 급여",                        0, 800000,  "급여"),
        (date(2026, 3, 20), "전기·수도·가스",                   0, 250000,  "공과금"),
        (date(2026, 3, 25), "네이버 광고비",                    0, 150000,  "광고선전비"),
        (date(2026, 4,  3), "신한은행 카드매출 정산",    5800000, 0,       "상품매출"),
        (date(2026, 4,  8), "쿠팡 오픈마켓 정산",         2700000, 0,       "상품매출"),
        (date(2026, 4, 12), "네이버 스마트스토어 정산",    2700000, 0,       "상품매출"),
        (date(2026, 4,  5), "CJ 밀가루 외 식재료",              0, 2500000, "상품매입"),
        (date(2026, 4, 10), "임차료 (강남구 역삼동)",           0, 1800000, "임차료"),
        (date(2026, 4, 15), "직원 급여",                        0, 900000,  "급여"),
        (date(2026, 4, 20), "광고선전비 (네이버+카카오)",       0, 580000,  "광고선전비"),
        (date(2026, 4, 25), "사무용품비",                       0, 420000,  "사무용품비"),
        (date(2026, 5,  3), "신한은행 카드매출 정산",    7000000, 0,       "상품매출"),
        (date(2026, 5,  8), "쿠팡 오픈마켓 정산",         3200000, 0,       "상품매출"),
        (date(2026, 5, 12), "네이버 스마트스토어 정산",    3200000, 0,       "상품매출"),
        (date(2026, 5,  5), "CJ 밀가루 외 식재료",              0, 2900000, "상품매입"),
        (date(2026, 5, 10), "임차료 (강남구 역삼동)",           0, 1800000, "임차료"),
        (date(2026, 5, 15), "직원 급여",                        0, 1000000, "급여"),
        (date(2026, 5, 20), "광고선전비 (네이버+카카오)",       0, 850000,  "광고선전비"),
        (date(2026, 5, 25), "복리후생비 (단체회식)",            0, 350000,  "복리후생비"),
        (date(2026, 5, 28), "사무용품비",                       0, 200000,  "사무용품비"),
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
        # 7월 — 이번 달(진행 중) 거래. 다른 달과 확연히 다른 규모로 넣어서
        # 상단 달력에서 월을 바꿨을 때 실제로 숫자가 달라지는 걸 확인할 수 있게 한다.
        (date(2026, 7,  2), "신한은행 카드매출 정산",    6200000, 0,       "상품매출"),
        (date(2026, 7,  4), "쿠팡 오픈마켓 정산",         3400000, 0,       "상품매출"),
        (date(2026, 7,  5), "CJ 밀가루 외 식재료",              0, 3100000, "상품매입"),
        (date(2026, 7,  7), "네이버 스마트스토어 정산",    2900000, 0,       "상품매출"),
        (date(2026, 7,  9), "임차료 (강남구 역삼동)",           0, 1800000, "임차료"),
        (date(2026, 7, 10), "직원 급여",                        0, 1050000, "급여"),
        (date(2026, 7, 11), "신한은행 카드매출 2차 정산", 2600000, 0,       "상품매출"),
        (date(2026, 7, 12), "광고선전비 (여름 프로모션)",       0, 920000,  "광고선전비"),
        (date(2026, 7, 13), "전기·수도·가스",                   0, 310000,  "공과금"),
        (date(2026, 7, 14), "(주)미라클디자인",             3200000, 0,       "용역수익"),
        (date(2026, 7, 15), "사무용품비 (여름 소모품)",         0, 95000,   "사무용품비"),
        (date(2026, 7, 16), "쿠팡 로켓배송 정산",          1450000, 0,       "상품매출"),
        (date(2026, 7, 16), "GS25 역삼점",                       0, 15600,   "복리후생비"),
    ]
    for tx_date, desc, dep, wd, cat in txns:
        db.add(BankTransaction(
            business_id=bid, transaction_date=tx_date, description=desc,
            deposit=dep, withdrawal=wd, balance=0, category=cat, is_matched=0,
        ))

    # ── 카드매출 ──────────────────────────────────────────────
    card_companies = ["신한카드", "국민카드", "삼성카드", "현대카드", "우리카드"]
    for i in range(12):
        d = TODAY - timedelta(days=i * 3)
        db.add(CardSale(
            business_id=bid,
            card_company=card_companies[i % len(card_companies)],
            approval_no=f"AP{20260000 + i}",
            approval_date=d,
            approval_amount=150000 + i * 37000,
            fee_amount=round((150000 + i * 37000) * 0.023, 0),
            deposit_date=d + timedelta(days=2),
            deposited_at=(d + timedelta(days=2)) if i > 2 else None,
            status="deposited" if i > 2 else "pending",
        ))

    # ── 거래처 ────────────────────────────────────────────────
    vendors_data = [
        ("(주)미라클디자인",  "매출처", "111-22-33333", "박미라", "이디자", "010-1111-2222", "contact@miracle.co.kr", "서울 강남구 테헤란로 1", "디자인업", 1),
        ("CJ프레시웨이",      "매입처", "222-33-44444", "정프레", "김구매", "02-2222-3333",  "sales@cjfresh.co.kr",  "서울 중구 을지로 2", "식자재유통", 1),
        ("이마트 트레이더스",  "매입처", "333-44-55555", "이마트", "박담당", "1577-1234",     "biz@emart.co.kr",      "서울 성동구 왕십리로 3", "유통업", 1),
        ("쿠팡(주)",           "매출처", "444-55-66666", "쿠팡대", "최쿠팡", "1577-7011",     "partner@coupang.com",  "서울 송파구 송파대로 4", "이커머스", 1),
        ("네이버파이낸셜",     "양방향", "555-66-77777", "네이버", "김네이", "1588-3819",     "biz@navercorp.com",   "경기 성남시 분당구 5", "핀테크", 1),
        ("행복물류(주)",       "매입처", "666-77-88888", "홍물류", "이배송", "010-3333-4444", "cs@happylogis.co.kr", "경기 김포시 물류로 6", "물류업", 0),
    ]
    vendors = []
    for name, vtype, bn, ceo, contact_name, contact, email, addr, industry, active in vendors_data:
        v = Vendor(
            business_id=bid, vendor_name=name, vendor_type=vtype, business_number=bn,
            ceo_name=ceo, contact_name=contact_name, contact=contact, email=email,
            address=addr, industry=industry, bank_name="국민은행", account_number="123456-78-901234",
            bank_holder=ceo, credit_limit=5000000, payment_terms=30,
            note="정기 거래처", is_active=active,
        )
        db.add(v)
        vendors.append(v)
    db.flush()

    # ── 미수금(AR) / 미지급금(AP) ─────────────────────────────
    ar_data = [
        (vendors[0], "6월 디자인 용역비",   3500000, 3500000, TODAY - timedelta(days=40), TODAY - timedelta(days=10), "완료"),
        (vendors[3], "쿠팡 7월 정산 예정분", 4200000, 0,       TODAY - timedelta(days=5),  TODAY + timedelta(days=20), "미수"),
        (vendors[4], "네이버페이 미정산분",  1800000, 900000,  TODAY - timedelta(days=15), TODAY - timedelta(days=2),  "일부수금"),
        (vendors[0], "5월 브랜딩 자문료",    2200000, 0,       TODAY - timedelta(days=50), TODAY - timedelta(days=20), "미수"),
        (vendors[3], "쿠팡 반품 정산 보류건", 300000,  0,       TODAY - timedelta(days=90), TODAY - timedelta(days=60), "대손"),
    ]
    for vendor, title, amount, paid, issue, due, status in ar_data:
        db.add(AccountReceivable(
            business_id=bid, vendor_id=vendor.id, title=title, amount=amount, paid_amount=paid,
            issue_date=issue, due_date=due, status=status,
        ))

    ap_data = [
        (vendors[1], "6월 식자재 대금",  2400000, 2400000, TODAY - timedelta(days=35), TODAY - timedelta(days=5),  "완료"),
        (vendors[2], "7월 식자재 대금",  1650000, 0,       TODAY - timedelta(days=8),  TODAY + timedelta(days=12), "미지급"),
        (vendors[5], "6월 배송 수수료",  850000,  400000,  TODAY - timedelta(days=20), TODAY - timedelta(days=3),  "일부지급"),
        (vendors[1], "7월 식자재 선주문", 980000,  0,       TODAY - timedelta(days=2),  TODAY + timedelta(days=25), "미지급"),
    ]
    for vendor, title, amount, paid, issue, due, status in ap_data:
        db.add(AccountPayable(
            business_id=bid, vendor_id=vendor.id, title=title, amount=amount, paid_amount=paid,
            issue_date=issue, due_date=due, status=status,
        ))

    # ── 세금계산서 ────────────────────────────────────────────
    tax_invoices_data = [
        (vendors[0], "발행", "TX-2026-0601", TODAY - timedelta(days=12), 3500000, 350000, "디자인 용역", "발행완료"),
        (vendors[3], "발행", "TX-2026-0602", TODAY - timedelta(days=6),  4200000, 420000, "상품 매출",   "발행완료"),
        (vendors[1], "수취", "TX-2026-0603", TODAY - timedelta(days=9),  1650000, 165000, "식자재 매입", "발행완료"),
        (vendors[2], "수취", "TX-2026-0604", TODAY - timedelta(days=4),  284500,  28450,  "식자재 매입", "발행완료"),
        (vendors[4], "발행", "TX-2026-0605", TODAY - timedelta(days=1),  1800000, 180000, "온라인 매출", "임시저장"),
        (vendors[5], "수취", "",             TODAY,                      850000,  85000,  "배송 수수료", "임시저장"),
    ]
    for vendor, direction, inv_no, issue, supply, tax, item_name, status in tax_invoices_data:
        db.add(TaxInvoice(
            business_id=bid, vendor_id=vendor.id, direction=direction, invoice_no=inv_no,
            issue_date=issue, supply_amount=supply, tax_amount=tax, total_amount=supply + tax,
            item_name=item_name, status=status,
        ))

    # ── 견적서 · 청구서 · 발주서 ──────────────────────────────
    estimates_data = [
        (vendors[0], "견적서", "EST-0601", TODAY - timedelta(days=15), TODAY - timedelta(days=1), "승인",
         [("브랜드 리뉴얼 컨설팅", 1, 3000000), ("로고 디자인", 1, 500000)]),
        (vendors[3], "청구서", "INV-0602", TODAY - timedelta(days=8), TODAY + timedelta(days=7), "발송",
         [("7월 정산 수수료", 1, 420000)]),
        (vendors[1], "발주서", "PO-0603", TODAY - timedelta(days=3), TODAY + timedelta(days=10), "발송",
         [("밀가루(20kg)", 40, 32000), ("설탕(10kg)", 20, 18000)]),
        (vendors[2], "견적서", "EST-0604", TODAY - timedelta(days=1), TODAY + timedelta(days=14), "초안",
         [("냉동 생지 원료", 100, 4500)]),
        (vendors[4], "청구서", "INV-0605", TODAY - timedelta(days=20), TODAY - timedelta(days=5), "취소",
         [("스마트스토어 광고 대행", 1, 300000)]),
    ]
    for vendor, doc_type, doc_no, issue, due, status, items in estimates_data:
        supply = sum(q * p for _, q, p in items)
        tax = round(supply * 0.1, 2)
        est = Estimate(
            business_id=bid, vendor_id=vendor.id, doc_type=doc_type, doc_no=doc_no,
            issue_date=issue, due_date=due, supply_amount=supply, tax_amount=tax,
            total_amount=supply + tax, status=status,
        )
        for name, qty, price in items:
            est.items.append(EstimateItem(item_name=name, quantity=qty, unit_price=price, amount=qty * price))
        db.add(est)

    # ── 예산 (이번 달 + 지난 달) ──────────────────────────────
    budget_categories = [
        ("상품매출", "revenue", 8000000), ("용역수익", "revenue", 2000000),
        ("상품매입", "expense", 3000000), ("임차료", "expense", 1800000),
        ("급여", "expense", 1000000), ("광고선전비", "expense", 500000),
    ]
    for y, m in [(TODAY.year, TODAY.month), (TODAY.year if TODAY.month > 1 else TODAY.year - 1, TODAY.month - 1 if TODAY.month > 1 else 12)]:
        for cat, btype, amount in budget_categories:
            db.add(BudgetItem(business_id=bid, budget_year=y, budget_month=m, category=cat, btype=btype, amount=amount))

    # ── 부서 · 직급 ───────────────────────────────────────────
    dept_names = ["경영지원팀", "생산팀", "영업팀", "물류팀"]
    depts = {}
    for name in dept_names:
        d = Department(business_id=bid, name=name, code=name[:2].upper())
        db.add(d)
        depts[name] = d
    db.flush()

    pos_names = [("팀장", 4), ("과장", 3), ("대리", 2), ("사원", 1)]
    positions = {}
    for name, level in pos_names:
        p = Position(business_id=bid, name=name, level=level)
        db.add(p)
        positions[name] = p
    db.flush()

    # ── 직원 ──────────────────────────────────────────────────
    employees_data = [
        ("김상진", "kim@bookkeep.ai",   "010-1000-0001", "경영지원팀", "팀장", "정규직", "재직", date(2020, 3, 15), None,           5000000),
        ("이서연", "seoyeon@bakery.kr", "010-1000-0002", "생산팀",     "과장", "정규직", "재직", date(2021, 6, 1),  None,           3800000),
        ("박준호", "junho@bakery.kr",   "010-1000-0003", "생산팀",     "대리", "정규직", "재직", date(2022, 9, 12), None,           3200000),
        ("최민지", "minji@bakery.kr",   "010-1000-0004", "영업팀",     "대리", "정규직", "재직", date(2022, 1, 10), None,           3300000),
        ("정하늘", "haneul@bakery.kr",  "010-1000-0005", "영업팀",     "사원", "계약직", "재직", date(2023, 4, 3),  None,           2700000),
        ("한지우", "jiwoo@bakery.kr",   "010-1000-0006", "물류팀",     "사원", "파트타임", "재직", date(2023, 11, 20), None,         2200000),
        ("오세훈", "sehoon@bakery.kr",  "010-1000-0007", "물류팀",     "대리", "정규직", "휴직", date(2021, 2, 15), None,           3100000),
        ("강나은", "naeun@bakery.kr",   "010-1000-0008", "생산팀",     "사원", "정규직", "퇴직", date(2020, 8, 1),  TODAY - timedelta(days=45), 2900000),
    ]
    # 로그인 계정과 직원 레코드 연결 (권한별 대시보드 라우팅 · X-Business-Id 없이도 접근 가능하도록)
    user_links = {"김상진": user.id, "이서연": manager_user.id, "정하늘": general_user.id}

    employees = {}
    for name, email, phone, dept, pos, etype, status, hire, resign, salary in employees_data:
        e = Employee(
            business_id=bid, department_id=depts[dept].id, position_id=positions[pos].id,
            user_id=user_links.get(name),
            name=name, email=email, phone=phone, hire_date=hire, resign_date=resign,
            employment_type=etype, status=status, base_salary=salary,
            bank_name="국민은행", account_number=f"123-45-{employees_data.index((name, email, phone, dept, pos, etype, status, hire, resign, salary)):06d}",
            bank_holder=name, address="서울시 강남구", emergency_name="비상연락처", emergency_phone="010-9999-0000",
        )
        db.add(e)
        employees[name] = e
    db.flush()

    # ── 계약서 ────────────────────────────────────────────────
    contracts_data = [
        ("이서연 근로계약서", "근로계약서", "이서연", employees["이서연"], date(2021, 6, 1), None, 0, "서명완료"),
        ("박준호 근로계약서", "근로계약서", "박준호", employees["박준호"], date(2022, 9, 12), None, 0, "서명완료"),
        ("(주)미라클디자인 용역계약", "거래처계약서", "(주)미라클디자인", None, TODAY - timedelta(days=60), TODAY + timedelta(days=300), 12000000, "서명완료"),
        ("정하늘 계약직 갱신", "근로계약서", "정하늘", employees["정하늘"], TODAY - timedelta(days=10), TODAY + timedelta(days=355), 0, "서명요청"),
        ("행복물류 배송위탁계약", "거래처계약서", "행복물류(주)", None, TODAY - timedelta(days=200), TODAY + timedelta(days=165), 0, "작성중"),
    ]
    for title, ctype, counterparty, emp, start, end, amount, sign_status in contracts_data:
        db.add(Contract(
            business_id=bid, employee_id=emp.id if emp else None, title=title, contract_type=ctype,
            counterparty=counterparty, start_date=start, end_date=end, amount=amount, sign_status=sign_status,
        ))

    # ── 휴가 ──────────────────────────────────────────────────
    leaves_data = [
        (employees["이서연"], "연차", TODAY - timedelta(days=20), TODAY - timedelta(days=19), 2, "승인"),
        (employees["박준호"], "반차(오전)", TODAY - timedelta(days=5), TODAY - timedelta(days=5), 0.5, "승인"),
        (employees["최민지"], "연차", TODAY + timedelta(days=3), TODAY + timedelta(days=5), 3, "대기"),
        (employees["정하늘"], "병가", TODAY - timedelta(days=12), TODAY - timedelta(days=10), 3, "승인"),
        (employees["한지우"], "경조사", TODAY + timedelta(days=10), TODAY + timedelta(days=11), 2, "대기"),
        (employees["오세훈"], "무급", TODAY - timedelta(days=30), TODAY, 30, "승인"),
    ]
    for emp, ltype, start, end, days, status in leaves_data:
        db.add(Leave(business_id=bid, employee_id=emp.id, leave_type=ltype, start_date=start, end_date=end, days=days, status=status, reason=f"{ltype} 신청"))

    # ── 급여 (이번 달) ────────────────────────────────────────
    active_emps = [employees[n] for n in ["김상진", "이서연", "박준호", "최민지", "정하늘", "한지우"]]
    for emp in active_emps:
        base = float(emp.base_salary)
        np_ = round(base * 0.045, 0); hi = round(base * 0.0354, 0); ei = round(base * 0.009, 0)
        tax = round(base * 0.03, 0); ltax = round(tax * 0.1, 0)
        db.add(Payroll(
            business_id=bid, employee_id=emp.id, pay_year=TODAY.year, pay_month=TODAY.month,
            base_salary=base, overtime_pay=0, bonus=0, meal_allowance=100000, transport_allow=50000,
            other_allowance=0, national_pension=np_, health_insurance=hi, employment_insurance=ei,
            income_tax=tax, local_income_tax=ltax, other_deduction=0, advance_payment=0,
            status="확정",
        ))

    # ── 퇴직금 (퇴직 처리된 직원) ─────────────────────────────
    retiree = employees["강나은"]
    days_worked = (retiree.resign_date - retiree.hire_date).days
    years_worked = round(days_worked / 365, 2)
    avg_wage = float(retiree.base_salary)
    db.add(Severance(
        business_id=bid, employee_id=retiree.id, resign_date=retiree.resign_date,
        total_pay=round(avg_wage * years_worked, 0), avg_wage_3m=avg_wage, work_years=years_worked,
        status="지급완료",
    ))

    # ── 생산: 품목 ────────────────────────────────────────────
    items_data = [
        ("RM-001", "밀가루(20kg)",  "원자재", "포대", 32000, 85,  20, 200),
        ("RM-002", "설탕(10kg)",    "원자재", "포대", 18000, 40,  10, 100),
        ("RM-003", "버터(1kg)",     "원자재", "개",   9500,  15,  20, 80),
        ("RM-004", "계란(30구)",    "원자재", "판",   7200,  8,   15, 60),
        ("PK-001", "포장 박스(대)", "소모품", "개",   500,   300, 100, 1000),
        ("FG-001", "식빵",          "완제품", "개",   3500,  42,  30, 300),
        ("FG-002", "크루아상",      "완제품", "개",   2800,  18,  25, 200),
        ("FG-003", "단팥빵",        "완제품", "개",   1800,  55,  40, 250),
    ]
    items = {}
    for code, name, itype, unit, price, stock, safety, maxs in items_data:
        it = Item(
            business_id=bid, item_code=code, item_name=name, item_type=itype, unit=unit,
            unit_price=price, current_stock=stock, safety_stock=safety, max_stock=maxs, is_active=1,
        )
        db.add(it)
        items[name] = it
    db.flush()

    # ── BOM (식빵 기준) ───────────────────────────────────────
    bom = BOM(business_id=bid, product_id=items["식빵"].id, version="1.0", description="식빵 표준 레시피")
    bom.lines.append(BOMLine(item_id=items["밀가루(20kg)"].id, quantity=0.5, unit="포대", note="1배치 기준"))
    bom.lines.append(BOMLine(item_id=items["버터(1kg)"].id, quantity=0.2, unit="개"))
    bom.lines.append(BOMLine(item_id=items["계란(30구)"].id, quantity=0.1, unit="판"))
    db.add(bom)
    db.flush()

    # ── 생산 지시서 · 실적 ────────────────────────────────────
    orders_data = [
        ("PO-0601", items["식빵"], 100, TODAY - timedelta(days=10), "완료", 100, 2),
        ("PO-0602", items["크루아상"], 80, TODAY - timedelta(days=5), "생산중", 40, 1),
        ("PO-0603", items["단팥빵"], 150, TODAY - timedelta(days=1), "대기", 0, 0),
        ("PO-0604", items["식빵"], 60, TODAY + timedelta(days=3), "대기", 0, 0),
    ]
    for order_no, product, planned, planned_date, status, completed, defect in orders_data:
        o = ProductionOrder(
            business_id=bid, order_no=order_no, product_id=product.id,
            bom_id=bom.id if product.id == items["식빵"].id else None,
            planned_qty=planned, planned_date=planned_date, status=status,
        )
        db.add(o)
        db.flush()
        if completed > 0:
            db.add(ProductionResult(
                business_id=bid, order_id=o.id, completed_qty=completed, defect_qty=defect,
                completed_date=planned_date + timedelta(days=1),
            ))

    # ── 입출고 이력 (수기 입고/조정) ──────────────────────────
    inv_logs = [
        (items["밀가루(20kg)"], "입고", 50, TODAY - timedelta(days=15), "정기 발주"),
        (items["설탕(10kg)"],   "입고", 20, TODAY - timedelta(days=15), "정기 발주"),
        (items["버터(1kg)"],    "입고", 30, TODAY - timedelta(days=8),  "긴급 발주"),
        (items["포장 박스(대)"], "입고", 500, TODAY - timedelta(days=20), "분기 발주"),
        (items["식빵"],         "조정", -3, TODAY - timedelta(days=2),  "실사 중 파손 확인"),
    ]
    for item, log_type, qty, log_date, note in inv_logs:
        db.add(InventoryLog(business_id=bid, item_id=item.id, log_type=log_type, quantity=qty, log_date=log_date, note=note))

    # ── 유통: 차량 · 수주 · 배송 · 반품 ───────────────────────
    vehicles_data = [
        ("12가3456", "1톤 트럭", "이배송", "010-5000-0001", 1000, 1),
        ("34나5678", "2.5톤 트럭", "박기사", "010-5000-0002", 2500, 1),
        ("56다7890", "다마스", "정기사", "010-5000-0003", 500, 0),
    ]
    vehicles = {}
    for plate, vtype, driver, phone, maxw, active in vehicles_data:
        v = Vehicle(business_id=bid, plate_no=plate, vehicle_type=vtype, driver_name=driver, driver_phone=phone, max_weight=maxw, is_active=active)
        db.add(v)
        vehicles[plate] = v
    db.flush()

    orders_dist = [
        ("SO-0601", vendors[3], TODAY - timedelta(days=12), TODAY - timedelta(days=5), "완료", 2100000),
        ("SO-0602", vendors[4], TODAY - timedelta(days=6),  TODAY + timedelta(days=2), "배송중", 1600000),
        ("SO-0603", vendors[0], TODAY - timedelta(days=2),  TODAY + timedelta(days=6), "접수", 950000),
        ("SO-0604", vendors[3], TODAY - timedelta(days=1),  TODAY + timedelta(days=1), "출하대기", 1200000),
    ]
    sales_orders = {}
    for order_no, vendor, order_date, due, status, total in orders_dist:
        so = SalesOrder(business_id=bid, vendor_id=vendor.id, order_no=order_no, order_date=order_date, due_date=due, status=status, total_amount=total)
        so.items.append(SalesOrderItem(item_name="식빵 외 혼합구성", quantity=1, unit_price=total, amount=total))
        db.add(so)
        db.flush()
        sales_orders[order_no] = so

    deliveries_data = [
        (sales_orders["SO-0601"], vehicles["12가3456"], "DL-0601", TODAY - timedelta(days=6), TODAY - timedelta(days=5), "완료", 45000),
        (sales_orders["SO-0602"], vehicles["34나5678"], "DL-0602", TODAY - timedelta(days=1), None, "배송중", 60000),
        (sales_orders["SO-0603"], None, "DL-0603", TODAY + timedelta(days=5), None, "대기", 0),
        (sales_orders["SO-0604"], vehicles["12가3456"], "DL-0604", TODAY, None, "대기", 38000),
    ]
    deliveries = {}
    for so, vehicle, dno, scheduled, completed, status, fee in deliveries_data:
        d = Delivery(
            business_id=bid, sales_order_id=so.id, vehicle_id=vehicle.id if vehicle else None,
            delivery_no=dno, scheduled_date=scheduled, completed_date=completed,
            destination="서울시 송파구 배송지", recipient="수령담당자", recipient_phone="010-7000-0000",
            status=status, delivery_fee=fee,
        )
        db.add(d)
        db.flush()
        deliveries[dno] = d

    db.add(DeliveryReturn(
        business_id=bid, delivery_id=deliveries["DL-0601"].id, item_id=items["식빵"].id,
        item_name="식빵", return_qty=3, reason="품질불량", return_date=TODAY - timedelta(days=4),
        note="배송 중 파손", is_restocked=0,
    ))

    # ── OCR 영수증 (영수증 OCR 페이지는 상단 달력의 '월'로 필터링되므로
    #    특정 한 달에만 몰려있으면 달을 바꿔도 항상 그대로/빈 목록으로 보인다.
    #    2~7월에 걸쳐 실제로 다른 데이터가 나오도록 분산 배치) ──────────
    receipts_data = [
        ("이마트 트레이더스", 198000, 18000,  date(2026, 2, 12), "approved"),
        ("스타벅스 강남점",   7200,   655,    date(2026, 2, 24), "approved"),
        ("CJ프레시웨이",      1420000, 129000, date(2026, 3, 9),  "approved"),
        ("GS25 역삼점",       9800,   891,    date(2026, 3, 21), "approved"),
        ("쿠팡 비즈니스",     38200,  3473,   date(2026, 4, 6),  "approved"),
        ("이마트 트레이더스", 256000, 23273,  date(2026, 4, 19), "approved"),
        ("CJ프레시웨이",      1580000, 143636, date(2026, 5, 8),  "approved"),
        ("스타벅스 강남점",   11200,  1018,   date(2026, 5, 27), "approved"),
        ("이마트 트레이더스", 284500, 25864, TODAY - timedelta(days=3), "approved"),
        ("CJ프레시웨이",      1650000, 150000, TODAY - timedelta(days=9), "approved"),
        ("스타벅스 강남점",   8400,   764,   TODAY - timedelta(days=1), "pending"),
        ("쿠팡 비즈니스",     42600,  3873,  TODAY,                     "pending"),
    ]
    for vendor_name, total, tax, issued, status in receipts_data:
        db.add(Receipt(
            business_id=bid, file_path="uploads/sample_receipt.jpg", vendor=vendor_name,
            total_amount=total, tax_amount=tax, issued_at=issued,
            raw_text=f"{vendor_name}\n합계 {total}원", status=status, uploaded_by=user.id,
            created_at=datetime(issued.year, issued.month, issued.day, 12, 0, 0),
        ))

    # ── 경비 정산 (경비 정산 페이지도 상단 달력의 '월'로 필터링되므로
    #    2~7월에 걸쳐 분산 배치 — 관리자 본인 신청건 + 직원 신청건 혼합) ──────
    expenses_data = [
        ("설 명절 선물비",     65000,  "접대비",   "approved", user,         date(2026, 2, 10)),
        ("봄맞이 청소 용품",   28000,  "소모품비", "approved", manager_user, date(2026, 3, 14)),
        ("거래처 미팅 다과",   41000,  "식비",     "approved", user,         date(2026, 4, 18)),
        ("야유회 회식비",      190000, "복리후생비","approved", general_user, date(2026, 5, 22)),
        ("사무실 비품 구입",   63000,  "소모품비", "approved", manager_user, date(2026, 6, 5)),
        ("거래처 미팅 식대",   85000,  "식비",     "approved", user,         TODAY - timedelta(days=5)),
        ("사무용품 구입",      32000,  "소모품비", "pending",  manager_user, TODAY - timedelta(days=5)),
        ("출장 교통비",        54000,  "교통비",   "approved", user,         TODAY - timedelta(days=5)),
        ("직원 회식비",        280000, "복리후생비","rejected", general_user, TODAY - timedelta(days=5)),
        ("영업 미팅 식대",     47000,  "식비",     "pending",  general_user, TODAY - timedelta(days=5)),
    ]
    for title, amount, category, status, requester, req_date in expenses_data:
        db.add(Expense(
            business_id=bid, title=title, amount=amount, category=category,
            requested_by=requester.id, approved_by=user.id if status != "pending" else None,
            status=status, requested_at=datetime(req_date.year, req_date.month, req_date.day, 10, 0, 0),
            approved_at=datetime(req_date.year, req_date.month, req_date.day, 10, 0, 0) + timedelta(days=2) if status != "pending" else None,
        ))

    # ── 할 일 목록 ────────────────────────────────────────────
    todos_data = [
        ("5월 부가세 매입세액 확인", True),
        ("직원 식대 영수증 7건 검토", False),
        ("거래처 정산서 발행 (미라클디자인)", False),
        ("신한카드 매출 누락분 확인", False),
    ]
    for todo_text, done in todos_data:
        db.add(Todo(business_id=bid, text=todo_text, done=done))

    db.commit()
    print(f"[OK] 사용자: {user.email} (비밀번호: password123)")
    print(f"[OK] 사업장: {biz.business_name} ({biz.business_number})")
    print(f"[OK] 은행거래: {len(txns)}건 / 카드매출: 12건")
    print(f"[OK] 거래처: {len(vendors_data)}개 / 미수금: {len(ar_data)}건 / 미지급금: {len(ap_data)}건")
    print(f"[OK] 세금계산서: {len(tax_invoices_data)}건 / 견적·청구·발주: {len(estimates_data)}건")
    print(f"[OK] 부서: {len(dept_names)}개 / 직급: {len(pos_names)}개 / 직원: {len(employees_data)}명")
    print(f"[OK] 계약서: {len(contracts_data)}건 / 휴가: {len(leaves_data)}건 / 급여: {len(active_emps)}건 / 퇴직금: 1건")
    print(f"[OK] 품목: {len(items_data)}개 / BOM: 1건 / 생산지시서: {len(orders_data)}건")
    print(f"[OK] 차량: {len(vehicles_data)}대 / 수주: {len(orders_dist)}건 / 배송: {len(deliveries_data)}건 / 반품: 1건")
    print(f"[OK] 영수증: {len(receipts_data)}건 / 경비: {len(expenses_data)}건")
    print(f"[OK] 할 일: {len(todos_data)}건")
    print(f"[OK] 가입승인 대기: 개인계정 1건 / 사업장가입요청 1건 / 사업자등록신청 2건")
    print("\n로그인 정보 (모두 '행복한 베이커리' 사업장 공유, 권한만 다름):")
    print("  [관리자] kim@bookkeep.ai       / password123  (role=admin)")
    print("  [매니저] seoyeon@bakery.kr     / password123  (role=accountant)")
    print("  [일반]   haneul@bakery.kr      / password123  (role=employee)")


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
