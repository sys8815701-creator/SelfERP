"""
자금흐름 예측 (v3.8)
AR/AP 만기일 기반 미래 입출금 예정 현황
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import extract
from datetime import date, timedelta
from typing import Optional
from core.database import get_db
from routers.auth import get_current_business
from models.ar_ap import AccountReceivable, AccountPayable
from models.bank_transaction import BankTransaction
from sqlalchemy import func

router = APIRouter(prefix="/api/accounting/cashflow-forecast", tags=["cashflow-forecast"])


@router.get("/")
def cashflow_forecast(
    weeks: int = 12,   # 예측 기간 (주)
    db: Session = Depends(get_db),
    business=Depends(get_current_business),
):
    """
    미래 자금흐름 예측
    - 미수금(AR) 만기일 기준 예상 수금
    - 미지급금(AP) 만기일 기준 예상 지급
    - 주차별 집계
    """
    bid   = business.id
    today = date.today()
    end   = today + timedelta(weeks=weeks)

    ar_items = db.query(AccountReceivable).filter(
        AccountReceivable.business_id == bid,
        AccountReceivable.status.notin_(["완료", "대손"]),
        AccountReceivable.due_date >= today,
        AccountReceivable.due_date <= end,
    ).all()

    ap_items = db.query(AccountPayable).filter(
        AccountPayable.business_id == bid,
        AccountPayable.status != "완료",
        AccountPayable.due_date >= today,
        AccountPayable.due_date <= end,
    ).all()

    # 주차별 집계
    weekly: dict = {}
    for week in range(weeks):
        wstart = today + timedelta(weeks=week)
        wend   = wstart + timedelta(days=6)
        key    = str(wstart)
        weekly[key] = {
            "week_start":  str(wstart),
            "week_end":    str(min(wend, end)),
            "inflow":      0.0,   # 예상 수금
            "outflow":     0.0,   # 예상 지급
            "inflow_items":  [],
            "outflow_items": [],
        }
        for ar in ar_items:
            if wstart <= ar.due_date <= wend:
                remaining = float(ar.amount) - float(ar.paid_amount)
                weekly[key]["inflow"] += remaining
                weekly[key]["inflow_items"].append({
                    "id":          ar.id,
                    "title":       ar.title,
                    "amount":      remaining,
                    "due_date":    str(ar.due_date),
                    "vendor_name": ar.vendor.vendor_name if ar.vendor else None,
                })
        for ap in ap_items:
            if wstart <= ap.due_date <= wend:
                remaining = float(ap.amount) - float(ap.paid_amount)
                weekly[key]["outflow"] += remaining
                weekly[key]["outflow_items"].append({
                    "id":          ap.id,
                    "title":       ap.title,
                    "amount":      remaining,
                    "due_date":    str(ap.due_date),
                    "vendor_name": ap.vendor.vendor_name if ap.vendor else None,
                })

    # 현재 은행 잔고
    last_tx = db.query(BankTransaction).filter(
        BankTransaction.business_id == bid,
    ).order_by(BankTransaction.transaction_date.desc()).first()
    current_balance = float(last_tx.balance) if last_tx and last_tx.balance else 0.0

    # 누적 잔액 계산
    weeks_list = list(weekly.values())
    running = current_balance
    for w in weeks_list:
        running += w["inflow"] - w["outflow"]
        w["projected_balance"] = running

    total_inflow  = sum(w["inflow"]  for w in weeks_list)
    total_outflow = sum(w["outflow"] for w in weeks_list)

    return {
        "current_balance":   current_balance,
        "forecast_weeks":    weeks,
        "forecast_end":      str(end),
        "total_inflow":      total_inflow,
        "total_outflow":     total_outflow,
        "net_forecast":      total_inflow - total_outflow,
        "projected_balance": current_balance + total_inflow - total_outflow,
        "weekly":            weeks_list,
    }


@router.get("/overdue")
def overdue_summary(
    db: Session = Depends(get_db),
    business=Depends(get_current_business),
):
    """연체 미수금·미지급금 현황"""
    today = date.today()
    bid   = business.id

    ar_overdue = db.query(AccountReceivable).filter(
        AccountReceivable.business_id == bid,
        AccountReceivable.due_date < today,
        AccountReceivable.status.notin_(["완료", "대손"]),
    ).all()

    ap_overdue = db.query(AccountPayable).filter(
        AccountPayable.business_id == bid,
        AccountPayable.due_date < today,
        AccountPayable.status != "완료",
    ).all()

    def days_overdue(d: date) -> int:
        return (today - d).days

    return {
        "ar": [{
            "id": ar.id, "title": ar.title,
            "remaining": float(ar.amount) - float(ar.paid_amount),
            "due_date": str(ar.due_date),
            "days_overdue": days_overdue(ar.due_date),
            "vendor_name": ar.vendor.vendor_name if ar.vendor else None,
        } for ar in ar_overdue],
        "ap": [{
            "id": ap.id, "title": ap.title,
            "remaining": float(ap.amount) - float(ap.paid_amount),
            "due_date": str(ap.due_date),
            "days_overdue": days_overdue(ap.due_date),
            "vendor_name": ap.vendor.vendor_name if ap.vendor else None,
        } for ap in ap_overdue],
        "ar_total": sum(float(ar.amount) - float(ar.paid_amount) for ar in ar_overdue),
        "ap_total": sum(float(ap.amount) - float(ap.paid_amount) for ap in ap_overdue),
    }
