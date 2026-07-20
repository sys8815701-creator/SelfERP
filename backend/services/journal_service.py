from sqlalchemy.orm import Session
from models.account import Account

TYPE_PREFIX = {"asset": "1", "liability": "2", "equity": "3", "revenue": "4", "expense": "5"}

ASSET_KEYWORDS = ("현금", "예금", "미수금", "받을어음", "선급")
LIABILITY_KEYWORDS = ("미지급", "차입금", "예수금", "지급어음")
REVENUE_KEYWORDS = ("매출", "수익", "이자수익", "임대수익")
EQUITY_KEYWORDS = ("자본금", "이익잉여금")


def classify_account(name: str) -> tuple[str, str]:
    """계정과목명으로부터 (계정 유형, 정상잔액 방향)을 추정한다.
    OCR/LLM이 제안하는 계정과목명은 사전 등록 없이도 자동 생성되어야 하므로,
    account.py 모델의 5대 분류(자산/부채/자본/수익/비용) 키워드로 유형을 판별한다."""
    if any(k in name for k in ASSET_KEYWORDS):
        return "asset", "debit"
    if any(k in name for k in LIABILITY_KEYWORDS):
        return "liability", "credit"
    if any(k in name for k in REVENUE_KEYWORDS):
        return "revenue", "credit"
    if any(k in name for k in EQUITY_KEYWORDS):
        return "equity", "credit"
    return "expense", "debit"


def get_or_create_account(db: Session, name: str) -> Account:
    """이름으로 계정과목을 조회하고, 없으면 자동 생성한다.
    계정과목 관리 화면이 없는 상태에서 LLM이 제안하는 계정과목명이
    accounts 테이블에 존재하지 않아 분개 등록이 실패하는 문제를 막기 위함."""
    account = db.query(Account).filter(Account.name == name).first()
    if account:
        return account

    acc_type, normal_side = classify_account(name)
    prefix = TYPE_PREFIX[acc_type]
    last = (
        db.query(Account)
        .filter(Account.code.like(f"{prefix}%"))
        .order_by(Account.code.desc())
        .first()
    )
    next_code = str(int(last.code) + 1) if last and last.code.isdigit() else f"{prefix}0100"

    account = Account(code=next_code, name=name, type=acc_type, normal_side=normal_side)
    db.add(account)
    db.flush()
    return account
