from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from core.database import get_db
from core.deps import get_current_business
from core.config import settings
from models.bank_transaction import BankTransaction
from models.business import Business
from schemas.todo import AIChatRequest
from datetime import date

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/chat")
def ai_chat(
    data: AIChatRequest,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    today = date.today()
    cm, cy = today.month, today.year

    revenue = float(db.query(func.sum(BankTransaction.deposit)).filter(
        BankTransaction.business_id == business.id,
        BankTransaction.deposit > 0,
        func.month(BankTransaction.transaction_date) == cm,
        func.year(BankTransaction.transaction_date) == cy,
    ).scalar() or 0)

    expense = float(db.query(func.sum(BankTransaction.withdrawal)).filter(
        BankTransaction.business_id == business.id,
        BankTransaction.withdrawal > 0,
        func.month(BankTransaction.transaction_date) == cm,
        func.year(BankTransaction.transaction_date) == cy,
    ).scalar() or 0)

    try:
        from openai import OpenAI
        client = OpenAI(api_key=settings.OPENAI_API_KEY)

        system_prompt = (
            f"당신은 소상공인 회계 AI 비서입니다. "
            f"사용자의 사업장 '{business.business_name}' ({business.industry})의 회계 데이터를 기반으로 도움을 드립니다.\n"
            f"현재 날짜: {today.year}년 {today.month}월 {today.day}일\n"
            f"이번 달 매출: {revenue:,.0f}원\n"
            f"이번 달 비용: {expense:,.0f}원\n"
            f"순이익: {revenue - expense:,.0f}원\n"
            f"답변은 친근하고 간결하게, 숫자는 한국식 원(₩) 단위로 표기해주세요. 3문장 이내로 핵심만 말씀해주세요."
        )

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": data.message},
            ],
            max_tokens=300,
        )
        reply = response.choices[0].message.content

    except Exception as e:
        # OpenAI 실패 시 규칙 기반 응답
        msg = data.message.lower()
        if "매출" in msg:
            reply = f"이번 달 매출은 {revenue:,.0f}원입니다. 전월 대비 분석을 원하시면 '전월 비교'라고 입력해주세요."
        elif "비용" in msg or "지출" in msg:
            reply = f"이번 달 비용은 {expense:,.0f}원입니다. 주요 지출 항목은 비용 구성 위젯에서 확인하실 수 있어요."
        elif "순이익" in msg or "이익" in msg:
            reply = f"이번 달 순이익은 {revenue - expense:,.0f}원입니다. 꾸준한 관리로 더 늘려봐요!"
        elif "부가세" in msg or "vat" in msg:
            reply = f"예상 부가세는 약 {max(0, (revenue - expense * 0.1) * 0.1 / 1.1):,.0f}원입니다. 매입세액 공제를 잘 활용하세요."
        else:
            reply = f"안녕하세요! {business.business_name} 회계 비서입니다. 매출·비용·부가세 관련 질문에 답변드릴 수 있어요."

    return {"reply": reply}
