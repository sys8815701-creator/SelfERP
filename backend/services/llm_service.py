from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from core.config import settings
import json

llm = ChatOpenAI(
    model="gpt-4o",
    api_key=settings.OPENAI_API_KEY,
    temperature=0
)

prompt = PromptTemplate(
    input_variables=["ocr_text"],
    template="""
다음은 영수증 OCR 텍스트입니다:

{ocr_text}

위 영수증을 분석하여 복식부기 분개를 JSON 형식으로 반환하세요.
반드시 아래 형식만 반환하고 다른 텍스트는 포함하지 마세요.

{{
  "vendor": "거래처명",
  "total_amount": 금액(숫자),
  "tax_amount": 부가세(숫자, 없으면 0),
  "issued_at": "YYYY-MM-DD",
  "debit_account": "차변 계정과목",
  "credit_account": "대변 계정과목",
  "description": "거래 설명"
}}

계정과목 예시:
- 식대/음식점 → 복리후생비
- 문구/사무용품 → 소모품비
- 교통/주유 → 차량유지비
- 통신 → 통신비
- 임대료 → 임차료
- 현금 지출 → 대변은 현금
- 카드 지출 → 대변은 미지급금
"""
)

chain = prompt | llm | StrOutputParser()

def suggest_journal_entry(ocr_text: str) -> dict:
    result = chain.invoke({"ocr_text": ocr_text})
    try:
        # ```json ... ``` 형식 제거
        clean = result.strip().replace("```json", "").replace("```", "").strip()
        return json.loads(clean)
    except json.JSONDecodeError:
        return {"error": "LLM 응답 파싱 실패", "raw": result}