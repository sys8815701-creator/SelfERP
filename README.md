# SelfERP — 소상공인을 위한 AI 회계 ERP

> 영수증 OCR 자동 인식, AI 회계 비서, 실시간 재무 분석을 하나의 플랫폼에서.

<!-- 배포 후 실제 URL로 교체 -->
[![Live Demo](https://img.shields.io/badge/Live%20Demo-SelfERP-FFBE50?style=for-the-badge)](https://selferp.vercel.app)
[![Backend](https://img.shields.io/badge/Backend-Railway-6B0AC9?style=for-the-badge)](https://selferp-backend.up.railway.app)

---

## 개요

국내 소상공인·개인사업자 596만 명 중 대부분은 카드 매출, 은행 거래 내역, 영수증 등을 수기로 정리합니다. **SelfERP**는 OCR과 LLM 기술을 결합하여 반복적인 회계 수작업을 자동화하고, 비전문가도 즉시 사용할 수 있는 친절한 재무 관리 환경을 제공합니다.

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| **AI 회계 비서** | 자연어 질문으로 매출·비용·순이익·세금 일정 즉시 조회 |
| **영수증 OCR** | 이미지 업로드 → 판매점·날짜·금액 자동 추출 → 장부 자동 등록 |
| **회계 장부** | 복식부기 기반 거래 내역 관리, 기간·유형·카테고리 필터, 페이지네이션 |
| **경영 분석** | 12개월 매출·비용 바 차트, 비용 구성 비율, 순이익률 KPI |
| **부가세 신고** | 신고 마감일 D-day 표시, PRO 플랜 체크리스트 |
| **소셜 로그인** | 카카오·구글 OAuth 2.0, 이메일 인증 기반 일반 회원가입 |
| **CSV 내보내기** | 전체 거래 내역 CSV 다운로드 (PRO 전용) |
| **다크/라이트 모드** | CSS 변수 기반 테마 시스템 전 페이지 적용 |

---

## 기술 스택

### Frontend
- **Next.js 15** (App Router, `"use client"`)
- **TypeScript**
- **axios** — JWT 자동 첨부 인터셉터
- **Socket.IO Client** — 실시간 알림
- **lucide-react** — 아이콘

### Backend
- **FastAPI** (Python 3.11+)
- **SQLAlchemy** ORM + **MySQL**
- **Pydantic Settings** — 환경변수 관리
- **python-jose** — JWT 발급·검증
- **passlib[bcrypt]** — 비밀번호 해싱
- **EasyOCR** — 영수증 텍스트 인식
- **OpenAI API** — AI 회계 비서 LLM
- **httpx** — OAuth 토큰 교환

---

## 아키텍처

```
사용자 브라우저
    │
    ├─ REST API (axios)
    │       └─ FastAPI ──► MySQL (SQLAlchemy ORM)
    │
    └─ WebSocket (Socket.IO)
            └─ FastAPI Socket.IO 서버
```

### JWT 인증 흐름

```
[이메일 로그인]
POST /api/auth/login → bcrypt 검증 → JWT 발급 → localStorage 저장
→ 이후 모든 요청: Authorization: Bearer <JWT>

[소셜 로그인 (카카오·구글)]
버튼 클릭 → GET /api/auth/{provider}/login → OAuth Provider
→ GET /api/auth/{provider}/callback → JWT 발급
→ /auth/callback?token=JWT → localStorage 저장
```

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

# .env 설정
cp .env.example .env
# .env 파일 편집 후 DB, SECRET_KEY, OPENAI_API_KEY 등 입력

uvicorn main:app --reload
# http://localhost:8000
```

### 프론트엔드

```bash
cd frontend
npm install

# 환경변수 설정
cp .env.local.example .env.local
# .env.local: NEXT_PUBLIC_API_URL=http://localhost:8000

npm run dev
# http://localhost:3000
```

---

## 배포

### Frontend → Vercel

1. [vercel.com](https://vercel.com) 에서 GitHub 레포 연결
2. **Environment Variables** 설정:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.up.railway.app
   ```
3. Deploy

### Backend → Railway

1. [railway.app](https://railway.app) 에서 GitHub 레포 연결 → `backend/` 디렉토리 선택
2. **MySQL 플러그인** 추가 (자동으로 `DATABASE_URL` 제공)
3. **Environment Variables** 설정 (`.env.example` 참고):
   ```
   DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME
   SECRET_KEY / OPENAI_API_KEY
   FRONTEND_URL=https://your-frontend.vercel.app
   KAKAO_CLIENT_ID / KAKAO_CLIENT_SECRET / KAKAO_REDIRECT_URI
   GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI
   ```
4. Deploy → Procfile 기반으로 자동 실행

---

## 디렉토리 구조

```
accounting-platform/
├── frontend/                    # Next.js 15
│   ├── src/
│   │   ├── app/
│   │   │   ├── dashboard/       # 대시보드 (AI·장부·OCR·경영분석 등)
│   │   │   ├── login/           # 로그인 (이메일·소셜)
│   │   │   ├── register/        # 회원가입
│   │   │   └── auth/callback/   # OAuth 콜백 처리
│   │   ├── components/
│   │   │   └── layout/          # Sidebar, Header, MainLayout
│   │   └── lib/
│   │       ├── api.ts           # axios 인스턴스
│   │       └── socket.ts        # Socket.IO 클라이언트
│   └── public/
│       ├── selferp-logo.svg
│       └── selferp-logo.jpg
│
└── backend/                     # FastAPI
    ├── main.py
    ├── core/                    # config, database, security, socket
    ├── models/                  # SQLAlchemy ORM (user, journal, receipt 등)
    ├── routers/                 # auth, oauth, ledger, ocr, ai, dashboard 등
    ├── services/                # ocr_service, llm_service, journal_service
    ├── schemas/                 # Pydantic 스키마
    └── Procfile                 # Railway 배포용
```

---

## 환경변수 참고

| 변수 | 위치 | 설명 |
|------|------|------|
| `NEXT_PUBLIC_API_URL` | frontend `.env.local` | 백엔드 URL |
| `DB_HOST` ~ `DB_NAME` | backend `.env` | MySQL 접속 정보 |
| `SECRET_KEY` | backend `.env` | JWT 서명 키 |
| `OPENAI_API_KEY` | backend `.env` | AI 회계 비서 LLM |
| `KAKAO_CLIENT_ID/SECRET` | backend `.env` | 카카오 OAuth |
| `GOOGLE_CLIENT_ID/SECRET` | backend `.env` | 구글 OAuth |
| `FRONTEND_URL` | backend `.env` | OAuth 리다이렉트 도메인 |

---

## 라이선스

MIT License © 2026 SelfERP
