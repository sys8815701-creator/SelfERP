# SelfERP
### AI 기반 소상공인 통합 ERP 시스템

> 영수증 OCR 자동 인식 · AI 회계 비서 · 인사·생산·유통·회계 통합 관리를 하나의 플랫폼에서 제공합니다.

---

## 링크

| 구분 | URL |
|------|-----|
| 홈페이지 | http://localhost:3000 |
| FastAPI 자동 문서 | http://localhost:8002/docs |

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
**인사·생산·유통 업무까지 하나의 플랫폼에서 통합 관리**

---

## 목표

본 프로젝트는 OCR 기반 자동 데이터 수집, LLM 기반 분개 자동화, 실시간 재무 분석 대시보드를 결합한 통합 ERP 시스템 구축을 목표로 합니다.

| 단계 | 목표 |
|------|------|
| 1차 | 영수증 OCR 기반 장부 자동 생성 |
| 2차 | 은행 및 카드 매출 데이터 연동 |
| 3차 | AI 자동 계정과목 분류 |
| 4차 | 부가세 및 손익 관리 |
| 5차 | 인사 · 급여 · 근태 관리 모듈 추가 |
| 6차 | 생산 관리 (품목 · BOM · 생산지시) 모듈 추가 |
| 7차 | 유통 관리 (주문 · 배송 · 경로) 모듈 추가 |
| 8차 | 사업장별 독립 권한 체계(RBAC) 및 멀티테넌시 고도화 |
| 최종 | 소상공인을 위한 AI 통합 ERP — 회계 · 인사 · 생산 · 유통 · 통합관리 전 분야 지원 |

---

## 시스템 구조

```
사용자
   ↓
웹 브라우저
   ↓
Next.js Frontend (port 3000)
   ↓
FastAPI Backend (port 8002)
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
│   │   ├── selferp-logo.svg
│   │   └── selferp-logo.jpg
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                           # 랜딩 페이지
│   │   │   ├── globals.css
│   │   │   ├── login/page.tsx                     # 로그인 (이메일 + 소셜, 역할별 리다이렉트)
│   │   │   ├── register/page.tsx                  # 회원가입
│   │   │   ├── auth/callback/page.tsx             # OAuth 콜백
│   │   │   └── dashboard/
│   │   │       ├── layout.tsx                     # 사이드바 (5개 분야 네비게이션)
│   │   │       ├── page.tsx
│   │   │       ├── QuickJournalModal.tsx
│   │   │       ├── help/page.tsx                  # 도움말 (분야별 빠른 시작 가이드 + FAQ)
│   │   │       ├── developer/page.tsx             # 개발자 콘솔 (플랫폼 관리자 전용)
│   │   │       │
│   │   │       ├── integrated/                    # 통합관리
│   │   │       │   ├── page.tsx                   # 통합 대시보드 (4모듈 KPI)
│   │   │       │   ├── alerts/page.tsx            # 알림 센터
│   │   │       │   ├── accounts/page.tsx          # 계정 관리
│   │   │       │   ├── access/page.tsx            # 권한 관리
│   │   │       │   ├── pending/page.tsx           # 가입 승인 대기
│   │   │       │   └── export/page.tsx            # 데이터 내보내기
│   │   │       │
│   │   │       ├── accounting/                    # 회계
│   │   │       │   ├── page.tsx                   # 회계 대시보드
│   │   │       │   ├── vendors/page.tsx           # 거래처 관리
│   │   │       │   ├── ar-ap/page.tsx             # 매출채권 · 매입채무
│   │   │       │   ├── tax-invoice/page.tsx       # 세금계산서
│   │   │       │   ├── estimates/page.tsx         # 견적서
│   │   │       │   ├── budget/page.tsx            # 예산 관리
│   │   │       │   └── statements/page.tsx        # 재무제표
│   │   │       │
│   │   │       ├── hr/                            # 인사
│   │   │       │   ├── page.tsx                   # 인사 대시보드
│   │   │       │   ├── employees/page.tsx         # 직원 관리
│   │   │       │   ├── leave/page.tsx             # 근태 · 휴가
│   │   │       │   ├── payroll/page.tsx           # 급여 관리
│   │   │       │   ├── departments/page.tsx       # 부서 관리
│   │   │       │   └── contracts/page.tsx         # 계약 관리
│   │   │       │
│   │   │       ├── production/                    # 생산
│   │   │       │   ├── page.tsx                   # 생산 대시보드
│   │   │       │   ├── items/page.tsx             # 품목 관리
│   │   │       │   ├── bom/page.tsx               # BOM 관리
│   │   │       │   ├── orders/page.tsx            # 생산 지시
│   │   │       │   ├── inventory/page.tsx         # 재고 현황
│   │   │       │   ├── results/page.tsx           # 생산 실적
│   │   │       │   ├── cost/page.tsx              # 원가 분석
│   │   │       │   ├── efficiency/page.tsx        # 생산 효율
│   │   │       │   └── audit/page.tsx             # 품질 감사
│   │   │       │
│   │   │       ├── distribution/                  # 유통
│   │   │       │   ├── page.tsx                   # 유통 대시보드
│   │   │       │   ├── orders/page.tsx            # 주문 관리
│   │   │       │   ├── deliveries/page.tsx        # 배송 현황
│   │   │       │   ├── vehicles/page.tsx          # 차량 관리
│   │   │       │   ├── route/page.tsx             # 경로 최적화
│   │   │       │   ├── fee/page.tsx               # 배송비 정산
│   │   │       │   ├── returns/page.tsx           # 반품 관리
│   │   │       │   └── analytics/page.tsx         # 유통 분석
│   │   │       │
│   │   │       ├── ai/page.tsx
│   │   │       ├── analytics/page.tsx
│   │   │       ├── business/page.tsx              # 사업장 관리 (가입 요청 포함)
│   │   │       ├── card/page.tsx
│   │   │       ├── expense/page.tsx
│   │   │       ├── ledger/page.tsx
│   │   │       ├── ocr/page.tsx
│   │   │       ├── vat/page.tsx
│   │   │       ├── profile/page.tsx
│   │   │       ├── security/page.tsx
│   │   │       └── settings/page.tsx
│   │   ├── components/
│   │   │   ├── Modal.tsx
│   │   │   ├── ThemeToggle.tsx
│   │   │   └── layout/
│   │   │       ├── Header.tsx
│   │   │       ├── MainLayout.tsx
│   │   │       └── Sidebar.tsx
│   │   ├── hooks/                                 # 커스텀 훅
│   │   └── lib/
│   │       ├── api.ts
│   │       ├── notif.ts
│   │       ├── socket.ts
│   │       └── theme.tsx
│   ├── .env.local                                 # NEXT_PUBLIC_API_URL=http://localhost:8002
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   └── tsconfig.json
│
└── backend/                                       # FastAPI
    ├── main.py                                    # 앱 진입점 + DB 마이그레이션 + Socket.IO 마운트
    ├── .env.example
    ├── requirements.txt
    ├── Procfile
    ├── core/
    │   ├── config.py
    │   ├── database.py
    │   ├── deps.py                                # get_current_business (승인된 가입요청 포함)
    │   ├── security.py
    │   └── socket.py
    ├── models/
    │   ├── user.py / business.py / journal.py
    │   ├── account.py / receipt.py / expense.py
    │   ├── bank_transaction.py / card_sale.py
    │   ├── vendor.py / todo.py / email_verification.py
    │   ├── business_join_request.py               # 사업장 가입 요청 모델
    │   ├── pending_registration.py                # 가입 대기 모델
    │   └── system_setting.py                      # 시스템 설정 모델
    ├── routers/
    │   ├── auth.py                                # 회원가입 · 로그인 · 이메일 인증
    │   ├── oauth.py                               # 카카오 · 구글 · 네이버 소셜 로그인
    │   ├── business.py                            # 사업장 + 가입 요청 승인 + 직원 생성
    │   ├── platform.py                            # 플랫폼 관리자 전용 — 전체 사업장 현황, PRO 토글
    │   ├── dashboard.py / ledger.py / ocr.py
    │   ├── expense.py / ai.py / upload.py
    │   ├── hr.py                                  # 인사 (직원 · 부서 · 계약 · 근태 · 급여)
    │   ├── payroll.py                             # 급여 처리
    │   ├── vendor.py                              # 거래처 관리
    │   ├── ar_ap.py                               # 매출채권 · 매입채무
    │   ├── statements.py                          # 재무제표
    │   ├── tax_invoice.py                         # 세금계산서
    │   ├── estimate.py                            # 견적서
    │   ├── budget.py                              # 예산
    │   ├── cashflow_forecast.py                   # 현금흐름 예측
    │   ├── analytics.py                           # 회계 분석
    │   ├── production.py                          # 생산 관리
    │   ├── distribution.py                        # 유통 관리
    │   ├── export_csv.py                          # 데이터 내보내기
    │   ├── pending_registration.py                # 가입 대기 관리
    │   └── settings.py                            # 시스템 설정
    ├── services/
    │   ├── ocr_service.py
    │   ├── llm_service.py
    │   └── journal_service.py
    └── schemas/
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
| lucide-react | 아이콘 |

### Backend
| 기술 | 용도 |
|------|------|
| FastAPI | REST API 서버 |
| Python | 비즈니스 로직 |
| Uvicorn | ASGI 서버 실행 |
| SQLAlchemy | ORM |
| MySQL 8.4 | 데이터베이스 |
| JWT (python-jose) | 인증 |
| bcrypt (passlib) | 비밀번호 암호화 |
| EasyOCR | 영수증 텍스트 인식 |
| YOLO | 영수증 영역 감지 |
| LangChain + OpenAI | LLM 분개 자동화 |
| Socket.IO | 실시간 알림 (FastAPI 내 /socket.io 마운트) |
| httpx | OAuth 토큰 교환 |

---

## 주요 기능

### 통합관리
- **통합 대시보드** — 회계·인사·생산·유통 전 분야 KPI 한눈에 파악
- **알림 센터** — 미처리 알림, 직원 가입 승인 요청 실시간 확인
- **권한 관리** — 사업장별로 독립된 메뉴 접근 권한 매트릭스 설정 (admin · accountant · employee), 한 사업장의 설정 변경이 다른 사업장에 영향을 주지 않음
- **계정 관리** — 사업장 구성원 계정 일괄 관리
- **데이터 내보내기** — 전체 데이터 CSV 일괄 다운로드
- **개발자 콘솔** — 사업장 소속과 무관한 플랫폼 운영 계정 전용, 전체 사업장 현황·개인 계정 승인·신규 사업장 승인을 한 화면에서 관리

### 회계
- **영수증 OCR** — 촬영 · 업로드 → EasyOCR 텍스트 추출 → AI 자동 분개
- **회계 장부** — 전표 조회, 기간·유형·계정과목 필터, 페이지네이션
- **AI 회계 비서** — 실시간 재무 데이터 기반 자연어 Q&A
- **부가세 신고** — D-day 카운트다운, 신고 체크리스트, 예상 납부세액
- **거래처 관리** — 공급업체·고객사 등록, 거래 이력 관리
- **세금계산서 · 견적서** — 발행 및 관리
- **예산 관리 · 재무제표** — 예산 집행률, 손익·대차 분석
- **매출채권 · 매입채무** — 미수금 · 미지급금 추적

### 인사
- **직원 관리** — 등록, 역할·부서 배정, 상태 관리
- **근태 · 휴가** — 출결 현황, 휴가 신청 및 승인 워크플로
- **급여 처리** — 월별 급여 계산, 지급 내역 관리
- **부서 관리** — 조직도 구성
- **계약 관리** — 근로계약서 등록 및 만료 알림

### 생산
- **품목 관리** — 제품·원자재 등록 및 분류
- **BOM(Bill of Materials)** — 제품 구성 자재 목록 설정
- **생산 지시** — 작업 계획 등록, 진행 현황 추적
- **재고 현황** — 입출고 이력, 현재 재고 수준
- **생산 실적 · 원가 분석 · 품질 감사** — 생산성 지표 관리

### 유통
- **주문 처리** — 발주서·수주서 생성 및 상태 관리
- **배송 현황** — 배송 진행 상태 실시간 추적
- **차량 · 경로 관리** — 배송 차량 등록, AI 기반 경로 최적화
- **배송비 정산** — 운임 자동 계산 및 정산
- **반품 관리** — 반품 접수 및 처리 이력
- **유통 분석** — 채널별·지역별 물류 성과 분석

### 사용자 인증
- 이메일 인증 기반 회원가입 / 소셜 로그인 (카카오 · 구글 · 네이버)
- JWT 무상태 인증 + axios 인터셉터 자동 첨부
- **역할별 로그인 리다이렉트** — admin/accountant → 통합 대시보드, employee → 알림 센터
- **사업장 가입 요청** — 직원이 기존 사업장에 참여 요청 → 관리자 승인 시 Employee 자동 생성
- **사업장 단위 권한 격리** — 역할(admin · accountant · employee)이 계정 전역이 아닌 사업장 소속 기준으로 매 요청마다 재계산되어, 한 사업장의 관리자가 다른 사업장 데이터에 접근할 수 없음
- **본인 기록 한정 조회** — employee 역할은 휴가 · 급여 · 계약서 · 인사정보에서 본인 데이터만 조회 가능하며, 급여 · 계좌 등 민감정보는 타인 기록 조회 시 자동으로 비공개 처리

---

## 실시간 처리 구조

```
사용자 브라우저
  │
  ├─ HTTP 요청 (REST API)
  │    └─ axios (frontend/src/lib/api.ts)
  │         └─ FastAPI 라우터 (backend/routers/)
  │              └─ SQLAlchemy ORM → MySQL DB
  │
  └─ WebSocket (실시간 이벤트)
       └─ Socket.IO 클라이언트 (frontend/src/lib/socket.ts)
            └─ Socket.IO 서버 (backend/core/socket.py)
                 └─ FastAPI 내 /socket.io 경로에 마운트
```

---

## JWT 인증 흐름

### 이메일 · 비밀번호 로그인
```
1. 사용자 이메일·비밀번호 입력
2. POST /api/auth/login
3. FastAPI: DB 조회 → bcrypt 검증
4. JWT Access Token 발급
5. 프론트엔드: localStorage 저장
6. 이후 요청: Authorization: Bearer <JWT> 자동 첨부
7. FastAPI: get_current_user() 토큰 검증 → 요청 처리
```

### 소셜 로그인 (카카오 · 구글 · 네이버)
```
1. 로그인 버튼 클릭 → GET /api/auth/{provider}/login
2. FastAPI: OAuth 인가 URL 생성 → Provider 리다이렉트
3. Provider 인증 완료 → 백엔드 콜백 리다이렉트
4. FastAPI: Authorization Code → Access Token 교환
           → 사용자 정보 조회 → DB 등록 또는 기존 계정 연동
           → 자체 JWT 발급
5. /auth/callback?token=<JWT> 리다이렉트
6. 프론트엔드: 토큰 추출 → localStorage 저장 → 대시보드 이동
```

---

## 프론트 화면 구성

Next.js 15 App Router 기반, 전 페이지 **다크 · 라이트 테마** 지원.

### 통합관리
| 화면 | 경로 | 주요 기능 |
|------|------|-----------|
| 통합 대시보드 | `/dashboard/integrated` | 4개 분야 KPI 요약, 알림 배너 |
| 알림 센터 | `/dashboard/integrated/alerts` | 미처리 알림, 가입 승인 요청 |
| 계정 관리 | `/dashboard/integrated/accounts` | 구성원 계정 관리 |
| 권한 관리 | `/dashboard/integrated/access` | 역할·권한 설정 |
| 가입 대기 | `/dashboard/integrated/pending` | 사업장 가입 요청 대기 목록 |
| 데이터 내보내기 | `/dashboard/integrated/export` | CSV 일괄 다운로드 |
| 개발자 콘솔 | `/dashboard/developer` | 전체 사업장 현황, 개인 계정 · 신규 사업장 승인 (플랫폼 관리자 전용) |

### 회계
| 화면 | 경로 | 주요 기능 |
|------|------|-----------|
| 회계 대시보드 | `/dashboard/accounting` | 매출·비용·순이익 KPI |
| 거래처 관리 | `/dashboard/accounting/vendors` | 공급업체·고객사 관리 |
| 매출채권·매입채무 | `/dashboard/accounting/ar-ap` | 미수금·미지급금 |
| 세금계산서 | `/dashboard/accounting/tax-invoice` | 발행·관리 |
| 견적서 | `/dashboard/accounting/estimates` | 견적 발행 |
| 예산 관리 | `/dashboard/accounting/budget` | 예산 집행률 |
| 재무제표 | `/dashboard/accounting/statements` | 손익·대차 분석 |
| AI 회계 비서 | `/dashboard/ai` | 자연어 재무 Q&A |
| 회계 장부 | `/dashboard/ledger` | 거래 내역 조회 |
| 영수증 OCR | `/dashboard/ocr` | 영수증 자동 인식 |
| 부가세 신고 | `/dashboard/vat` | 신고 체크리스트 |

### 인사
| 화면 | 경로 | 주요 기능 |
|------|------|-----------|
| 인사 대시보드 | `/dashboard/hr` | 인사 현황 요약 |
| 직원 관리 | `/dashboard/hr/employees` | 직원 등록·조회 |
| 근태·휴가 | `/dashboard/hr/leave` | 출결·휴가 관리 |
| 급여 관리 | `/dashboard/hr/payroll` | 급여 계산·지급 |
| 부서 관리 | `/dashboard/hr/departments` | 조직 구성 |
| 계약 관리 | `/dashboard/hr/contracts` | 근로계약 관리 |

### 생산
| 화면 | 경로 | 주요 기능 |
|------|------|-----------|
| 생산 대시보드 | `/dashboard/production` | 생산 현황 요약 |
| 품목 관리 | `/dashboard/production/items` | 제품·원자재 등록 |
| BOM 관리 | `/dashboard/production/bom` | 자재 구성표 |
| 생산 지시 | `/dashboard/production/orders` | 작업 지시·추적 |
| 재고 현황 | `/dashboard/production/inventory` | 입출고·재고 |
| 생산 실적 | `/dashboard/production/results` | 실적 분석 |
| 원가 분석 | `/dashboard/production/cost` | 단위 원가 계산 |
| 생산 효율 | `/dashboard/production/efficiency` | 가동률·불량률 |
| 품질 감사 | `/dashboard/production/audit` | 품질 검사 이력 |

### 유통
| 화면 | 경로 | 주요 기능 |
|------|------|-----------|
| 유통 대시보드 | `/dashboard/distribution` | 물류 현황 요약 |
| 주문 관리 | `/dashboard/distribution/orders` | 발주·수주 처리 |
| 배송 현황 | `/dashboard/distribution/deliveries` | 배송 추적 |
| 차량 관리 | `/dashboard/distribution/vehicles` | 배송 차량 등록 |
| 경로 최적화 | `/dashboard/distribution/route` | AI 경로 제안 |
| 배송비 정산 | `/dashboard/distribution/fee` | 운임 정산 |
| 반품 관리 | `/dashboard/distribution/returns` | 반품 처리 |
| 유통 분석 | `/dashboard/distribution/analytics` | 물류 성과 분석 |

### 설정 · 계정
| 화면 | 경로 | 주요 기능 |
|------|------|-----------|
| 사업장 관리 | `/dashboard/business` | 사업장 정보, 가입 요청 |
| 프로필 | `/dashboard/profile` | 계정 정보, 사진 |
| 보안 설정 | `/dashboard/security` | 비밀번호 변경 |
| 환경 설정 | `/dashboard/settings` | 테마, 알림 설정 |
| 도움말 | `/dashboard/help` | 분야별 빠른 시작 가이드 + FAQ |
| Pro 플랜 | `/dashboard/pro` | 유료 기능 소개 |

---

## UI 설계 원칙

- 연노란 배경 + 골드 테두리(`#C49A30`) + 일관된 텍스트 색상
- 분야별 색상 — 통합관리 분홍 · 회계 황금 · 인사 파랑 · 생산 초록 · 유통 보라
- 버튼·뱃지: `rgba(R,G,B,0.12)` 배경 + `rgba(R,G,B,0.40)` 테두리
- 데이터 없음(Empty State): 전 페이지 수평·수직 중앙 정렬
- 인터랙션: `transition: all 0.15s` 부드러운 상태 전환
- 계산기 형태 전용 SVG 로고 일관 적용

---

## AI 탐지 대상

### 1) 영수증 OCR (`services/ocr_service.py`)

| 탐지 대상 | 설명 |
|-----------|------|
| 판매점 상호명 | 영수증 상단 매장명 자동 인식 |
| 거래 일시 | 날짜·시간 문자열 추출 및 정규화 |
| 결제 금액 | 합계·부가세·봉사료 등 금액 항목 분리 추출 |
| 결제 수단 | 카드·현금 구분 |
| 품목 내역 | 개별 상품명 및 단가 목록 추출 |

### 2) AI 회계 비서 (`services/llm_service.py`, `routers/ai.py`)

| 탐지 · 분석 대상 | 예시 질문 |
|-----------------|-----------|
| 매출 증감 이상 | "이번 달 매출이 지난달보다 얼마나 늘었나요?" |
| 비용 과다 항목 | "현재 비용 중 가장 많은 비중을 차지하는 항목은?" |
| 순이익률 저하 위험 | "순이익률을 개선하려면 어떻게 해야 할까요?" |
| 세금 신고 일정 | "부가세 신고 마감일이 언제인가요?" |
| 장기 미수금 여부 | "장기 미수금이 있나요?" |

---

## 기대 효과

| 효과 | 설명 |
|------|------|
| 회계 업무 자동화 | 영수증 촬영 한 번으로 OCR이 자동 추출하고 장부에 즉시 등록 |
| AI 회계 조언 | 자연어 질문으로 재무 데이터 기반 전문가 수준 답변 |
| 통합 업무 관리 | 회계·인사·생산·유통을 하나의 플랫폼에서 처리 |
| 실시간 재무 파악 | 4개 분야 KPI 카드 + 추이 차트로 사업 흐름 즉각 파악 |
| 세무 신고 부담 완화 | 카드매출·은행거래 자동 집계, 부가세 기초 자료 자동 제공 |
| 보안 · 확장성 확보 | JWT 무상태 인증 + 소셜 로그인 + FastAPI 비동기 처리 |

---

## 향후 프로젝트 확장 방향

1. **Open Banking 연동** — 실시간 계좌 거래내역 수집
2. **카드사 API 연동** — 실시간 카드 매출 수집
3. **전자 세금계산서 연동**
4. **홈택스 연동** — 매입·매출 자료 자동 수집
5. **모바일 앱** — React Native 기반 iOS/Android 클라이언트
6. **프랜차이즈 본부 · 지점 구조 지원** — 여러 사업장을 계층적으로 연결해 본부에서 지점 데이터를 통합 조회

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
# .env 파일에서 DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, SECRET_KEY, OPENAI_API_KEY 등 입력
uvicorn main:app --reload --port 8002
```

### 프론트엔드
```bash
cd frontend
npm install
# .env.local 파일 생성
echo "NEXT_PUBLIC_API_URL=http://localhost:8002" > .env.local
npm run dev
```

---

## 환경변수

| 변수 | 위치 | 설명 |
|------|------|------|
| `NEXT_PUBLIC_API_URL` | frontend `.env.local` | 백엔드 서버 URL (기본: http://localhost:8002) |
| `DB_HOST` ~ `DB_NAME` | backend `.env` | MySQL 접속 정보 |
| `SECRET_KEY` | backend `.env` | JWT 서명 키 |
| `OPENAI_API_KEY` | backend `.env` | AI 회계 비서 LLM |
| `KAKAO_CLIENT_ID/SECRET` | backend `.env` | 카카오 OAuth |
| `GOOGLE_CLIENT_ID/SECRET` | backend `.env` | 구글 OAuth |
| `NAVER_CLIENT_ID/SECRET` | backend `.env` | 네이버 OAuth |
| `FRONTEND_URL` | backend `.env` | CORS 허용 도메인 |

---

© 2026 SelfERP — 소상공인을 위한 AI 통합 ERP
