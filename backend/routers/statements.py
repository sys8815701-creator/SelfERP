"""
재무제표 자동 생성 라우터
기반 데이터: BankTransaction (입출금) + CardSale (카드매출) + AccountReceivable/Payable (미수금/미지급금)
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import Optional
from datetime import date
from core.database import get_db
from core.deps import get_current_business, get_current_role
from models.business import Business
from models.bank_transaction import BankTransaction
from models.card_sale import CardSale
from models.ar_ap import AccountReceivable, AccountPayable

router = APIRouter(prefix="/api/accounting/statements", tags=["statements"])


def require_admin(
    business: Business = Depends(get_current_business),
    role: str = Depends(get_current_role),
) -> Business:
    """재무제표는 사업장 admin만 열람 가능 (프론트 MENU_ACCESS와 동일한 admin-only 정책)."""
    if role != "admin":
        raise HTTPException(status_code=403, detail="재무제표를 열람할 권한이 없습니다.")
    return business


def _sum(q) -> float:
    return float(q.scalar() or 0)


# ── 손익계산서 ────────────────────────────────────────────────────────────────

@router.get("/income")
def income_statement(
    year:   int,
    month:  Optional[int] = None,
    db:     Session = Depends(get_db),
    business=Depends(require_admin),
):
    """
    손익계산서 (Income Statement)
    - 매출: BankTransaction.deposit (입금) + CardSale.approval_amount
    - 매입비용: BankTransaction.withdrawal (출금) + Expense
    - 소계, 영업이익, 순이익 계산
    """
    bid = business.id

    def bt_filter(q, col_date):
        q = q.filter(BankTransaction.business_id == bid)
        q = q.filter(extract("year", col_date) == year)
        if month:
            q = q.filter(extract("month", col_date) == month)
        return q

    # 매출 (입금)
    revenue_bank = _sum(bt_filter(
        db.query(func.sum(BankTransaction.deposit)).filter(BankTransaction.deposit > 0),
        BankTransaction.transaction_date,
    ))

    # 카드 매출
    cs_q = db.query(func.sum(CardSale.approval_amount)).filter(CardSale.business_id == bid)
    cs_q = cs_q.filter(extract("year", CardSale.approval_date) == year)
    if month:
        cs_q = cs_q.filter(extract("month", CardSale.approval_date) == month)
    revenue_card = _sum(cs_q)

    total_revenue = revenue_bank + revenue_card

    # 비용 (출금)
    expense_bank = _sum(bt_filter(
        db.query(func.sum(BankTransaction.withdrawal)).filter(BankTransaction.withdrawal > 0),
        BankTransaction.transaction_date,
    ))

    total_expense = expense_bank

    operating_profit = total_revenue - total_expense
    net_income       = operating_profit

    # 월별 세부 (연간 조회 시)
    monthly = []
    if not month:
        for m in range(1, 13):
            r = _sum(db.query(func.sum(BankTransaction.deposit)).filter(
                BankTransaction.business_id == bid,
                BankTransaction.deposit > 0,
                extract("year", BankTransaction.transaction_date) == year,
                extract("month", BankTransaction.transaction_date) == m,
            ))
            e = _sum(db.query(func.sum(BankTransaction.withdrawal)).filter(
                BankTransaction.business_id == bid,
                BankTransaction.withdrawal > 0,
                extract("year", BankTransaction.transaction_date) == year,
                extract("month", BankTransaction.transaction_date) == m,
            ))
            monthly.append({"month": m, "revenue": r, "expense": e, "profit": r - e})

    return {
        "year": year, "month": month,
        "revenue":          total_revenue,
        "revenue_bank":     revenue_bank,
        "revenue_card":     revenue_card,
        "total_expense":    total_expense,
        "operating_profit": operating_profit,
        "net_income":       net_income,
        "monthly":          monthly,
    }


# ── 대차대조표 ────────────────────────────────────────────────────────────────

@router.get("/balance-sheet")
def balance_sheet(
    as_of_date: Optional[str] = None,
    db: Session = Depends(get_db),
    business=Depends(require_admin),
):
    """
    대차대조표 (Balance Sheet) - 특정 날짜 기준
    자산 = 부채 + 자본
    """
    bid = business.id
    today = date.today() if not as_of_date else date.fromisoformat(as_of_date)

    # 유동자산: 은행 잔고 (가장 최근 balance)
    last_tx = db.query(BankTransaction).filter(
        BankTransaction.business_id == bid,
        BankTransaction.transaction_date <= today,
    ).order_by(BankTransaction.transaction_date.desc()).first()
    bank_balance = float(last_tx.balance) if last_tx and last_tx.balance else 0.0

    # 미수금 (AR 잔액)
    ar_items = db.query(AccountReceivable).filter(
        AccountReceivable.business_id == bid,
        AccountReceivable.status.notin_(["완료", "대손"]),
    ).all()
    ar_balance = sum(float(i.amount) - float(i.paid_amount) for i in ar_items)

    # 유동자산 합계
    current_assets = bank_balance + ar_balance

    # 부채: 미지급금 (AP 잔액)
    ap_items = db.query(AccountPayable).filter(
        AccountPayable.business_id == bid,
        AccountPayable.status != "완료",
    ).all()
    ap_balance = sum(float(i.amount) - float(i.paid_amount) for i in ap_items)
    current_liabilities = ap_balance

    # 총자산 = 유동자산 (단순화)
    total_assets = current_assets
    total_liabilities = current_liabilities

    # 자본(이익잉여금) — 은행 거래 입출금 누계로 총자산과 독립적으로 산출
    # (bank_balance는 거래별 balance 컬럼, 아래는 deposit-withdrawal 누계이므로
    #  둘이 다르면 실제로 장부 정합성이 깨진 것 — 의미 있는 검증이 됨)
    cum_flow = _sum(db.query(func.sum(BankTransaction.deposit - BankTransaction.withdrawal)).filter(
        BankTransaction.business_id == bid,
        BankTransaction.transaction_date <= today,
    ))
    total_equity = cum_flow + ar_balance - ap_balance

    return {
        "as_of_date": str(today),
        "assets": {
            "current": {
                "bank_balance": bank_balance,
                "ar_balance":   ar_balance,
                "total":        current_assets,
            },
            "total": total_assets,
        },
        "liabilities": {
            "current": {
                "ap_balance": ap_balance,
                "total":      current_liabilities,
            },
            "total": total_liabilities,
        },
        "equity": {
            "total": total_equity,
        },
        "check": abs(total_assets - (total_liabilities + total_equity)) < 1,
    }


# ── 현금흐름표 ────────────────────────────────────────────────────────────────

@router.get("/cash-flow")
def cash_flow(
    year:  int,
    month: Optional[int] = None,
    db:    Session = Depends(get_db),
    business=Depends(require_admin),
):
    """
    현금흐름표: BankTransaction 기반 월별 입출금 흐름
    """
    bid = business.id

    def month_data(m: int):
        inflow = _sum(db.query(func.sum(BankTransaction.deposit)).filter(
            BankTransaction.business_id == bid,
            BankTransaction.deposit > 0,
            extract("year", BankTransaction.transaction_date) == year,
            extract("month", BankTransaction.transaction_date) == m,
        ))
        outflow = _sum(db.query(func.sum(BankTransaction.withdrawal)).filter(
            BankTransaction.business_id == bid,
            BankTransaction.withdrawal > 0,
            extract("year", BankTransaction.transaction_date) == year,
            extract("month", BankTransaction.transaction_date) == m,
        ))
        return {"month": m, "inflow": inflow, "outflow": outflow, "net": inflow - outflow}

    if month:
        data = [month_data(month)]
    else:
        data = [month_data(m) for m in range(1, 13)]

    total_inflow  = sum(d["inflow"]  for d in data)
    total_outflow = sum(d["outflow"] for d in data)

    return {
        "year":           year,
        "month":          month,
        "monthly":        data,
        "total_inflow":   total_inflow,
        "total_outflow":  total_outflow,
        "net_cash_flow":  total_inflow - total_outflow,
    }
