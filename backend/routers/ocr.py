from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from core.database import get_db
from core.deps import get_current_user
from models.receipt import Receipt
from models.user import User
from schemas.receipt import ReceiptResponse
from services.ocr_service import extract_text_from_image
from services.llm_service import suggest_journal_entry
from typing import List
import shutil
import os
from models.journal import Journal, JournalLine
from models.account import Account
from models.bank_transaction import BankTransaction
from models.business import Business
from datetime import date, datetime

router = APIRouter(prefix="/api/ocr", tags=["ocr"])

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


# 영수증 업로드 + OCR 추출
@router.post("/upload", response_model=ReceiptResponse)
async def upload_receipt(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    raw_text = extract_text_from_image(file_path)

    receipt = Receipt(
        file_path=file_path,
        raw_text=raw_text,
        status="pending",
        uploaded_by=current_user.id,
    )
    db.add(receipt)
    db.commit()
    db.refresh(receipt)
    return receipt


# 미처리 영수증 개수 (사이드바 뱃지 — 본인 것만)
@router.get("/pending-count")
def get_pending_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    count = db.query(Receipt).filter(
        Receipt.uploaded_by == current_user.id,
        Receipt.status == "pending",
    ).count()
    return {"count": count}


# 영수증 목록 조회 (본인 것만)
@router.get("/receipts", response_model=List[ReceiptResponse])
def get_receipts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(Receipt).filter(Receipt.uploaded_by == current_user.id).all()


# 영수증 단건 조회
@router.get("/receipts/{receipt_id}", response_model=ReceiptResponse)
def get_receipt(
    receipt_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    receipt = db.query(Receipt).filter(
        Receipt.id == receipt_id,
        Receipt.uploaded_by == current_user.id,
    ).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="영수증을 찾을 수 없습니다.")
    return receipt


# 영수증 삭제
@router.delete("/receipts/{receipt_id}")
def delete_receipt(
    receipt_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    receipt = db.query(Receipt).filter(
        Receipt.id == receipt_id,
        Receipt.uploaded_by == current_user.id,
    ).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="영수증을 찾을 수 없습니다.")
    db.delete(receipt)
    db.commit()
    return {"ok": True}


# AI 분개 제안
@router.post("/receipts/{receipt_id}/suggest-journal")
def suggest_journal(
    receipt_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    receipt = db.query(Receipt).filter(
        Receipt.id == receipt_id,
        Receipt.uploaded_by == current_user.id,
    ).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="영수증을 찾을 수 없습니다.")
    if not receipt.raw_text:
        raise HTTPException(status_code=400, detail="OCR 텍스트가 없습니다.")

    suggestion = suggest_journal_entry(receipt.raw_text)
    return suggestion


# 분개 확정 → 장부 자동 반영
@router.post("/receipts/{receipt_id}/approve-journal")
def approve_journal(
    receipt_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    receipt = db.query(Receipt).filter(
        Receipt.id == receipt_id,
        Receipt.uploaded_by == current_user.id,
    ).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="영수증을 찾을 수 없습니다.")
    if receipt.status == "approved":
        raise HTTPException(status_code=400, detail="이미 승인된 영수증입니다.")
    if not receipt.raw_text:
        raise HTTPException(status_code=400, detail="OCR 텍스트가 없습니다.")

    suggestion = suggest_journal_entry(receipt.raw_text)
    if "error" in suggestion:
        raise HTTPException(status_code=500, detail="LLM 분개 제안 실패")

    debit_account = db.query(Account).filter(
        Account.name == suggestion["debit_account"]
    ).first()
    credit_account = db.query(Account).filter(
        Account.name == suggestion["credit_account"]
    ).first()

    if not debit_account:
        raise HTTPException(status_code=400, detail=f"계정과목을 찾을 수 없습니다: {suggestion['debit_account']}")
    if not credit_account:
        raise HTTPException(status_code=400, detail=f"계정과목을 찾을 수 없습니다: {suggestion['credit_account']}")

    journal = Journal(
        date=date.today(),
        description=suggestion.get("description", ""),
        receipt_id=receipt.id
    )
    db.add(journal)
    db.flush()

    db.add(JournalLine(
        journal_id=journal.id,
        account_id=debit_account.id,
        side="debit",
        amount=suggestion["total_amount"]
    ))
    db.add(JournalLine(
        journal_id=journal.id,
        account_id=credit_account.id,
        side="credit",
        amount=suggestion["total_amount"]
    ))

    receipt.status = "approved"
    receipt.vendor = suggestion.get("vendor")
    receipt.total_amount = suggestion.get("total_amount")
    receipt.tax_amount = suggestion.get("tax_amount", 0)

    # 회계 장부(BankTransaction)에도 반영
    business = db.query(Business).filter(Business.user_id == current_user.id).first()
    if business:
        amount = suggestion.get("total_amount", 0) or 0
        # 대변이 수익/매출 계정이면 수입, 그 외엔 지출
        is_income = any(k in credit_account.name for k in ("매출", "수익", "이자", "임대"))
        tx_date_raw = suggestion.get("issued_at")
        try:
            tx_date = datetime.strptime(tx_date_raw, "%Y-%m-%d").date() if tx_date_raw else date.today()
        except (ValueError, TypeError):
            tx_date = date.today()
        db.add(BankTransaction(
            business_id=business.id,
            transaction_date=tx_date,
            description=suggestion.get("description") or suggestion.get("vendor") or "OCR 자동 등록",
            deposit=amount if is_income else 0,
            withdrawal=0 if is_income else amount,
            category=debit_account.name,
            is_matched=1,
        ))

    db.commit()
    db.refresh(journal)

    return {
        "message": "분개가 장부에 반영되었습니다.",
        "journal_id": journal.id,
        "debit_account": debit_account.name,
        "credit_account": credit_account.name,
        "amount": suggestion["total_amount"],
        "description": suggestion.get("description")
    }
