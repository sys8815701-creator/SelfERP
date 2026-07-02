from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from pydantic import BaseModel
from typing import Optional, List
from core.database import get_db
from routers.auth import get_current_business
from models.budget import BudgetItem
from models.bank_transaction import BankTransaction
from decimal import Decimal

router = APIRouter(prefix="/api/accounting/budget", tags=["budget"])


class BudgetCreate(BaseModel):
    budget_year:  int
    budget_month: int
    category:     str
    btype:        str = "expense"
    amount:       Decimal
    note:         Optional[str] = None

class BudgetUpdate(BaseModel):
    amount: Optional[Decimal] = None
    note:   Optional[str] = None


@router.get("/")
def list_budgets(
    year:  int,
    month: Optional[int] = None,
    db: Session = Depends(get_db),
    business=Depends(get_current_business),
):
    q = db.query(BudgetItem).filter(
        BudgetItem.business_id == business.id,
        BudgetItem.budget_year == year,
    )
    if month:
        q = q.filter(BudgetItem.budget_month == month)
    return [{ c.name: getattr(b, c.name) for c in b.__table__.columns } for b in q.order_by(BudgetItem.budget_month, BudgetItem.category).all()]


@router.get("/vs-actual")
def budget_vs_actual(
    year:  int,
    month: Optional[int] = None,
    db: Session = Depends(get_db),
    business=Depends(get_current_business),
):
    """예산 vs 실적 비교"""
    bid = business.id

    # 예산 목록
    q = db.query(BudgetItem).filter(BudgetItem.business_id == bid, BudgetItem.budget_year == year)
    if month:
        q = q.filter(BudgetItem.budget_month == month)
    budgets = q.all()

    # 실적: 월별 입금(revenue) / 출금(expense) from BankTransaction
    def actual_revenue(m: int) -> float:
        return float(db.query(func.sum(BankTransaction.deposit)).filter(
            BankTransaction.business_id == bid,
            BankTransaction.deposit > 0,
            extract("year",  BankTransaction.transaction_date) == year,
            extract("month", BankTransaction.transaction_date) == m,
        ).scalar() or 0)

    def actual_expense(m: int) -> float:
        return float(db.query(func.sum(BankTransaction.withdrawal)).filter(
            BankTransaction.business_id == bid,
            BankTransaction.withdrawal > 0,
            extract("year",  BankTransaction.transaction_date) == year,
            extract("month", BankTransaction.transaction_date) == m,
        ).scalar() or 0)

    months = [month] if month else list(range(1, 13))
    monthly = []
    for m in months:
        b_rev  = sum(float(b.amount) for b in budgets if b.budget_month == m and b.btype == "revenue")
        b_exp  = sum(float(b.amount) for b in budgets if b.budget_month == m and b.btype == "expense")
        a_rev  = actual_revenue(m)
        a_exp  = actual_expense(m)
        monthly.append({
            "month":          m,
            "budget_revenue": b_rev,
            "budget_expense": b_exp,
            "actual_revenue": a_rev,
            "actual_expense": a_exp,
            "revenue_rate":   round((a_rev / b_rev * 100), 1) if b_rev > 0 else None,
            "expense_rate":   round((a_exp / b_exp * 100), 1) if b_exp > 0 else None,
        })

    return {
        "year":    year,
        "month":   month,
        "monthly": monthly,
        "items":   [{ c.name: getattr(b, c.name) for c in b.__table__.columns } for b in budgets],
    }


@router.post("/", status_code=201)
def create_budget(
    body: BudgetCreate,
    db: Session = Depends(get_db),
    business=Depends(get_current_business),
):
    existing = db.query(BudgetItem).filter(
        BudgetItem.business_id  == business.id,
        BudgetItem.budget_year  == body.budget_year,
        BudgetItem.budget_month == body.budget_month,
        BudgetItem.category     == body.category,
        BudgetItem.btype        == body.btype,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="해당 월·항목 예산이 이미 존재합니다. 수정을 사용하세요.")
    b = BudgetItem(business_id=business.id, **body.model_dump())
    db.add(b)
    db.commit()
    db.refresh(b)
    return { c.name: getattr(b, c.name) for c in b.__table__.columns }


@router.put("/{bid_id}")
def update_budget(
    bid_id: int,
    body: BudgetUpdate,
    db: Session = Depends(get_db),
    business=Depends(get_current_business),
):
    b = db.query(BudgetItem).filter(
        BudgetItem.id == bid_id,
        BudgetItem.business_id == business.id,
    ).first()
    if not b:
        raise HTTPException(status_code=404, detail="예산 항목을 찾을 수 없습니다.")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(b, k, v)
    db.commit()
    db.refresh(b)
    return { c.name: getattr(b, c.name) for c in b.__table__.columns }


@router.delete("/{bid_id}")
def delete_budget(
    bid_id: int,
    db: Session = Depends(get_db),
    business=Depends(get_current_business),
):
    b = db.query(BudgetItem).filter(
        BudgetItem.id == bid_id,
        BudgetItem.business_id == business.id,
    ).first()
    if not b:
        raise HTTPException(status_code=404, detail="예산 항목을 찾을 수 없습니다.")
    db.delete(b)
    db.commit()
    return {"ok": True}
