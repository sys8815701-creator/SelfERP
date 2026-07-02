from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from core.database import get_db
from models.card_sale import CardSale
from models.bank_transaction import BankTransaction
import pandas as pd
import io

router = APIRouter(prefix="/api/upload", tags=["upload"])

# 카드매출 CSV 업로드
@router.post("/card-sales")
async def upload_card_sales(file: UploadFile = File(...), db: Session = Depends(get_db)):
    contents = await file.read()
    df = pd.read_csv(io.StringIO(contents.decode("utf-8-sig")))

    required_columns = ["card_company", "approval_no", "approval_date", "approval_amount"]
    for col in required_columns:
        if col not in df.columns:
            raise HTTPException(status_code=400, detail=f"필수 컬럼 누락: {col}")

    saved = 0
    for _, row in df.iterrows():
        card_sale = CardSale(
            business_id=1,  # 추후 JWT에서 추출
            card_company=row.get("card_company"),
            approval_no=str(row.get("approval_no")),
            approval_date=pd.to_datetime(row.get("approval_date")).date(),
            approval_amount=float(row.get("approval_amount")),
            fee_amount=float(row.get("fee_amount", 0)),
            deposit_date=pd.to_datetime(row.get("deposit_date")).date() if pd.notna(row.get("deposit_date")) else None,
            status="pending"
        )
        db.add(card_sale)
        saved += 1

    db.commit()
    return {"message": f"카드매출 {saved}건 업로드 완료"}

# 은행거래 CSV 업로드
@router.post("/bank-transactions")
async def upload_bank_transactions(file: UploadFile = File(...), db: Session = Depends(get_db)):
    contents = await file.read()
    df = pd.read_csv(io.StringIO(contents.decode("utf-8-sig")))

    required_columns = ["transaction_date", "description", "deposit", "withdrawal", "balance"]
    for col in required_columns:
        if col not in df.columns:
            raise HTTPException(status_code=400, detail=f"필수 컬럼 누락: {col}")

    saved = 0
    for _, row in df.iterrows():
        transaction = BankTransaction(
            business_id=1,  # 추후 JWT에서 추출
            transaction_date=pd.to_datetime(row.get("transaction_date")).date(),
            description=row.get("description"),
            deposit=float(row.get("deposit", 0)),
            withdrawal=float(row.get("withdrawal", 0)),
            balance=float(row.get("balance", 0)),
            category=row.get("category", "미분류"),
            is_matched=0
        )
        db.add(transaction)
        saved += 1

    db.commit()
    return {"message": f"은행거래 {saved}건 업로드 완료"}

# 카드매출 목록 조회
@router.get("/card-sales")
def get_card_sales(db: Session = Depends(get_db)):
    sales = db.query(CardSale).all()
    return [
        {
            "id": s.id,
            "card_company": s.card_company,
            "approval_no": s.approval_no,
            "approval_date": s.approval_date,
            "approval_amount": float(s.approval_amount),
            "status": s.status
        }
        for s in sales
    ]

# 은행거래 목록 조회
@router.get("/bank-transactions")
def get_bank_transactions(db: Session = Depends(get_db)):
    transactions = db.query(BankTransaction).all()
    return [
        {
            "id": t.id,
            "transaction_date": t.transaction_date,
            "description": t.description,
            "deposit": float(t.deposit),
            "withdrawal": float(t.withdrawal),
            "balance": float(t.balance),
            "category": t.category,
            "is_matched": t.is_matched
        }
        for t in transactions
    ]