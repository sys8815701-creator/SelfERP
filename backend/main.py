from dotenv import load_dotenv
load_dotenv()

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.database import engine, Base, SessionLocal
from core.socket import sio
import socketio
import models
from routers import auth, ledger, ocr, expense, upload, business, dashboard, ai, oauth
from routers import hr
from routers import payroll as payroll_router
from routers import vendor as vendor_router
from routers import ar_ap as ar_ap_router
from routers import statements as statements_router
from routers import tax_invoice as tax_invoice_router
from routers import estimate as estimate_router
from routers import budget as budget_router
from routers import cashflow_forecast as cashflow_forecast_router
from routers import analytics as accounting_analytics_router
from sqlalchemy import text

app = FastAPI(title="Accounting Platform API")

_frontend = os.getenv("FRONTEND_URL", "http://localhost:3000")
_allowed_origins = list({_frontend, "http://localhost:3000"})

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Business-Id", "Accept"],
)

@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    # businesses 테이블에 은행 정보 컬럼 추가 (기존 테이블에 누락 시)
    with engine.connect() as conn:
        for col, ddl in [
            ("bank_name",      "ALTER TABLE businesses ADD COLUMN bank_name VARCHAR(50)"),
            ("account_number", "ALTER TABLE businesses ADD COLUMN account_number VARCHAR(50)"),
            ("bank_holder",    "ALTER TABLE businesses ADD COLUMN bank_holder VARCHAR(100)"),
            ("provider",       "ALTER TABLE users ADD COLUMN provider VARCHAR(20) NULL"),
            ("provider_id",    "ALTER TABLE users ADD COLUMN provider_id VARCHAR(100) NULL"),
            ("password_null",  "ALTER TABLE users MODIFY COLUMN password VARCHAR(255) NULL"),
        ]:
            try:
                conn.execute(text(ddl))
                conn.commit()
            except Exception:
                conn.rollback()  # 이미 존재하면 무시

app.include_router(auth.router)
app.include_router(oauth.router)
app.include_router(ledger.router)
app.include_router(ocr.router)
app.include_router(expense.router)
app.include_router(upload.router)
app.include_router(business.router)
app.include_router(dashboard.router)
app.include_router(ai.router)
app.include_router(hr.router)
app.include_router(payroll_router.router)
app.include_router(vendor_router.router)
app.include_router(ar_ap_router.router)
app.include_router(statements_router.router)
app.include_router(tax_invoice_router.router)
app.include_router(estimate_router.router)
app.include_router(budget_router.router)
app.include_router(cashflow_forecast_router.router)
app.include_router(accounting_analytics_router.router)

@app.get("/")
def root():
    return {"message": "Accounting Platform API 서버 정상 작동 중"}

# Socket.IO 마운트
socket_app = socketio.ASGIApp(sio, app)