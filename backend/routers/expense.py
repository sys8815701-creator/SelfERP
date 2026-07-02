from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from core.database import get_db
from core.deps import get_current_user
from core.socket import sio
from models.expense import Expense
from models.user import User
from schemas.expense import ExpenseCreate, ExpenseResponse
from typing import List
from datetime import datetime

router = APIRouter(prefix="/api/expense", tags=["expense"])


# 경비 목록 조회 (현재 사용자의 경비만)
@router.get("/", response_model=List[ExpenseResponse])
def get_expenses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(Expense)
        .filter(Expense.requested_by == current_user.id)
        .order_by(Expense.requested_at.desc())
        .all()
    )


# 경비 단건 조회
@router.get("/{expense_id}", response_model=ExpenseResponse)
def get_expense(
    expense_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    expense = db.query(Expense).filter(
        Expense.id == expense_id,
        Expense.requested_by == current_user.id,
    ).first()
    if not expense:
        raise HTTPException(status_code=404, detail="경비를 찾을 수 없습니다.")
    return expense


# 경비 신청
@router.post("/", response_model=ExpenseResponse)
def create_expense(
    data: ExpenseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    expense = Expense(
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


# 경비 승인
@router.patch("/{expense_id}/approve", response_model=ExpenseResponse)
async def approve_expense(
    expense_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
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
    })
    return expense


# 경비 반려
@router.patch("/{expense_id}/reject", response_model=ExpenseResponse)
async def reject_expense(
    expense_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
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
    })
    return expense


# 경비 삭제 (본인 것만)
@router.delete("/{expense_id}")
def delete_expense(
    expense_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    expense = db.query(Expense).filter(
        Expense.id == expense_id,
        Expense.requested_by == current_user.id,
    ).first()
    if not expense:
        raise HTTPException(status_code=404, detail="경비를 찾을 수 없습니다.")
    if expense.status not in ("draft", "pending"):
        raise HTTPException(status_code=400, detail="승인된 경비는 삭제할 수 없습니다.")
    db.delete(expense)
    db.commit()
    return {"message": "경비가 삭제되었습니다."}
