from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from core.database import get_db
from core.deps import get_current_user, get_current_business
from models.bank_transaction import BankTransaction
from models.todo import Todo
from models.business import Business
from models.user import User
from schemas.todo import TodoCreate, QuickTransactionCreate
from pydantic import BaseModel
from decimal import Decimal
from datetime import date, datetime
from typing import Optional

class TransactionUpdate(BaseModel):
    description: Optional[str] = None
    transaction_date: Optional[date] = None
    amount: Optional[float] = None
    tx_type: Optional[str] = None   # "income" | "expense"
    category: Optional[str] = None

def _parse_month(month: Optional[str]) -> date:
    """'YYYY-MM' 문자열을 해당 월 1일 date로 변환. 실패 시 오늘 반환."""
    if month:
        try:
            y, m = map(int, month.split("-"))
            return date(y, m, 1)
        except (ValueError, AttributeError):
            pass
    return date.today()

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


# ── KPI 요약 ──────────────────────────────────────────────────────────────────
@router.get("/summary")
def get_summary(
    month: Optional[str] = None,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    today = _parse_month(month)
    cm, cy = today.month, today.year
    pm = cm - 1 if cm > 1 else 12
    py = cy if cm > 1 else cy - 1

    def month_revenue(m, y):
        return float(db.query(func.sum(BankTransaction.deposit)).filter(
            BankTransaction.business_id == business.id,
            BankTransaction.deposit > 0,
            func.month(BankTransaction.transaction_date) == m,
            func.year(BankTransaction.transaction_date) == y,
        ).scalar() or 0)

    def month_expense(m, y):
        return float(db.query(func.sum(BankTransaction.withdrawal)).filter(
            BankTransaction.business_id == business.id,
            BankTransaction.withdrawal > 0,
            func.month(BankTransaction.transaction_date) == m,
            func.year(BankTransaction.transaction_date) == y,
        ).scalar() or 0)

    revenue = month_revenue(cm, cy)
    expense = month_expense(cm, cy)
    prev_revenue = month_revenue(pm, py)
    prev_expense = month_expense(pm, py)

    def pct_change(curr, prev):
        if prev == 0:
            return None
        return round((curr - prev) / prev * 100, 1)

    net = revenue - expense
    prev_net = prev_revenue - prev_expense

    auto_count = db.query(BankTransaction).filter(
        BankTransaction.business_id == business.id,
        func.month(BankTransaction.transaction_date) == cm,
        func.year(BankTransaction.transaction_date) == cy,
    ).count()

    card_count = db.query(BankTransaction).filter(
        BankTransaction.business_id == business.id,
        BankTransaction.deposit > 0,
        func.month(BankTransaction.transaction_date) == cm,
        func.year(BankTransaction.transaction_date) == cy,
    ).count()

    vat_estimate = max(0, round((revenue - expense * 0.1) * 0.1 / 1.1, 0)) if revenue > 0 else 0

    if cm <= 6:
        vat_deadline = date(cy, 7, 25)
        vat_period = f"{cy}년 1기"
    else:
        vat_deadline = date(cy + 1, 1, 25)
        vat_period = f"{cy}년 2기"
    vat_days = (vat_deadline - today).days

    return {
        "month": f"{cy}-{cm:02d}",
        "revenue": revenue,
        "expense": expense,
        "net_income": net,
        "vat_estimate": vat_estimate,
        "vat_period": vat_period,
        "vat_days_until": vat_days,
        "revenue_change_pct": pct_change(revenue, prev_revenue),
        "expense_change_pct": pct_change(expense, prev_expense),
        "net_change_pct": pct_change(net, prev_net),
        "auto_classified_count": auto_count,
        "card_count": card_count,
        "business_name": business.business_name,
        "owner_name": business.owner_name,
    }


# ── 월별 트렌드 (차트) ────────────────────────────────────────────────────────
@router.get("/monthly-trend")
def get_monthly_trend(
    months: int = 12,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    today = date.today()
    result = []
    for i in range(months - 1, -1, -1):
        m = today.month - i
        y = today.year
        while m <= 0:
            m += 12
            y -= 1

        revenue = float(db.query(func.sum(BankTransaction.deposit)).filter(
            BankTransaction.business_id == business.id,
            BankTransaction.deposit > 0,
            func.month(BankTransaction.transaction_date) == m,
            func.year(BankTransaction.transaction_date) == y,
        ).scalar() or 0)

        expense = float(db.query(func.sum(BankTransaction.withdrawal)).filter(
            BankTransaction.business_id == business.id,
            BankTransaction.withdrawal > 0,
            func.month(BankTransaction.transaction_date) == m,
            func.year(BankTransaction.transaction_date) == y,
        ).scalar() or 0)

        result.append({"month": f"{y}-{m:02d}", "revenue": revenue, "expense": expense})

    return result


# ── 최근 거래 ─────────────────────────────────────────────────────────────────
@router.get("/recent-transactions")
def get_recent_transactions(
    limit: int = 20,
    tx_type: str = "all",
    month: Optional[str] = None,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    q = db.query(BankTransaction).filter(BankTransaction.business_id == business.id)
    if tx_type == "income":
        q = q.filter(BankTransaction.deposit > 0)
    elif tx_type == "expense":
        q = q.filter(BankTransaction.withdrawal > 0)
    if month:
        ref = _parse_month(month)
        q = q.filter(
            func.year(BankTransaction.transaction_date) == ref.year,
            func.month(BankTransaction.transaction_date) == ref.month,
        )
    rows = q.order_by(BankTransaction.transaction_date.desc()).limit(limit).all()

    return [
        {
            "id": t.id,
            "date": t.transaction_date.isoformat(),
            "description": t.description,
            "deposit": float(t.deposit),
            "withdrawal": float(t.withdrawal),
            "category": t.category,
            "is_income": float(t.deposit) > 0,
            "amount": float(t.deposit) if float(t.deposit) > 0 else -float(t.withdrawal),
        }
        for t in rows
    ]


# ── 비용 구성 ─────────────────────────────────────────────────────────────────
@router.get("/cost-breakdown")
def get_cost_breakdown(
    month: Optional[str] = None,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    today = _parse_month(month)
    rows = db.query(
        BankTransaction.category,
        func.sum(BankTransaction.withdrawal).label("total"),
    ).filter(
        BankTransaction.business_id == business.id,
        BankTransaction.withdrawal > 0,
        BankTransaction.category.isnot(None),
        func.month(BankTransaction.transaction_date) == today.month,
        func.year(BankTransaction.transaction_date) == today.year,
    ).group_by(BankTransaction.category).order_by(func.sum(BankTransaction.withdrawal).desc()).all()

    total = sum(float(r.total) for r in rows) or 1
    colors = ["#3B82F6", "#FFBE50", "#6B7280", "#8B5CF6", "#10B981", "#EF4444"]
    return [
        {
            "label": r.category,
            "amount": float(r.total),
            "pct": round(float(r.total) / total * 100),
            "color": colors[i % len(colors)],
        }
        for i, r in enumerate(rows)
    ]


# ── 부가세 현황 ───────────────────────────────────────────────────────────────
@router.get("/vat-status")
def get_vat_status(
    business: Business = Depends(get_current_business),
):
    today = date.today()
    if today.month <= 6:
        deadline = date(today.year, 7, 25)
        period = f"{today.year}년 1기"
    else:
        deadline = date(today.year + 1, 1, 25)
        period = f"{today.year}년 2기"

    days_until = (deadline - today).days
    if days_until >= 60:
        progress = 20
    elif days_until <= 15:
        progress = 85
    else:
        progress = 20 + int((60 - days_until) / 45 * 65)

    return {
        "period": period,
        "deadline": deadline.isoformat(),
        "days_until": days_until,
        "progress_pct": progress,
        "checklist": [
            {"label": "매출 자료", "done": True},
            {"label": "매입 자료", "done": True},
            {"label": "공제 항목", "done": days_until < 40},
            {"label": "신고서 작성", "done": days_until < 20},
        ],
    }


# ── 할 일 목록 ────────────────────────────────────────────────────────────────
@router.get("/todos")
def get_todos(
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    todos = (
        db.query(Todo)
        .filter(Todo.business_id == business.id)
        .order_by(Todo.created_at.asc())
        .all()
    )
    return [{"id": t.id, "text": t.text, "done": t.done} for t in todos]


@router.post("/todos")
def create_todo(
    data: TodoCreate,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    todo = Todo(business_id=business.id, text=data.text, done=False)
    db.add(todo)
    db.commit()
    db.refresh(todo)
    return {"id": todo.id, "text": todo.text, "done": todo.done}


@router.patch("/todos/{todo_id}/toggle")
def toggle_todo(
    todo_id: int,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    todo = db.query(Todo).filter(
        Todo.id == todo_id, Todo.business_id == business.id
    ).first()
    if not todo:
        raise HTTPException(status_code=404, detail="항목을 찾을 수 없습니다.")
    todo.done = not todo.done
    db.commit()
    return {"id": todo.id, "text": todo.text, "done": todo.done}


class TodoUpdate(BaseModel):
    text: str

@router.patch("/todos/{todo_id}")
def update_todo(
    todo_id: int,
    data: TodoUpdate,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    todo = db.query(Todo).filter(
        Todo.id == todo_id, Todo.business_id == business.id
    ).first()
    if not todo:
        raise HTTPException(status_code=404, detail="항목을 찾을 수 없습니다.")
    todo.text = data.text
    db.commit()
    return {"id": todo.id, "text": todo.text, "done": todo.done}


@router.delete("/todos/{todo_id}")
def delete_todo(
    todo_id: int,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    todo = db.query(Todo).filter(
        Todo.id == todo_id, Todo.business_id == business.id
    ).first()
    if not todo:
        raise HTTPException(status_code=404, detail="항목을 찾을 수 없습니다.")
    db.delete(todo)
    db.commit()
    return {"ok": True}


# ── 빠른 거래 등록 ────────────────────────────────────────────────────────────
@router.post("/quick-transaction")
def quick_transaction(
    data: QuickTransactionCreate,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    try:
        tx_date = datetime.strptime(data.date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)")

    is_income = data.tx_type == "income"
    txn = BankTransaction(
        business_id=business.id,
        transaction_date=tx_date,
        description=data.description,
        deposit=data.amount if is_income else 0,
        withdrawal=0 if is_income else data.amount,
        balance=0,
        category=data.category or ("상품매출" if is_income else "기타비용"),
        is_matched=0,
    )
    db.add(txn)
    db.commit()
    db.refresh(txn)
    return {
        "id": txn.id,
        "message": "거래가 등록되었습니다.",
        "date": txn.transaction_date.isoformat(),
        "description": txn.description,
        "amount": data.amount,
        "is_income": is_income,
    }


# ── 거래 수정 ─────────────────────────────────────────────────────────────────
@router.patch("/transactions/{tx_id}")
def update_transaction(
    tx_id: int,
    data: TransactionUpdate,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    tx = db.query(BankTransaction).filter(
        BankTransaction.id == tx_id,
        BankTransaction.business_id == business.id,
    ).first()
    if not tx:
        raise HTTPException(status_code=404, detail="거래를 찾을 수 없습니다.")

    if data.description is not None:
        tx.description = data.description
    if data.transaction_date is not None:
        tx.transaction_date = data.transaction_date
    if data.category is not None:
        tx.category = data.category
    if data.amount is not None and data.tx_type is not None:
        is_income = data.tx_type == "income"
        tx.deposit    = Decimal(str(data.amount)) if is_income else Decimal("0")
        tx.withdrawal = Decimal("0") if is_income else Decimal(str(data.amount))

    db.commit()
    db.refresh(tx)
    return {
        "id": tx.id,
        "date": tx.transaction_date.isoformat(),
        "description": tx.description,
        "deposit": float(tx.deposit),
        "withdrawal": float(tx.withdrawal),
        "category": tx.category,
        "is_income": float(tx.deposit) > 0,
        "amount": float(tx.deposit) if float(tx.deposit) > 0 else -float(tx.withdrawal),
    }


# ── 거래 삭제 ─────────────────────────────────────────────────────────────────
@router.delete("/transactions/{tx_id}")
def delete_transaction(
    tx_id: int,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    tx = db.query(BankTransaction).filter(
        BankTransaction.id == tx_id,
        BankTransaction.business_id == business.id,
    ).first()
    if not tx:
        raise HTTPException(status_code=404, detail="거래를 찾을 수 없습니다.")
    db.delete(tx)
    db.commit()
    return {"ok": True}
