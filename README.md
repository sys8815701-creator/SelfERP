# SelfERP
### AI 기반 소상공인 자동 장부 및 회계 관리 시스템

> 영수증 OCR 자동 인식 · AI 회계 비서 · 실시간 재무 분석을 하나의 플랫폼에서 제공합니다.

---

## 링크

| 구분 | URL |
|------|-----|
| 홈페이지 | http://localhost:3000 |
| FastAPI 자동 문서 | http://localhost:8000/docs |

---

## 배경

중소벤처기업부의 「2023년 소상공인실태조사」에 따르면, 국내 소상공인 사업체 수는 **596만 1천 개**, 종사자 수는 **955만 1천 명**에 달합니다. 이들 대부분은 별도의 경리 인력 없이 사업주 본인이 카드 매출 전표, 은행 거래 내역, 종이 영수증, 세금계산서 등 다양한 형태의 거래 데이터를 직접 수기로 정리해야 하는 환경에 놓여 있습니다.

이 과정에서 발생하는 구조적 문제는 크게 세 가지입니다.

**첫째, 반복적인 수작업과 높은 오류 발생률입니다.**
형식이 제각각인 거래 데이터를 단일 장부로 통합하려면 항목별 수기 입력이 불가피하며, 이 과정에서 금액 오기재 · 날짜 혼동 · 계정과목 오분류 등의 실수가 빈번하게 발생합니다. 이는 부가세 · 종합소득세 신고 시 가산세 부과로 이어질 수 있어 직접적인 금전적 손실로 이어집니다.

**둘째, 세무 외주 비용의 지속적 발생입니다.**
세무사에게 기장을 의뢰하는 경우 개인사업자 기준 월 8~15만 원, 연간 최대 200만 원 수준의 기장료가 발생합니다. 소상공인 입장에서 이는 적지 않은 고정 지출이며, 자료 준비 시간 또한 별도로 투입해야 합니다.

**셋째, 실시간 재무 파악의 어려움입니다.**
수기 정리 방식에서는 현재 사업의 수익성 · 비용 구조 · 현금 흐름을 즉각적으로 파악하기 어렵습니다. KT Enterprise 보고에 따르면 자영업자 10명 중 7명은 창업 5년 이내에 폐업하며, 한국경제는 자영업자 절반이 3년을 채우지 못한다고 보도한 바 있습니다. 전문가들은 데이터 기반 경영 판단의 부재를 주요 원인 중 하나로 지목합니다.

---

## 수요조사

### 1) 시장 규모
중소벤처기업부 「2023년 소상공인실태조사」 기준, 국내 소상공인 사업체는 **596만 개** 이상이며 관련 종사자는 **955만 명**에 달합니다. 통계청 「2024년 전국사업체조사」에 따르면 전국 사업체 수는 **635만 3,673개**로 전년 대비 1.7% 증가하였으며, 1인 사업체(나홀로 사장)의 증가세가 두드러집니다.

### 2) 기존 서비스의 한계

| 기존 방식 | 주요 한계 |
|-----------|-----------|
| 수기 장부 · 엑셀 | 오류 발생률 높음, 실시간 파악 불가 |
| 세무사 기장 의뢰 | 개인사업자 기준 월 8~15만 원 발생, 자료 준비 부담 별도 |
| 범용 회계 소프트웨어 | 복식부기 지식 전제, 비전문가 진입 장벽 높음 |
| 국세청 홈택스 | 신고 기능 중심, 일상적 장부 관리 기능 부재 |

### 3) AI · 디지털 전환 수요
EY한영이 2024년 국내 기업 재무 · 회계 · 세무 종사자 616명을 대상으로 실시한 설문조사에서 **88%가 재무 및 회계 · 감사 업무에 AI 투자가 필요하다**고 응답하였습니다. 응답자들이 기대하는 AI 적용 분야는 일상적 회계처리 자동화(52%), 결산마감 절차 자동화(45%), 재무 추세 분석 및 예측(40%) 순으로 나타났습니다. 또한 EY한영의 2025년 후속 조사에서는 재무 · 회계 종사자의 **79%가 AI가 회계 투명성 향상에 도움이 된다**고 응답하였으며, 국내 기업의 재무 · 회계 AI 실제 도입률은 2024년 17%에서 2025년 28%로 **11%p 상승**하였습니다.

### 4) 정부 정책 방향과의 부합성
정부는 2026년 소상공인 AI 지원 예산으로 역대 최대 규모인 **5조 4천억 원**을 편성하였으며, AI 도우미 · 디지털 전환 지원을 핵심 사업으로 추진하고 있습니다.

### 5) 핵심 니즈 요약
KDI 연구자료 「소상공인 디지털 전환 현황 및 단계별 추진전략」에 따르면 소상공인의 디지털 기술 수용 의향은 아직 낮으나, 그 배경은 기술 자체에 대한 거부감보다 **복잡한 UI와 높은 진입 장벽**에 기인합니다.

### 참고 문헌
1. [중소벤처기업부 「2023년 소상공인실태조사」](https://www.mss.go.kr/site/smba/ex/bbs/View.do?cbIdx=86&bcIdx=1057002&parentSeq=1057002)
2. [통계청 · 이데일리 「2024년 전국 사업체 수」](http://marketin.edaily.co.kr/News/ReadE?newsId=03188166642303072)
3. [KT Enterprise 「자영업자, 열 명 중 일곱 명은 5년도 못 버텨」](https://enterprise.kt.com/bt/dxstory/1088.do)
4. [한국경제 「자영업자 절반 3년도 못 버틴다」](https://www.hankyung.com/article/2025110286751)
5. [EY한영 「국내 기업 88%, 재무 및 회계·감사 업무에 AI 투자 필요」 (2024)](https://www.ey.com/ko_kr/newsroom/2024/09/ey-korea-news-release-2024-09-02)
6. [EY한영 「재무·회계 종사자 79%, AI가 회계 투명성 향상에 도움」 (2025)](https://www.ey.com/ko_kr/newsroom/2025/08/ey-korea-news-release-2025-08-26)
7. [Biz-Insight 「2026 소상공인 AI 지원 역대 최대 5.4조 원」](https://biz-insight.co.kr/2026-%EC%86%8C%EC%83%81%EA%B3%B5%EC%9D%B8-ai-%EC%A7%80%EC%9B%90-%EC%97%AD%EB%8C%80-%EC%B5%9C%EB%8C%80-5-4%EC%A1%B0-%EC%9B%90-ai-%EB%8F%84%EC%9A%B0%EB%AF%B8%C2%B7%EB%94%94%EC%A7%80%ED%84%B8/)
8. [KDI 경제교육·정보센터 「소상공인 디지털 전환 현황 및 단계별 추진전략」](https://eiec.kdi.re.kr/policy/domesticView.do?ac=0000157356&country=2)
9. [흠택스 「세무기장료, 얼마가 적당할까?」](https://www.heumtax.com/contents/posts/tax-bookkeeping-cost)

---

## 목적

**OCR로 읽은 영수증 → 자동 분개 → 회계장부 반영**

---

## 목표

본 프로젝트는 OCR 기반 자동 데이터 수집, LLM 기반 분개 자동화, 실시간 재무 분석 대시보드를 결합한 통합 회계 관리 시스템 구축을 목표로 합니다.

| 단계 | 목표 |
|------|------|
| 1차 | 영수증 OCR 기반 장부 자동 생성 |
| 2차 | 은행 및 카드 매출 데이터 연동 |
| 3차 | AI 자동 계정과목 분류 |
| 4차 | 부가세 및 손익 관리 |
| 최종 | 소상공인을 위한 AI 회계 ERP 구축<br>영수증 OCR + 카드매출 관리 + 은행 거래관리 + 자동 장부 + 부가세 관리 + AI 회계 비서 + 경영 분석 |

---

## 시스템 구조

```
사용자
   ↓
웹 브라우저
   ↓
Next.js Frontend
   ↓
FastAPI Backend
   ↓
MySQL Database
   ↓
OCR Engine (EasyOCR)
   ↓
AI 분석 엔진 (LLM)
```

---

## 전체 디렉토리 구조

```
accounting-platform/
├── frontend/                                      # Next.js 15 (App Router)
│   ├── public/
│   │   ├── selferp-logo.svg                       # 앱 등록용 1024×1024 로고
│   │   └── selferp-logo.jpg                       # 소셜 로그인 등록용 JPG
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx                         # 루트 레이아웃
│   │   │   ├── page.tsx                           # 랜딩 페이지
│   │   │   ├── globals.css                        # 전역 CSS (테마 변수)
│   │   │   ├── login/page.tsx                     # 로그인 (이메일 + 소셜)
│   │   │   ├── register/page.tsx                  # 회원가입
│   │   │   ├── auth/callback/page.tsx             # OAuth 콜백 처리
│   │   │   └── dashboard/
│   │   │       ├── layout.tsx                     # 대시보드 레이아웃 (사이드바)
│   │   │       ├── page.tsx                       # 대시보드 홈 (AI 회계 비서 위젯)
│   │   │       ├── QuickJournalModal.tsx          # 빠른 거래 추가 모달
│   │   │       ├── ai/page.tsx                    # AI 회계 비서 전용 페이지
│   │   │       ├── analytics/page.tsx             # 경영 분석 (월별 추이, 비용 구성)
│   │   │       ├── business/page.tsx              # 사업자 정보 관리
│   │   │       ├── card/page.tsx                  # 카드 매출 내역
│   │   │       ├── expense/page.tsx               # 경비 정산
│   │   │       ├── help/page.tsx                  # 도움말 (FAQ · 고객 지원)
│   │   │       ├── ledger/page.tsx                # 회계 장부 (거래 내역 + 페이지네이션)
│   │   │       ├── ocr/page.tsx                   # 영수증 OCR 인식
│   │   │       ├── pro/page.tsx                   # Pro 플랜 소개
│   │   │       ├── pro/payment/page.tsx           # 결제 페이지
│   │   │       ├── profile/page.tsx               # 프로필 설정
│   │   │       ├── security/page.tsx              # 보안 설정
│   │   │       ├── settings/page.tsx              # 환경 설정
│   │   │       └── vat/page.tsx                   # 부가세 신고
│   │   ├── components/
│   │   │   ├── Modal.tsx                          # 공통 모달
│   │   │   ├── ThemeToggle.tsx                    # 다크 · 라이트 테마 토글
│   │   │   └── layout/
│   │   │       ├── Header.tsx                     # 상단 헤더
│   │   │       ├── MainLayout.tsx                 # 메인 레이아웃 래퍼
│   │   │       └── Sidebar.tsx                    # 사이드바 네비게이션
│   │   └── lib/
│   │       ├── api.ts                             # axios 인스턴스 (JWT 자동 첨부)
│   │       ├── notif.ts                           # 알림 유틸
│   │       ├── socket.ts                          # Socket.IO 클라이언트
│   │       └── theme.tsx                          # 테마 컨텍스트
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   └── tsconfig.json
│
└── backend/                                       # FastAPI
    ├── main.py                                    # 앱 진입점 (load_dotenv 포함)
    ├── .env.example                               # 환경변수 템플릿
    ├── requirements.txt
    ├── Procfile                                   # Railway 배포용
    ├── seed.py                                    # 초기 데이터 시드
    ├── bank_transactions_sample.csv               # 은행 거래 샘플 데이터
    ├── card_sales_sample.csv                      # 카드 매출 샘플 데이터
    ├── core/
    │   ├── config.py                              # Pydantic Settings
    │   ├── database.py                            # MySQL 연결 (SQLAlchemy)
    │   ├── deps.py                                # 의존성 주입
    │   ├── security.py                            # JWT 발급 · 검증
    │   └── socket.py                              # Socket.IO 서버
    ├── models/                                    # SQLAlchemy ORM
    │   ├── user.py / business.py / journal.py
    │   ├── account.py / receipt.py / expense.py
    │   ├── bank_transaction.py / card_sale.py
    │   ├── vendor.py / todo.py / email_verification.py
    ├── routers/
    │   ├── auth.py                                # 회원가입 · 로그인 · 이메일 인증
    │   ├── oauth.py                               # 카카오 · 구글 소셜 로그인
    │   ├── business.py / dashboard.py / ledger.py
    │   ├── ocr.py / expense.py / ai.py / upload.py
    ├── services/
    │   ├── ocr_service.py                         # EasyOCR 영수증 인식
    │   ├── llm_service.py                         # LLM 분개 자동화
    │   └── journal_service.py                     # 복식부기 로직
    ├── schemas/                                   # Pydantic 스키마
    │   └── user / business / journal / receipt / expense / account / vendor / todo
    └── utils/email.py                             # 이메일 발송
```

---

## 기술 스택

### Frontend
| 기술 | 용도 |
|------|------|
| Next.js 15 (App Router) | 웹 프론트엔드 |
| TypeScript | 타입 안정성 |
| React | UI 컴포넌트 |
| Tailwind CSS | 디자인 |
| Chart.js | 통계 시각화 |
| axios | API 통신 (JWT 인터셉터) |
| Socket.IO Client | 실시간 알림 |

### Backend
| 기술 | 용도 |
|------|------|
| FastAPI | REST API 서버 |
| Python | 비즈니스 로직 |
| Uvicorn | ASGI 서버 실행 |
| SQLAlchemy | ORM |
| MySQL | 데이터베이스 |
| JWT (python-jose) | 인증 |
| bcrypt (passlib) | 비밀번호 암호화 |
| EasyOCR | 영수증 텍스트 인식 |
| YOLO | 영수증 영역 감지 |
| LangChain + OpenAI | LLM 분개 자동화 |
| Socket.IO | 실시간 알림 |
| httpx | OAuth 토큰 교환 |

---

## 주요 기능

### 1) 사용자 관리
- 회원가입 / 로그인 / JWT 인증
- 이메일 인증 기반 가입
- 소셜 로그인 (카카오 · 구글)
- 사업장 등록 (상호명 · 사업자번호 · 대표자명 · 업종 · 업태 · 개업일)

### 2) 영수증 OCR
- 업로드 방식: 휴대폰 촬영 / 파일 업로드 / PDF 업로드
- OCR 추출 항목: 상호명 · 사업자번호 · 거래일시 · 공급가액 · 부가세 · 총금액 · 결제수단
- OCR 결과 수정 가능 / 장부 저장 전 사용자 확인

### 3) 카드매출 관리
- CSV · 엑셀 업로드
- 저장 항목: 카드사 · 승인번호 · 승인일 · 승인금액 · 매입상태 · 입금예정일
- 자동 집계: 일별 · 월별 · 카드사별 매출 / 카드 수수료

### 4) 은행 거래내역 관리
- CSV · 엑셀 업로드
- 저장 항목: 거래일 · 적요 · 입금 · 출금 · 잔액
- 자동 분류: 매출 / 비용 / 대표자 인출 / 대출금 / 기타

### 5) 자동 계정과목 추천
| 거래처 예시 | 추천 계정과목 |
|------------|--------------|
| 한국전력 | 수도광열비 |
| KT / SKT | 통신비 |
| 쿠팡 | 소모품비 |
| 배달의민족 | 매출 |
| 임대료 | 지급임차료 |

### 6) 증빙 자동 매칭
- 중복 등록 방지 / 증빙 누락 방지 / 자동 장부 생성
- e.g. 은행 출금 55,000원 → 영수증 OCR 55,000원 → 자동 연결

### 7) 회계 장부
- 일반전표 (전표번호 · 거래일자 · 거래처 · 계정과목 · 공급가액 · 부가세 · 합계금액 · 결제수단)
- 매출 장부 (매출 조회 · 집계 · 거래처별 조회)
- 비용 장부 (비용 조회 · 집계 · 계정과목별 조회)

### 8) 대시보드
- 실시간 현황: 오늘 매출 · 이번 달 매출 · 이번 달 비용 · 예상 순이익 · 예상 부가세
- 그래프: 월별 매출 · 비용 · 순이익 추이 · 비용 비율 분석

---

## 실시간 처리 구조

본 시스템은 **FastAPI(Python) + Next.js(TypeScript)** 이중 서버 구조로 구성되며, 클라이언트-서버 간 실시간 통신을 위해 **Socket.IO**를 적용하였습니다.

```
사용자 브라우저
  │
  ├─ HTTP 요청 (REST API)
  │    └─ axios 인스턴스 (frontend/src/lib/api.ts)
  │         └─ FastAPI 라우터 (backend/routers/)
  │              └─ SQLAlchemy ORM → MySQL DB
  │
  └─ WebSocket (실시간 이벤트)
       └─ Socket.IO 클라이언트 (frontend/src/lib/socket.ts)
            └─ Socket.IO 서버 (backend/core/socket.py)
```

| 흐름 | 설명 |
|------|------|
| 거래 내역 조회 | REST API 호출 → FastAPI가 MySQL 조회 → JSON 응답. 필터·페이지네이션은 클라이언트에서 처리 |
| 영수증 OCR | 이미지 업로드 → upload.py 저장 → ocr_service.py(EasyOCR) 텍스트 추출 → 구조화 JSON 반환 |
| AI 회계 비서 | /api/ai/chat → llm_service.py LLM 호출 → 실시간 재무 데이터 컨텍스트 삽입 → 답변 생성 |
| 실시간 알림 | 거래 등록·OCR 완료 등 서버 이벤트 → Socket.IO Push 방식으로 즉시 전달 |

---

## JWT 인증 흐름

### 이메일 · 비밀번호 로그인
```
1. 사용자 이메일·비밀번호 입력
2. POST /api/auth/login
3. FastAPI: DB 조회 → bcrypt 검증
4. JWT Access Token 발급 (core/security.py)
5. 프론트엔드: localStorage 저장
6. 이후 요청: axios 인터셉터 → Authorization: Bearer <JWT> 자동 첨부
7. FastAPI: deps.py get_current_user() 토큰 검증 → 요청 처리
```

### 소셜 로그인 (카카오 · 구글)
```
1. 로그인 버튼 클릭 → GET /api/auth/{provider}/login
2. FastAPI: OAuth 인가 URL 생성 → Provider 리다이렉트
3. Provider 인증 완료 → 백엔드 콜백 URL 리다이렉트
   GET /api/auth/{provider}/callback?code=...
4. FastAPI: Authorization Code → Provider Access Token 교환
           → 사용자 정보 조회 → DB 등록 또는 기존 계정 연동
           → 자체 JWT 발급
5. /auth/callback?token=<JWT> 리다이렉트
6. 프론트엔드: URL에서 토큰 추출 → localStorage 저장 → 대시보드 이동
```

### 보안 설계 포인트
- JWT Payload에 `user_id`만 포함하여 민감 정보 노출 최소화
- 카카오 Client Secret 조건부 첨부 (앱 설정에 따라 자동 대응)
- 이메일 인증 완료 후에만 로그인 허용 (`email_verification` 모델 분리)
- Pydantic Settings `extra='forbid'` 설정으로 미등록 환경변수 사용 차단

---

## 프론트 화면 구성

Next.js 15 App Router 기반으로 구성되었으며, 전 페이지 **다크 · 라이트 테마** 전환을 지원합니다.

| 화면 | 경로 | 주요 기능 |
|------|------|-----------|
| 랜딩 | `/` | 서비스 소개, 로그인 유도 |
| 로그인 | `/login` | 이메일 · 소셜 로그인 |
| 회원가입 | `/register` | 이메일 인증 기반 가입 |
| 대시보드 홈 | `/dashboard` | AI 회계 비서 위젯, 요약 수치 |
| AI 회계 비서 | `/dashboard/ai` | 전용 채팅, 빠른 질문 버튼 |
| 회계 장부 | `/dashboard/ledger` | 거래 목록, 기간·유형·카테고리 필터, 10건 페이지네이션 |
| 영수증 OCR | `/dashboard/ocr` | 이미지 업로드 → 자동 추출 → 장부 등록 |
| 경영 분석 | `/dashboard/analytics` | 12개월 바 차트, 비용 구성 비율, 순이익률 KPI |
| 경비 정산 | `/dashboard/expense` | 경비 내역 조회 및 정산 |
| 카드 매출 | `/dashboard/card` | 카드 매출 내역 조회 |
| 부가세 신고 | `/dashboard/vat` | 부가세 집계 및 신고 보조 |
| 사업자 정보 | `/dashboard/business` | 사업자 등록번호 등 기본 정보 |
| 프로필 · 보안 · 설정 | `/dashboard/profile` 외 | 계정 관리, 비밀번호 변경, 테마 설정 |
| Pro 플랜 | `/dashboard/pro` | 유료 기능 소개 및 결제 |

### UI 설계 원칙
- 연노란 배경 + 골드 테두리(`#C49A30`) + 본문 텍스트 색상 일관 적용
- 데이터 없음 상태(Empty State): 전 페이지 수평 · 수직 정중앙 배열
- 인터랙션 요소: `transition: all 0.15s` 기반 부드러운 상태 전환
- 계산기 형태의 전용 SVG 로고: 5개 위치(랜딩 · 로그인 · 회원가입 · 사이드바 · 레이아웃) 일관 적용

---

## AI 탐지 대상

### 1) 영수증 OCR 탐지 항목 (`services/ocr_service.py`)

| 탐지 대상 | 설명 |
|-----------|------|
| 판매점 상호명 | 영수증 상단 매장명 자동 인식 |
| 거래 일시 | 날짜·시간 문자열 추출 및 정규화 |
| 결제 금액 | 합계·부가세·봉사료 등 금액 항목 분리 추출 |
| 결제 수단 | 카드·현금 구분 |
| 품목 내역 | 개별 상품명 및 단가 목록 추출 |

추출된 데이터는 구조화 JSON으로 변환되어 장부에 자동 등록됩니다. 인식 불가 항목은 "인식된 구조화 정보가 없습니다" 안내와 함께 원문 텍스트를 제공합니다.

### 2) AI 회계 비서 탐지 · 분석 항목 (`services/llm_service.py`, `routers/ai.py`)

| 탐지 · 분석 대상 | 예시 질문 |
|-----------------|-----------|
| 매출 증감 이상 | "이번 달 매출이 지난달보다 얼마나 늘었나요?" |
| 비용 과다 항목 | "현재 비용 중 가장 많은 비중을 차지하는 항목은?" |
| 순이익률 저하 위험 | "순이익률을 개선하려면 어떻게 해야 할까요?" |
| 세금 신고 일정 | "부가세 신고 마감일이 언제인가요?" |
| 장기 미수금 여부 | "장기 미수금이 있나요?" |
| 연간 세금 예측 | "올해 예상 세금은 얼마인가요?" |

### 3) 탐지 한계 및 보완 방식
- **OCR**: 이미지 해상도·조명·필기체에 따라 인식률이 저하될 수 있으며, 사용자가 수동으로 수정 후 장부에 등록할 수 있도록 편집 화면을 제공합니다.
- **LLM**: DB에 저장된 실제 거래 데이터 기반으로 답변하되, 세무·법률 판단이 필요한 사안은 전문가 상담을 권고하는 면책 문구를 함께 출력합니다.

---

## 기대 효과

| 효과 | 설명 |
|------|------|
| 회계 업무 자동화 | 영수증 촬영 한 번으로 OCR이 판매점·날짜·금액을 자동 추출하고 장부에 즉시 등록. 수기 입력 반복 작업 제거 |
| AI 회계 조언 | 자연어 질문으로 재무 데이터 기반 전문가 수준 답변. 회계 지식 없어도 즉시 사용 가능 |
| 실시간 재무 파악 | 매출·비용·순이익 KPI 카드 + 12개월 추이 차트로 사업 흐름 즉각 파악 |
| 세무 신고 부담 완화 | 카드매출·은행거래 자동 집계, 부가세 신고 기초 자료 자동 제공 |
| 보안 · 확장성 확보 | JWT 무상태 인증 + 소셜 로그인 + FastAPI 비동기 처리로 접근성·보안·성능 동시 확보 |

---

## 향후 프로젝트 확장 방향

1. **Open Banking 연동** — 실시간 계좌 거래내역 수집
2. **카드사 API 연동** — 실시간 카드 매출 수집
3. **전자 세금계산서 연동**
4. **홈택스 연동** — 매입·매출 자료 자동 수집
5. **세무법령 데이터 자료실 CRUD**

---

## 로컬 실행

### 요구 사항
- Node.js 18+
- Python 3.11+
- MySQL 8.0+

### 백엔드
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# .env 파일에서 DB, SECRET_KEY, OPENAI_API_KEY 등 입력
uvicorn main:app --reload
```

### 프론트엔드
```bash
cd frontend
npm install
# .env.local 파일 생성: NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

---

## 환경변수

| 변수 | 위치 | 설명 |
|------|------|------|
| `NEXT_PUBLIC_API_URL` | frontend `.env.local` | 백엔드 서버 URL |
| `DB_HOST` ~ `DB_NAME` | backend `.env` | MySQL 접속 정보 |
| `SECRET_KEY` | backend `.env` | JWT 서명 키 |
| `OPENAI_API_KEY` | backend `.env` | AI 회계 비서 LLM |
| `KAKAO_CLIENT_ID/SECRET` | backend `.env` | 카카오 OAuth |
| `GOOGLE_CLIENT_ID/SECRET` | backend `.env` | 구글 OAuth |
| `FRONTEND_URL` | backend `.env` | CORS 허용 도메인 |

---

© 2026 SelfERP — 소상공인을 위한 가장 친절한 회계 ERP
