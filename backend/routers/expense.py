from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from core.database import get_db
from core.deps import get_current_user, get_current_business, get_current_role
from core.socket import sio
from models.expense import Expense
from models.user import User
from models.business import Business
from schemas.expense import ExpenseCreate, ExpenseResponse
from typing import List
from datetime import datetime

router = APIRouter(prefix="/api/expense", tags=["expense"])


# 경비 목록 조회 (admin/accountant는 사업장 전체, 일반 직원은 본인 신청건만)
@router.get("/", response_model=List[ExpenseResponse])
def get_expenses(
    current_user: User = Depends(get_current_user),
    business: Business = Depends(get_current_business),
    role: str = Depends(get_current_role),
    db: Session = Depends(get_db),
):
    query = db.query(Expense).filter(Expense.business_id == business.id)
    if role not in ("admin", "accountant"):
        query = query.filter(Expense.requested_by == current_user.id)
    expenses = query.order_by(Expense.requested_at.desc()).all()

    results = []
    for e in expenses:
        r = ExpenseResponse.from_orm(e)
        r.requester_name = e.requested_by_user.name if e.requested_by_user else None
        results.append(r)
    return results


# 경비 단건 조회 (admin/accountant는 사업장 전체, 일반 직원은 본인 신청건만)
@router.get("/{expense_id}", response_model=ExpenseResponse)
def get_expense(
    expense_id: int,
    current_user: User = Depends(get_current_user),
    business: Business = Depends(get_current_business),
    role: str = Depends(get_current_role),
    db: Session = Depends(get_db),
):
    query = db.query(Expense).filter(Expense.id == expense_id, Expense.business_id == business.id)
    if role not in ("admin", "accountant"):
        query = query.filter(Expense.requested_by == current_user.id)
    expense = query.first()
    if not expense:
        raise HTTPException(status_code=404, detail="경비를 찾을 수 없습니다.")
    r = ExpenseResponse.from_orm(expense)
    r.requester_name = expense.requested_by_user.name if expense.requested_by_user else None
    return r


# 경비 신청
@router.post("/", response_model=ExpenseResponse)
def create_expense(
    data: ExpenseCreate,
    current_user: User = Depends(get_current_user),
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    expense = Expense(
        business_id=business.id,
        title=data.title,
        amount=data.amount,
        category=data.category,
        receipt_id=data.receipt_id,
        requested_by=current_user.id,
        status="pending",
        requested_at=datetime.utcnow(),
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


# 경비 승인 (해당 사업장의 관리자/회계담당자만)
@router.patch("/{expense_id}/approve", response_model=ExpenseResponse)
async def approve_expense(
    expense_id: int,
    current_user: User = Depends(get_current_user),
    business: Business = Depends(get_current_business),
    role: str = Depends(get_current_role),
    db: Session = Depends(get_db),
):
    if role not in ("admin", "accountant"):
        raise HTTPException(status_code=403, detail="경비를 승인할 권한이 없습니다.")
    expense = db.query(Expense).filter(
        Expense.id == expense_id,
        Expense.business_id == business.id,
    ).first()
    if not expense:
        raise HTTPException(status_code=404, detail="경비를 찾을 수 없습니다.")
    if expense.status == "approved":
        return expense  # 이미 승인 상태면 그대로 반환

    expense.status      = "approved"
    expense.approved_by = current_user.id
    expense.approved_at = datetime.utcnow()
    db.commit()
    db.refresh(expense)

    await sio.emit("expense_approved", {
        "expense_id": expense.id,
        "title":      expense.title,
        "amount":     float(expense.amount),
        "message":    f"경비 '{expense.title}' 승인되었습니다.",
    }, room=f"business_{business.id}")
    return expense


# 경비 반려 (해당 사업장의 관리자/회계담당자만)
@router.patch("/{expense_id}/reject", response_model=ExpenseResponse)
async def reject_expense(
    expense_id: int,
    current_user: User = Depends(get_current_user),
    business: Business = Depends(get_current_business),
    role: str = Depends(get_current_role),
    db: Session = Depends(get_db),
):
    if role not in ("admin", "accountant"):
        raise HTTPException(status_code=403, detail="경비를 반려할 권한이 없습니다.")
    expense = db.query(Expense).filter(
        Expense.id == expense_id,
        Expense.business_id == business.id,
    ).first()
    if not expense:
        raise HTTPException(status_code=404, detail="경비를 찾을 수 없습니다.")
    if expense.status == "rejected":
        return expense  # 이미 반려 상태면 그대로 반환

    expense.status      = "rejected"
    expense.approved_by = current_user.id
    expense.approved_at = datetime.utcnow()
    db.commit()
    db.refresh(expense)

    await sio.emit("expense_rejected", {
        "expense_id": expense.id,
        "title":      expense.title,
        "message":    f"경비 '{expense.title}' 반려되었습니다.",
    }, room=f"business_{business.id}")
    return expense


# 경비 삭제 (본인 것만)
@router.delete("/{expense_id}")
def delete_expense(
    expense_id: int,
    current_user: User = Depends(get_current_user),
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    expense = db.query(Expense).filter(
        Expense.id == expense_id,
        Expense.requested_by == current_user.id,
        Expense.business_id == business.id,
    ).first()
    if not expense:
        raise HTTPException(status_code=404, detail="경비를 찾을 수 없습니다.")
    if expense.status not in ("draft", "pending"):
        raise HTTPException(status_code=400, detail="승인된 경비는 삭제할 수 없습니다.")
    db.delete(expense)
    db.commit()
    return {"message": "경비가 삭제되었습니다."}
