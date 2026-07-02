"""
원가·수익성 분석 (v3.9)
거래처별·품목별 매출/매입 분석 (세금계산서 + 은행거래 기반)
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import Optional
from datetime import date
from core.database import get_db
from core.deps import get_current_business
from models.tax_invoice import TaxInvoice
from models.bank_transaction import BankTransaction
from models.vendor import Vendor

router = APIRouter(prefix="/api/accounting/analytics", tags=["analytics"])


@router.get("/vendor")
def vendor_analysis(
    year:   int,
    month:  Optional[int] = None,
    db:     Session = Depends(get_db),
    business=Depends(get_current_business),
):
    """거래처별 매출·매입 분석 (세금계산서 기반)"""
    bid = business.id
    q = db.query(TaxInvoice).filter(TaxInvoice.business_id == bid)
    q = q.filter(extract("year", TaxInvoice.issue_date) == year)
    if month:
        q = q.filter(extract("month", TaxInvoice.issue_date) == month)
    invoices = q.all()

    # 거래처별 집계
    vendor_map: dict = {}
    for inv in invoices:
        vid  = inv.vendor_id or 0
        name = inv.vendor.vendor_name if inv.vendor else "미분류"
        if vid not in vendor_map:
            vendor_map[vid] = {"vendor_id": vid, "vendor_name": name, "sales": 0.0, "purchases": 0.0, "sales_tax": 0.0, "purchase_tax": 0.0}
        if inv.direction == "발행":
            vendor_map[vid]["sales"]     += float(inv.supply_amount)
            vendor_map[vid]["sales_tax"] += float(inv.tax_amount)
        else:
            vendor_map[vid]["purchases"]    += float(inv.supply_amount)
            vendor_map[vid]["purchase_tax"] += float(inv.tax_amount)

    result = []
    for v in vendor_map.values():
        v["profit"]       = v["sales"] - v["purchases"]
        v["margin_rate"]  = round(v["profit"] / v["sales"] * 100, 1) if v["sales"] > 0 else None
        result.append(v)

    result.sort(key=lambda x: x["sales"], reverse=True)
    return {"year": year, "month": month, "vendors": result}


@router.get("/monthly-trend")
def monthly_trend(
    year: int,
    db:   Session = Depends(get_db),
    business=Depends(get_current_business),
):
    """월별 매출·매입 추이 + 순이익"""
    bid = business.id
    trend = []
    for m in range(1, 13):
        # 은행 입금 = 매출
        revenue = float(db.query(func.sum(BankTransaction.deposit)).filter(
            BankTransaction.business_id == bid,
            BankTransaction.deposit > 0,
            extract("year",  BankTransaction.transaction_date) == year,
            extract("month", BankTransaction.transaction_date) == m,
        ).scalar() or 0)
        # 은행 출금 = 비용
        expense = float(db.query(func.sum(BankTransaction.withdrawal)).filter(
            BankTransaction.business_id == bid,
            BankTransaction.withdrawal > 0,
            extract("year",  BankTransaction.transaction_date) == year,
            extract("month", BankTransaction.transaction_date) == m,
        ).scalar() or 0)
        # 세금계산서 기반 매출·매입
        tax_sales = float(db.query(func.sum(TaxInvoice.supply_amount)).filter(
            TaxInvoice.business_id == bid,
            TaxInvoice.direction == "발행",
            extract("year",  TaxInvoice.issue_date) == year,
            extract("month", TaxInvoice.issue_date) == m,
        ).scalar() or 0)
        tax_purchases = float(db.query(func.sum(TaxInvoice.supply_amount)).filter(
            TaxInvoice.business_id == bid,
            TaxInvoice.direction == "수취",
            extract("year",  TaxInvoice.issue_date) == year,
            extract("month", TaxInvoice.issue_date) == m,
        ).scalar() or 0)
        trend.append({
            "month":          m,
            "bank_revenue":   revenue,
            "bank_expense":   expense,
            "bank_profit":    revenue - expense,
            "tax_sales":      tax_sales,
            "tax_purchases":  tax_purchases,
            "tax_profit":     tax_sales - tax_purchases,
        })
    return {"year": year, "monthly": trend}


@router.get("/top-vendors")
def top_vendors(
    year:    int,
    top_n:   int = 5,
    db:      Session = Depends(get_db),
    business=Depends(get_current_business),
):
    """상위 거래처 (매출·매입 각 상위 N개)"""
    bid = business.id

    from sqlalchemy import desc
    q = db.query(
        TaxInvoice.vendor_id,
        func.sum(TaxInvoice.supply_amount).label("total"),
        TaxInvoice.direction,
    ).filter(
        TaxInvoice.business_id == bid,
        extract("year", TaxInvoice.issue_date) == year,
        TaxInvoice.vendor_id.isnot(None),
    ).group_by(TaxInvoice.vendor_id, TaxInvoice.direction).all()

    vendors = {v.id: v.vendor_name for v in db.query(Vendor).filter(Vendor.business_id == bid).all()}

    top_sales = sorted([r for r in q if r.direction == "발행"], key=lambda x: float(x.total), reverse=True)[:top_n]
    top_buys  = sorted([r for r in q if r.direction == "수취"],  key=lambda x: float(x.total), reverse=True)[:top_n]

    return {
        "year": year,
        "top_sales":     [{"vendor_id": r.vendor_id, "vendor_name": vendors.get(r.vendor_id, "?"), "amount": float(r.total)} for r in top_sales],
        "top_purchases": [{"vendor_id": r.vendor_id, "vendor_name": vendors.get(r.vendor_id, "?"), "amount": float(r.total)} for r in top_buys],
    }
