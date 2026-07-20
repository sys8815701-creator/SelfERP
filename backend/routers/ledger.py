from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from core.database import get_db
from core.deps import get_current_user, get_current_business
from models.account import Account
from models.business import Business
from models.user import User
from schemas.account import AccountCreate, AccountUpdate, AccountResponse
from typing import List
from models.journal import Journal, JournalLine
from schemas.journal import JournalCreate, JournalResponse
from datetime import date
from sqlalchemy import func

router = APIRouter(prefix="/api/ledger", tags=["ledger"])

# 계정과목 전체 조회 (전 사업장 공통 — 로그인한 사용자면 조회 가능)
@router.get("/accounts", response_model=List[AccountResponse])
def get_accounts(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Account).all()

# 계정과목 단건 조회
@router.get("/accounts/{account_id}", response_model=AccountResponse)
def get_account(account_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="계정과목을 찾을 수 없습니다.")
    return account

# 계정과목 생성 (전 사업장이 공유하는 계정과목표이므로 admin/accountant만 변경 가능)
@router.post("/accounts", response_model=AccountResponse)
def create_account(data: AccountCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in ("admin", "accountant"):
        raise HTTPException(status_code=403, detail="계정과목을 생성할 권한이 없습니다.")
    existing = db.query(Account).filter(Account.code == data.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="이미 존재하는 계정코드입니다.")
    account = Account(**data.model_dump())
    db.add(account)
    db.commit()
    db.refresh(account)
    return account

# 계정과목 수정
@router.put("/accounts/{account_id}", response_model=AccountResponse)
def update_account(account_id: int, data: AccountUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in ("admin", "accountant"):
        raise HTTPException(status_code=403, detail="계정과목을 수정할 권한이 없습니다.")
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="계정과목을 찾을 수 없습니다.")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(account, key, value)
    db.commit()
    db.refresh(account)
    return account

# 계정과목 삭제
@router.delete("/accounts/{account_id}")
def delete_account(account_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in ("admin", "accountant"):
        raise HTTPException(status_code=403, detail="계정과목을 삭제할 권한이 없습니다.")
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="계정과목을 찾을 수 없습니다.")
    db.delete(account)
    db.commit()
    return {"message": "삭제되었습니다."}

# 전표 목록 조회 (활성 사업장 소속만)
@router.get("/journals", response_model=List[JournalResponse])
def get_journals(
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    return db.query(Journal).filter(Journal.business_id == business.id).all()

# 전표 단건 조회
@router.get("/journals/{journal_id}", response_model=JournalResponse)
def get_journal(
    journal_id: int,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    journal = db.query(Journal).filter(Journal.id == journal_id, Journal.business_id == business.id).first()
    if not journal:
        raise HTTPException(status_code=404, detail="전표를 찾을 수 없습니다.")
    return journal

# 전표 생성 (복식부기 검증 포함)
@router.post("/journals", response_model=JournalResponse)
def create_journal(
    data: JournalCreate,
    current_user: User = Depends(get_current_user),
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    # 복식부기 검증 - 차변 합계 == 대변 합계
    debit_total  = sum(l.amount for l in data.lines if l.side == "debit")
    credit_total = sum(l.amount for l in data.lines if l.side == "credit")
    if round(debit_total, 2) != round(credit_total, 2):
        raise HTTPException(
            status_code=400,
            detail=f"차변 합계({debit_total})와 대변 합계({credit_total})가 일치하지 않습니다."
        )

    journal = Journal(
        business_id=business.id,
        created_by=current_user.id,
        date=data.date,
        description=data.description,
    )
    db.add(journal)
    db.flush()  # journal.id 확보

    for line in data.lines:
        journal_line = JournalLine(
            journal_id=journal.id,
            account_id=line.account_id,
            side=line.side,
            amount=line.amount
        )
        db.add(journal_line)

    db.commit()
    db.refresh(journal)
    return journal

# 전표 삭제
@router.delete("/journals/{journal_id}")
def delete_journal(
    journal_id: int,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    journal = db.query(Journal).filter(Journal.id == journal_id, Journal.business_id == business.id).first()
    if not journal:
        raise HTTPException(status_code=404, detail="전표를 찾을 수 없습니다.")
    db.delete(journal)
    db.commit()
    return {"message": "전표가 삭제되었습니다."}

# 시산표 (활성 사업장 소속 전표만 집계)
@router.get("/trial-balance")
def get_trial_balance(
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    accounts = db.query(Account).all()
    result = []
    for account in accounts:
        debit_total = db.query(func.sum(JournalLine.amount)).join(Journal).filter(
            JournalLine.account_id == account.id,
            JournalLine.side == "debit",
            Journal.business_id == business.id,
        ).scalar() or 0

        credit_total = db.query(func.sum(JournalLine.amount)).join(Journal).filter(
            JournalLine.account_id == account.id,
            JournalLine.side == "credit",
            Journal.business_id == business.id,
        ).scalar() or 0

        if debit_total > 0 or credit_total > 0:
            result.append({
                "account_code": account.code,
                "account_name": account.name,
                "debit_total":  float(debit_total),
                "credit_total": float(credit_total),
                "balance":      float(debit_total - credit_total)
            })
    return result

# 손익계산서 (활성 사업장 소속 전표만 집계)
@router.get("/income-statement")
def get_income_statement(
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    def get_balance(account_type, side):
        return db.query(func.sum(JournalLine.amount)).join(Account).join(Journal).filter(
            Account.type == account_type,
            JournalLine.side == side,
            Journal.business_id == business.id,
        ).scalar() or 0

    revenue = float(get_balance("revenue", "credit") - get_balance("revenue", "debit"))
    expense = float(get_balance("expense", "debit") - get_balance("expense", "credit"))

    return {
        "revenue":    revenue,
        "expense":    expense,
        "net_income": revenue - expense
    }

# 재무상태표 (활성 사업장 소속 전표만 집계)
@router.get("/balance-sheet")
def get_balance_sheet(
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    def get_balance(account_type, side):
        return db.query(func.sum(JournalLine.amount)).join(Account).join(Journal).filter(
            Account.type == account_type,
            JournalLine.side == side,
            Journal.business_id == business.id,
        ).scalar() or 0

    assets      = float(get_balance("asset",     "debit")  - get_balance("asset",     "credit"))
    liabilities = float(get_balance("liability", "credit") - get_balance("liability", "debit"))
    equity      = float(get_balance("equity",    "credit") - get_balance("equity",    "debit"))

    return {
        "assets":      assets,
        "liabilities": liabilities,
        "equity":      equity,
        "total_right": liabilities + equity
    }