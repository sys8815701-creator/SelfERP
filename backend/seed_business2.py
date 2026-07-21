"""
두 번째 사업장("정성반찬") 더미데이터 추가 스크립트.
seed.py의 clear_data()를 호출하지 않는 순수 추가(INSERT) 전용 —
기존 "행복한 베이커리" 사업장과 그 3개 계정은 전혀 건드리지 않는다.

실행: venv\\Scripts\\python.exe seed_business2.py  (backend/ 디렉터리에서)
"""
import sys
import os

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from datetime import date, datetime, timedelta
from core.database import engine, Base, SessionLocal
from core.security import hash_password
from models.user import User
from models.business import Business
from models.bank_transaction import BankTransaction
from models.card_sale import CardSale
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
from models.payroll import Payroll
from models.production import Item, BOM, BOMLine, ProductionOrder, ProductionResult, InventoryLog
from models.distribution import Vehicle, SalesOrder, SalesOrderItem, Delivery
from models.todo import Todo
import models  # noqa: F401

TODAY = date.today()

BUSINESS_NUMBER = "220-81-55555"
OWNER_EMAIL = "park@jeongsung.kr"
MANAGER_EMAIL = "kim.accountant@jeongsung.kr"
EMPLOYEE_EMAIL = "lee.staff@jeongsung.kr"


def seed_business2(db):
    existing = db.query(Business).filter(Business.business_number == BUSINESS_NUMBER).first()
    if existing:
        print(f"이미 존재하는 사업장입니다 (id={existing.id}) — 중복 생성을 건너뜁니다.")
        return

    # ── 사용자 3계정 ──────────────────────────────────────────
    owner = User(email=OWNER_EMAIL, password=hash_password("password123"), name="박서준", role="admin")
    manager = User(email=MANAGER_EMAIL, password=hash_password("password123"), name="김도현", role="accountant")
    staff = User(email=EMPLOYEE_EMAIL, password=hash_password("password123"), name="이수아", role="employee")
    db.add_all([owner, manager, staff])
    db.flush()

    # ── 사업장 ────────────────────────────────────────────────
    biz = Business(
        user_id=owner.id, business_name="정성반찬", business_number=BUSINESS_NUMBER,
        owner_name="박서준", industry="식품제조업", business_type="법인사업자",
        open_date=date(2019, 9, 1), bank_name="기업은행",
        account_number="210-456-789012", bank_holder="정성반찬(주)",
    )
    db.add(biz)
    db.flush()
    bid = biz.id

    # ── 부서 · 직급 ───────────────────────────────────────────
    dept_names = ["경영관리팀", "제조팀", "배송팀"]
    depts = {}
    for name in dept_names:
        d = Department(business_id=bid, name=name, code=name[:2].upper())
        db.add(d)
        depts[name] = d
    db.flush()

    pos_names = [("팀장", 4), ("과장", 3), ("사원", 1)]
    positions = {}
    for name, level in pos_names:
        p = Position(business_id=bid, name=name, level=level)
        db.add(p)
        positions[name] = p
    db.flush()

    # ── 직원 (3개 로그인 계정 + 추가 HR 전용 인원) ────────────
    employees_data = [
        ("박서준", OWNER_EMAIL,    "010-2000-0001", "경영관리팀", "팀장", "정규직", "재직", date(2019, 9, 1), None, 5500000, "admin"),
        ("김도현", MANAGER_EMAIL,  "010-2000-0002", "경영관리팀", "과장", "정규직", "재직", date(2020, 4, 1), None, 3900000, "accountant"),
        ("이수아", EMPLOYEE_EMAIL,"010-2000-0003", "배송팀",     "사원", "정규직", "재직", date(2022, 7, 4), None, 2800000, "employee"),
        ("정민호", "minho@jeongsung.kr", "010-2000-0004", "제조팀", "과장", "정규직", "재직", date(2021, 3, 2), None, 3600000, "employee"),
        ("한소율", "soyul@jeongsung.kr", "010-2000-0005", "제조팀", "사원", "파트타임", "재직", date(2023, 5, 15), None, 2100000, "employee"),
    ]
    user_links = {"박서준": owner.id, "김도현": manager.id, "이수아": staff.id}
    employees = {}
    for i, (name, email, phone, dept, pos, etype, status, hire, resign, salary, role) in enumerate(employees_data):
        e = Employee(
            business_id=bid, department_id=depts[dept].id, position_id=positions[pos].id,
            user_id=user_links.get(name), role=role,
            name=name, email=email, phone=phone, hire_date=hire, resign_date=resign,
            employment_type=etype, status=status, base_salary=salary,
            bank_name="기업은행", account_number=f"210-45-{i:06d}",
            bank_holder=name, address="경기도 부천시", emergency_name="비상연락처", emergency_phone="010-9000-0000",
        )
        db.add(e)
        employees[name] = e
    db.flush()

    # ── 계약서 ────────────────────────────────────────────────
    for name in ("이수아", "정민호"):
        db.add(Contract(
            business_id=bid, employee_id=employees[name].id, title=f"{name} 근로계약서",
            contract_type="근로계약서", counterparty=name,
            start_date=employees[name].hire_date, end_date=None, amount=0, sign_status="서명완료",
        ))

    # ── 휴가 ──────────────────────────────────────────────────
    for emp_name, ltype, start_off, end_off, days, status in [
        ("이수아", "연차", -15, -14, 2, "승인"),
        ("정민호", "반차(오전)", -6, -6, 0.5, "승인"),
        ("한소율", "연차", 4, 6, 3, "대기"),
    ]:
        db.add(Leave(
            business_id=bid, employee_id=employees[emp_name].id, leave_type=ltype,
            start_date=TODAY + timedelta(days=start_off), end_date=TODAY + timedelta(days=end_off),
            days=days, status=status, reason=f"{ltype} 신청",
        ))

    # ── 급여 (이번 달) ────────────────────────────────────────
    for emp in employees.values():
        base = float(emp.base_salary)
        db.add(Payroll(
            business_id=bid, employee_id=emp.id, pay_year=TODAY.year, pay_month=TODAY.month,
            base_salary=base, overtime_pay=0, bonus=0, meal_allowance=100000, transport_allow=50000,
            other_allowance=0, national_pension=round(base * 0.045, 0), health_insurance=round(base * 0.0354, 0),
            employment_insurance=round(base * 0.009, 0), income_tax=round(base * 0.03, 0),
            local_income_tax=round(base * 0.003, 0), other_deduction=0, advance_payment=0, status="확정",
        ))

    # ── 거래처 ────────────────────────────────────────────────
    vendors_data = [
        ("맘스마켓(주)",   "매출처", "310-11-22222", "정맘스", "김판매", "010-4000-1111", "biz@momsmarket.kr",  "서울 은평구 1", "유통업", 1),
        ("한성농산",       "매입처", "410-22-33333", "박농산", "이구매", "031-200-2222",  "sales@hansung.kr",  "경기 부천시 2", "농산물유통", 1),
        ("청정수산",       "매입처", "510-33-44444", "최수산", "정담당", "032-300-3333",  "cs@cheongjeong.kr", "인천 남동구 3", "수산물유통", 1),
        ("컬리마켓",       "매출처", "610-44-55555", "컬리대", "한파트", "1588-4567",     "partner@kurly.com", "서울 강남구 4", "이커머스", 1),
        ("우리물류(주)",   "매입처", "710-55-66666", "홍물류", "이배송", "010-4000-2222", "cs@woorilogis.kr",  "경기 김포시 5", "물류업", 1),
    ]
    vendors = []
    for name, vtype, bn, ceo, contact_name, contact, email, addr, industry, active in vendors_data:
        v = Vendor(
            business_id=bid, vendor_name=name, vendor_type=vtype, business_number=bn,
            ceo_name=ceo, contact_name=contact_name, contact=contact, email=email,
            address=addr, industry=industry, bank_name="기업은행", account_number="210-78-901234",
            bank_holder=ceo, credit_limit=4000000, payment_terms=30, note="정기 거래처", is_active=active,
        )
        db.add(v)
        vendors.append(v)
    db.flush()

    # ── 은행 거래 (1~7월) ─────────────────────────────────────
    txns = []
    for m in range(1, 8):
        base_rev = 3200000 + m * 220000
        txns += [
            (date(2026, m, 3), "맘스마켓 정산", base_rev, 0, "상품매출"),
            (date(2026, m, 8), "컬리마켓 정산", int(base_rev * 0.6), 0, "상품매출"),
            (date(2026, m, 5), "한성농산 식자재", 0, int(base_rev * 0.35), "상품매입"),
            (date(2026, m, 10), "임차료 (부천 공장)", 0, 1500000, "임차료"),
            (date(2026, m, 15), "직원 급여", 0, 900000, "급여"),
            (date(2026, m, 20), "전기·수도·가스", 0, 210000, "공과금"),
        ]
    for tx_date, desc, dep, wd, cat in txns:
        db.add(BankTransaction(business_id=bid, transaction_date=tx_date, description=desc, deposit=dep, withdrawal=wd, balance=0, category=cat, is_matched=0))

    # ── 카드매출 ──────────────────────────────────────────────
    card_companies = ["신한카드", "국민카드", "삼성카드"]
    for i in range(10):
        d = TODAY - timedelta(days=i * 4)
        db.add(CardSale(
            business_id=bid, card_company=card_companies[i % len(card_companies)],
            approval_no=f"JS{20260000 + i}", approval_date=d, approval_amount=120000 + i * 25000,
            fee_amount=round((120000 + i * 25000) * 0.023, 0), deposit_date=d + timedelta(days=2),
            deposited_at=(d + timedelta(days=2)) if i > 2 else None, status="deposited" if i > 2 else "pending",
        ))

    # ── 미수금 · 미지급금 ─────────────────────────────────────
    for vendor, title, amount, paid, issue_off, due_off, status in [
        (vendors[0], "6월 납품대금", 2800000, 2800000, -40, -10, "완료"),
        (vendors[3], "7월 정산 예정분", 3300000, 0, -5, 20, "미수"),
        (vendors[0], "5월 납품대금 잔액", 1200000, 500000, -50, -20, "일부수금"),
    ]:
        db.add(AccountReceivable(business_id=bid, vendor_id=vendor.id, title=title, amount=amount, paid_amount=paid,
                                  issue_date=TODAY + timedelta(days=issue_off), due_date=TODAY + timedelta(days=due_off), status=status))
    for vendor, title, amount, paid, issue_off, due_off, status in [
        (vendors[1], "6월 식자재 대금", 1800000, 1800000, -35, -5, "완료"),
        (vendors[2], "7월 수산물 대금", 950000, 0, -8, 12, "미지급"),
        (vendors[4], "6월 배송 수수료", 620000, 300000, -20, -3, "일부지급"),
    ]:
        db.add(AccountPayable(business_id=bid, vendor_id=vendor.id, title=title, amount=amount, paid_amount=paid,
                               issue_date=TODAY + timedelta(days=issue_off), due_date=TODAY + timedelta(days=due_off), status=status))

    # ── 세금계산서 ────────────────────────────────────────────
    for vendor, direction, inv_no, off, supply, tax, item_name, status in [
        (vendors[0], "발행", "JS-TX-0601", -12, 2800000, 280000, "반찬 납품", "발행완료"),
        (vendors[1], "수취", "JS-TX-0602", -9, 950000, 95000, "식자재 매입", "발행완료"),
        (vendors[3], "발행", "JS-TX-0603", -1, 1800000, 180000, "온라인 매출", "임시저장"),
    ]:
        db.add(TaxInvoice(business_id=bid, vendor_id=vendor.id, direction=direction, invoice_no=inv_no,
                           issue_date=TODAY + timedelta(days=off), supply_amount=supply, tax_amount=tax,
                           total_amount=supply + tax, item_name=item_name, status=status))

    # ── 견적 · 청구 · 발주 ────────────────────────────────────
    for vendor, doc_type, doc_no, issue_off, due_off, status, items in [
        (vendors[0], "청구서", "JS-INV-0601", -8, 7, "발송", [("7월 정산 수수료", 1, 330000)]),
        (vendors[1], "발주서", "JS-PO-0602", -3, 10, "발송", [("배추(20kg)", 30, 25000), ("고춧가루(5kg)", 10, 42000)]),
    ]:
        supply = sum(q * p for _, q, p in items)
        tax = round(supply * 0.1, 2)
        est = Estimate(business_id=bid, vendor_id=vendor.id, doc_type=doc_type, doc_no=doc_no,
                        issue_date=TODAY + timedelta(days=issue_off), due_date=TODAY + timedelta(days=due_off),
                        supply_amount=supply, tax_amount=tax, total_amount=supply + tax, status=status)
        for name, qty, price in items:
            est.items.append(EstimateItem(item_name=name, quantity=qty, unit_price=price, amount=qty * price))
        db.add(est)

    # ── 예산 ──────────────────────────────────────────────────
    for cat, btype, amount in [("상품매출", "revenue", 6000000), ("상품매입", "expense", 2200000), ("임차료", "expense", 1500000), ("급여", "expense", 900000)]:
        db.add(BudgetItem(business_id=bid, budget_year=TODAY.year, budget_month=TODAY.month, category=cat, btype=btype, amount=amount))

    # ── 생산: 품목 · BOM · 지시서 · 실적 ──────────────────────
    items_data = [
        ("JS-RM-001", "배추(20kg)", "원자재", "포대", 25000, 60, 15, 150),
        ("JS-RM-002", "고춧가루(5kg)", "원자재", "포대", 42000, 25, 8, 80),
        ("JS-RM-003", "멸치액젓(18L)", "원자재", "통", 38000, 10, 5, 40),
        ("JS-PK-001", "포장용기(중)", "소모품", "개", 300, 400, 100, 1000),
        ("JS-FG-001", "포기김치(3kg)", "완제품", "개", 18000, 35, 20, 200),
        ("JS-FG-002", "멸치볶음(500g)", "완제품", "개", 8500, 22, 15, 120),
    ]
    items = {}
    for code, name, itype, unit, price, stock, safety, maxs in items_data:
        it = Item(business_id=bid, item_code=code, item_name=name, item_type=itype, unit=unit,
                   unit_price=price, current_stock=stock, safety_stock=safety, max_stock=maxs, is_active=1)
        db.add(it)
        items[name] = it
    db.flush()

    bom = BOM(business_id=bid, product_id=items["포기김치(3kg)"].id, version="1.0", description="포기김치 표준 레시피")
    bom.lines.append(BOMLine(item_id=items["배추(20kg)"].id, quantity=0.3, unit="포대"))
    bom.lines.append(BOMLine(item_id=items["고춧가루(5kg)"].id, quantity=0.1, unit="포대"))
    bom.lines.append(BOMLine(item_id=items["멸치액젓(18L)"].id, quantity=0.05, unit="통"))
    db.add(bom)
    db.flush()

    for order_no, product, planned, off, status, completed, defect in [
        ("JS-PO-0601", items["포기김치(3kg)"], 80, -10, "완료", 80, 1),
        ("JS-PO-0602", items["멸치볶음(500g)"], 60, -3, "생산중", 30, 0),
        ("JS-PO-0603", items["포기김치(3kg)"], 50, 3, "대기", 0, 0),
    ]:
        o = ProductionOrder(business_id=bid, order_no=order_no, product_id=product.id,
                             bom_id=bom.id if product.id == items["포기김치(3kg)"].id else None,
                             planned_qty=planned, planned_date=TODAY + timedelta(days=off), status=status)
        db.add(o)
        db.flush()
        if completed > 0:
            db.add(ProductionResult(business_id=bid, order_id=o.id, completed_qty=completed, defect_qty=defect,
                                     completed_date=TODAY + timedelta(days=off + 1)))

    for item, log_type, qty, off, note in [
        (items["배추(20kg)"], "입고", 40, -15, "정기 발주"),
        (items["고춧가루(5kg)"], "입고", 15, -15, "정기 발주"),
        (items["포기김치(3kg)"], "조정", -2, -2, "실사 중 파손 확인"),
    ]:
        db.add(InventoryLog(business_id=bid, item_id=item.id, log_type=log_type, quantity=qty, log_date=TODAY + timedelta(days=off), note=note))

    # ── 유통: 차량 · 수주 · 배송 ──────────────────────────────
    vehicles = {}
    for plate, vtype, driver, phone, maxw, active in [
        ("78라1234", "1톤 냉장탑차", "이수아", "010-2000-0003", 1000, 1),
        ("90마5678", "2.5톤 냉장탑차", "정민호", "010-2000-0004", 2500, 1),
    ]:
        v = Vehicle(business_id=bid, plate_no=plate, vehicle_type=vtype, driver_name=driver, driver_phone=phone, max_weight=maxw, is_active=active)
        db.add(v)
        vehicles[plate] = v
    db.flush()

    sales_orders = {}
    for order_no, vendor, order_off, due_off, status, total in [
        ("JS-SO-0601", vendors[0], -10, -3, "완료", 1800000),
        ("JS-SO-0602", vendors[3], -4, 3, "배송중", 1200000),
        ("JS-SO-0603", vendors[0], -1, 5, "접수", 900000),
    ]:
        so = SalesOrder(business_id=bid, vendor_id=vendor.id, order_no=order_no,
                         order_date=TODAY + timedelta(days=order_off), due_date=TODAY + timedelta(days=due_off),
                         status=status, total_amount=total)
        so.items.append(SalesOrderItem(item_name="김치 외 혼합구성", quantity=1, unit_price=total, amount=total))
        db.add(so)
        db.flush()
        sales_orders[order_no] = so

    for so, vehicle, dno, sched_off, done_off, status, fee in [
        (sales_orders["JS-SO-0601"], vehicles["78라1234"], "JS-DL-0601", -5, -4, "완료", 40000),
        (sales_orders["JS-SO-0602"], vehicles["90마5678"], "JS-DL-0602", -1, None, "배송중", 55000),
        (sales_orders["JS-SO-0603"], None, "JS-DL-0603", 4, None, "대기", 0),
    ]:
        db.add(Delivery(
            business_id=bid, sales_order_id=so.id, vehicle_id=vehicle.id if vehicle else None,
            delivery_no=dno, scheduled_date=TODAY + timedelta(days=sched_off),
            completed_date=(TODAY + timedelta(days=done_off)) if done_off is not None else None,
            destination="서울시 은평구 배송지", recipient="수령담당자", recipient_phone="010-6000-0000",
            status=status, delivery_fee=fee,
        ))

    # ── OCR 영수증 ────────────────────────────────────────────
    for vendor_name, total, tax, off, status in [
        ("한성농산", 420000, 38181, -60, "approved"),
        ("청정수산", 310000, 28181, -30, "approved"),
        ("한성농산", 380000, 34545, -9, "approved"),
        ("청정수산", 65000, 5909, -1, "pending"),
    ]:
        issued = TODAY + timedelta(days=off)
        db.add(Receipt(
            business_id=bid, file_path="uploads/sample_receipt.jpg", vendor=vendor_name,
            total_amount=total, tax_amount=tax, issued_at=issued,
            raw_text=f"{vendor_name}\n합계 {total}원", status=status, uploaded_by=owner.id,
            created_at=datetime(issued.year, issued.month, issued.day, 12, 0, 0),
        ))

    # ── 경비 정산 ─────────────────────────────────────────────
    for title, amount, category, status, requester, off in [
        ("거래처 미팅 식대", 55000, "식비", "approved", owner, -20),
        ("사무용품 구입", 32000, "소모품비", "approved", manager, -10),
        ("배송 유류비", 68000, "교통비", "approved", staff, -5),
        ("출장 교통비", 41000, "교통비", "pending", staff, -2),
    ]:
        req_date = TODAY + timedelta(days=off)
        db.add(Expense(
            business_id=bid, title=title, amount=amount, category=category,
            requested_by=requester.id, approved_by=owner.id if status != "pending" else None,
            status=status, requested_at=datetime(req_date.year, req_date.month, req_date.day, 10, 0, 0),
            approved_at=datetime(req_date.year, req_date.month, req_date.day, 10, 0, 0) + timedelta(days=1) if status != "pending" else None,
        ))

    # ── 할 일 ─────────────────────────────────────────────────
    for text_, done in [("7월 부가세 매입세액 확인", False), ("한성농산 정산서 발행", False)]:
        db.add(Todo(business_id=bid, text=text_, done=done))

    db.commit()
    print(f"[OK] 사업장: {biz.business_name} ({biz.business_number})")
    print(f"[OK] 직원 {len(employees_data)}명 / 거래처 {len(vendors_data)}개 / 품목 {len(items_data)}개")
    print("\n로그인 정보 (모두 '정성반찬' 사업장 공유, 권한만 다름):")
    print(f"  [관리자] {OWNER_EMAIL}   / password123  (role=admin)")
    print(f"  [매니저] {MANAGER_EMAIL} / password123  (role=accountant)")
    print(f"  [일반]   {EMPLOYEE_EMAIL} / password123  (role=employee)")


if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_business2(db)
    except Exception as e:
        db.rollback()
        print(f"[오류] {e}")
        raise
    finally:
        db.close()
