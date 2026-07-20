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
from routers import production as production_router
from routers import distribution as distribution_router
from routers import export_csv as export_router
from routers import pending_registration as pending_reg_router
from routers import settings as settings_router
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
            ("bank_name",             "ALTER TABLE businesses ADD COLUMN bank_name VARCHAR(50)"),
            ("account_number",        "ALTER TABLE businesses ADD COLUMN account_number VARCHAR(50)"),
            ("bank_holder",           "ALTER TABLE businesses ADD COLUMN bank_holder VARCHAR(100)"),
            ("provider",              "ALTER TABLE users ADD COLUMN provider VARCHAR(20) NULL"),
            ("provider_id",           "ALTER TABLE users ADD COLUMN provider_id VARCHAR(100) NULL"),
            ("password_null",         "ALTER TABLE users MODIFY COLUMN password VARCHAR(255) NULL"),
            ("consultation_history",  "ALTER TABLE vendors ADD COLUMN consultation_history TEXT"),
            ("vendor_ceo_name",      "ALTER TABLE vendors ADD COLUMN ceo_name VARCHAR(50)"),
            ("vendor_contact_name",  "ALTER TABLE vendors ADD COLUMN contact_name VARCHAR(50)"),
            ("vendor_email",         "ALTER TABLE vendors ADD COLUMN email VARCHAR(100)"),
            ("vendor_address",       "ALTER TABLE vendors ADD COLUMN address VARCHAR(200)"),
            ("vendor_industry",      "ALTER TABLE vendors ADD COLUMN industry VARCHAR(50)"),
            ("vendor_bank_name",     "ALTER TABLE vendors ADD COLUMN bank_name VARCHAR(50)"),
            ("vendor_account_number","ALTER TABLE vendors ADD COLUMN account_number VARCHAR(50)"),
            ("vendor_bank_holder",   "ALTER TABLE vendors ADD COLUMN bank_holder VARCHAR(50)"),
            ("vendor_credit_limit",  "ALTER TABLE vendors ADD COLUMN credit_limit INT DEFAULT 0"),
            ("vendor_payment_terms", "ALTER TABLE vendors ADD COLUMN payment_terms INT DEFAULT 30"),
            ("vendor_note",          "ALTER TABLE vendors ADD COLUMN note TEXT"),
            ("vendor_is_active",     "ALTER TABLE vendors ADD COLUMN is_active INT DEFAULT 1"),
            ("vendor_updated_at",    "ALTER TABLE vendors ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
            ("vendor_created_at",    "ALTER TABLE vendors ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP"),
            ("user_phone",           "ALTER TABLE users ADD COLUMN phone VARCHAR(20) NULL"),
            ("user_dept",            "ALTER TABLE users ADD COLUMN department_name VARCHAR(50) NULL"),
            ("user_pos",             "ALTER TABLE users ADD COLUMN position_name VARCHAR(50) NULL"),
            ("user_empno",           "ALTER TABLE users ADD COLUMN employee_number VARCHAR(30) NULL"),
            ("user_hire",            "ALTER TABLE users ADD COLUMN hire_date VARCHAR(10) NULL"),
            ("user_is_active",       "ALTER TABLE users ADD COLUMN is_active TINYINT DEFAULT 1"),
            ("receipt_business_id",  "ALTER TABLE receipts ADD COLUMN business_id INT NULL"),
            ("expense_business_id",  "ALTER TABLE expenses ADD COLUMN business_id INT NULL"),
            ("business_is_pro",      "ALTER TABLE businesses ADD COLUMN is_pro TINYINT DEFAULT 0"),
            ("journal_business_id",  "ALTER TABLE journals ADD COLUMN business_id INT NULL"),
        ]:
            try:
                conn.execute(text(ddl))
                conn.commit()
            except Exception:
                conn.rollback()  # 이미 존재하면 무시

    # '이지건' 계정 관리자 권한 + 활성 상태 설정
    try:
        with engine.connect() as conn:
            conn.execute(text("UPDATE users SET role='admin', is_active=1 WHERE name='이지건'"))
            conn.commit()
    except Exception:
        pass

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
app.include_router(production_router.router)
app.include_router(distribution_router.router)
app.include_router(export_router.router)
app.include_router(pending_reg_router.router)
app.include_router(settings_router.router)

@app.get("/")
def root():
    return {"message": "Accounting Platform API 서버 정상 작동 중", "version": "v2-cors-fixed"}


@app.get("/debug/version")
def version():
    import os
    return {"version": "v2-cors-fixed", "pid": os.getpid()}

# Socket.IO: FastAPI 내부에 /socket.io 경로로 마운트
# socketio_path=""로 설정해 Starlette가 접두사를 이미 제거한 경로를 처리
app.mount("/socket.io", socketio.ASGIApp(sio, socketio_path=""))