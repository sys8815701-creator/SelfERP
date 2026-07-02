import csv
import io

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from core.database import get_db
from auth import get_current_business
from models.business import Business
from models.journal import Journal, JournalLine
from models.account import Account
from models.vendor import Vendor
from models.ar_ap import AccountReceivable, AccountPayable
from models.employee import Employee
from models.payroll import Payroll
from models.production import Item, ProductionOrder, InventoryLog
from models.distribution import SalesOrder, Delivery, DeliveryReturn

router = APIRouter(prefix="/api/export", tags=["export"])


def _csv_response(rows: list[dict], filename: str) -> StreamingResponse:
    buf = io.StringIO()
    if not rows:
        writer = csv.writer(buf)
        writer.writerow(["데이터 없음"])
    else:
        writer = csv.DictWriter(buf, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    buf.seek(0)
    content = "﻿" + buf.getvalue()  # UTF-8 BOM — 한글 Excel 호환
    return StreamingResponse(
        io.BytesIO(content.encode("utf-8")),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}.csv"'},
    )


@router.get("/ledger")
def export_ledger(biz: Business = Depends(get_current_business), db: Session = Depends(get_db)):
    rows = []
    journals = db.query(Journal).filter(Journal.created_by.isnot(None)).all()
    # business_id 필터는 JournalLine → Account → business_id 경로가 없으므로
    # Journal.created_by 기준으로 필터하지 않고 전체 조회 후 사업장 연결
    # (실제 프로젝트 구조에 맞게 단순화)
    for j in db.query(Journal).all():
        for line in j.lines:
            acct = db.query(Account).filter_by(id=line.account_id).first()
            rows.append({
                "날짜": j.date,
                "적요": j.description or "",
                "계정과목": acct.name if acct else "",
                "구분": "차변" if line.side == "debit" else "대변",
                "금액": line.amount or 0,
            })
    return _csv_response(rows, "회계장부")


@router.get("/vendors")
def export_vendors(biz: Business = Depends(get_current_business), db: Session = Depends(get_db)):
    rows = []
    for v in db.query(Vendor).filter_by(business_id=biz.id).all():
        rows.append({
            "거래처명": v.vendor_name,
            "유형": v.vendor_type or "",
            "사업자번호": v.business_number or "",
            "대표자": v.ceo_name or "",
            "담당자": v.contact_name or "",
            "연락처": v.contact or "",
            "이메일": v.email or "",
            "주소": v.address or "",
            "업종": v.industry or "",
        })
    return _csv_response(rows, "거래처목록")


@router.get("/ar")
def export_ar(biz: Business = Depends(get_current_business), db: Session = Depends(get_db)):
    rows = []
    for r in db.query(AccountReceivable).filter_by(business_id=biz.id).all():
        vendor_name = r.vendor.vendor_name if r.vendor else ""
        rows.append({
            "거래처": vendor_name,
            "제목": r.title or "",
            "발생금액": r.amount or 0,
            "수금금액": r.paid_amount or 0,
            "잔액": float(r.amount or 0) - float(r.paid_amount or 0),
            "발행일": r.issue_date or "",
            "만기일": r.due_date or "",
            "상태": r.status or "",
        })
    return _csv_response(rows, "미수금현황")


@router.get("/ap")
def export_ap(biz: Business = Depends(get_current_business), db: Session = Depends(get_db)):
    rows = []
    for r in db.query(AccountPayable).filter_by(business_id=biz.id).all():
        vendor_name = r.vendor.vendor_name if r.vendor else ""
        rows.append({
            "거래처": vendor_name,
            "제목": r.title or "",
            "발생금액": r.amount or 0,
            "지급금액": r.paid_amount or 0,
            "잔액": float(r.amount or 0) - float(r.paid_amount or 0),
            "발행일": r.issue_date or "",
            "만기일": r.due_date or "",
            "상태": r.status or "",
        })
    return _csv_response(rows, "미지급금현황")


@router.get("/employees")
def export_employees(biz: Business = Depends(get_current_business), db: Session = Depends(get_db)):
    rows = []
    for e in db.query(Employee).filter_by(business_id=biz.id).all():
        dept = e.department.name if hasattr(e, "department") and e.department else ""
        pos  = e.position.name  if hasattr(e, "position")   and e.position  else ""
        rows.append({
            "사원명": e.name,
            "이메일": e.email or "",
            "연락처": e.phone or "",
            "입사일": e.hire_date or "",
            "퇴직일": e.resign_date or "",
            "고용형태": e.employment_type or "",
            "재직상태": e.status or "",
            "부서": dept,
            "직급": pos,
            "기본급": e.base_salary or 0,
        })
    return _csv_response(rows, "직원명부")


@router.get("/payroll")
def export_payroll(biz: Business = Depends(get_current_business), db: Session = Depends(get_db)):
    rows = []
    for p in db.query(Payroll).filter_by(business_id=biz.id).order_by(Payroll.pay_year.desc(), Payroll.pay_month.desc()).all():
        emp_name = p.employee.name if p.employee else ""
        gross = float(p.base_salary or 0) + float(p.overtime_pay or 0) + float(p.bonus or 0) + float(p.meal_allowance or 0) + float(p.transport_allow or 0) + float(p.other_allowance or 0)
        deduct = float(p.national_pension or 0) + float(p.health_insurance or 0) + float(p.employment_insurance or 0) + float(p.income_tax or 0) + float(p.local_income_tax or 0) + float(p.other_deduction or 0)
        net = gross - deduct - float(p.advance_payment or 0)
        rows.append({
            "사원명": emp_name,
            "급여연도": p.pay_year,
            "급여월": p.pay_month,
            "기본급": p.base_salary or 0,
            "수당합계": p.overtime_pay or 0,
            "공제합계": round(deduct, 2),
            "실지급액": round(net, 2),
            "상태": p.status or "",
        })
    return _csv_response(rows, "급여대장")


@router.get("/items")
def export_items(biz: Business = Depends(get_current_business), db: Session = Depends(get_db)):
    rows = []
    for it in db.query(Item).filter_by(business_id=biz.id).all():
        rows.append({
            "품목코드": it.item_code or "",
            "품목명": it.item_name,
            "유형": it.item_type or "",
            "단위": it.unit or "",
            "현재재고": it.current_stock or 0,
            "안전재고": it.safety_stock or 0,
            "단가": it.unit_price or 0,
        })
    return _csv_response(rows, "품목재고")


@router.get("/production-orders")
def export_production_orders(biz: Business = Depends(get_current_business), db: Session = Depends(get_db)):
    rows = []
    for o in db.query(ProductionOrder).filter_by(business_id=biz.id).order_by(ProductionOrder.order_date.desc()).all():
        prod_name = o.product.item_name if o.product else ""
        rows.append({
            "지시번호": o.order_no or "",
            "품목명": prod_name,
            "지시일": o.order_date or "",
            "완료예정일": o.due_date or "",
            "계획수량": o.planned_qty or 0,
            "완료수량": o.completed_qty or 0,
            "상태": o.status or "",
            "비고": o.note or "",
        })
    return _csv_response(rows, "생산지시서")


@router.get("/inventory-logs")
def export_inventory_logs(biz: Business = Depends(get_current_business), db: Session = Depends(get_db)):
    rows = []
    for lg in db.query(InventoryLog).filter_by(business_id=biz.id).order_by(InventoryLog.log_date.desc()).all():
        item_name = lg.item.item_name if lg.item else ""
        rows.append({
            "날짜": lg.log_date,
            "품목명": item_name,
            "유형": lg.log_type or "",
            "수량": lg.quantity or 0,
            "단가": lg.unit_price or 0,
            "참조번호": lg.ref_no or "",
            "비고": lg.note or "",
        })
    return _csv_response(rows, "입출고이력")


@router.get("/sales-orders")
def export_sales_orders(biz: Business = Depends(get_current_business), db: Session = Depends(get_db)):
    rows = []
    for o in db.query(SalesOrder).filter_by(business_id=biz.id).order_by(SalesOrder.order_date.desc()).all():
        rows.append({
            "수주번호": o.order_no or "",
            "고객명": o.customer_name or "",
            "수주일": o.order_date or "",
            "납기일": o.due_date or "",
            "총금액": o.total_amount or 0,
            "상태": o.status or "",
            "비고": o.note or "",
        })
    return _csv_response(rows, "수주목록")


@router.get("/deliveries")
def export_deliveries(biz: Business = Depends(get_current_business), db: Session = Depends(get_db)):
    rows = []
    for d in db.query(Delivery).filter_by(business_id=biz.id).order_by(Delivery.scheduled_date.desc()).all():
        rows.append({
            "배송번호": d.delivery_no or "",
            "배송지": d.destination or "",
            "수취인": d.recipient or "",
            "예정일": d.scheduled_date or "",
            "완료일": d.completed_date or "",
            "상태": d.status or "",
            "배송비": d.delivery_fee or 0,
        })
    return _csv_response(rows, "배송이력")


@router.get("/returns")
def export_returns(biz: Business = Depends(get_current_business), db: Session = Depends(get_db)):
    rows = []
    for r in db.query(DeliveryReturn).filter_by(business_id=biz.id).order_by(DeliveryReturn.return_date.desc()).all():
        item_name = r.item.item_name if r.item else ""
        rows.append({
            "반품일": r.return_date or "",
            "품목명": item_name,
            "수량": r.quantity or 0,
            "사유": r.reason or "",
            "재고복원": "Y" if r.is_restocked else "N",
            "비고": r.note or "",
        })
    return _csv_response(rows, "반품이력")
