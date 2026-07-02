import os
import secrets
import time
import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from core.database import get_db
from core.security import create_access_token, hash_password
from models.user import User

router = APIRouter(prefix="/api/auth", tags=["oauth"])

FRONTEND_URL      = os.getenv("FRONTEND_URL", "http://localhost:3000")

KAKAO_CLIENT_ID     = os.getenv("KAKAO_CLIENT_ID", "")
KAKAO_CLIENT_SECRET = os.getenv("KAKAO_CLIENT_SECRET", "")
KAKAO_REDIRECT_URI  = os.getenv("KAKAO_REDIRECT_URI", "http://localhost:8000/api/auth/kakao/callback")

NAVER_CLIENT_ID     = os.getenv("NAVER_CLIENT_ID", "")
NAVER_CLIENT_SECRET = os.getenv("NAVER_CLIENT_SECRET", "")
NAVER_REDIRECT_URI  = os.getenv("NAVER_REDIRECT_URI", "http://localhost:8000/api/auth/naver/callback")

GOOGLE_CLIENT_ID     = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI  = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/auth/google/callback")

# CSRF 방지용 상태 토큰 임시 저장 (단일 서버 인메모리)
_oauth_states: dict[str, float] = {}


def _make_state() -> str:
    state = secrets.token_urlsafe(32)
    _oauth_states[state] = time.time() + 300  # 5분 유효
    return state


def _verify_state(state: str) -> bool:
    exp = _oauth_states.pop(state, None)
    return exp is not None and time.time() < exp


def _get_or_create_social_user(
    db: Session, provider: str, provider_id: str, email: str, name: str
) -> User:
    # 이미 해당 소셜 계정으로 가입된 사용자 확인
    user = db.query(User).filter(
        User.provider == provider,
        User.provider_id == provider_id,
    ).first()
    if user:
        return user

    # 같은 이메일로 일반 가입된 계정이 있으면 소셜 정보 연결
    if email:
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.provider = provider
            user.provider_id = provider_id
            db.commit()
            return user

    # 새 소셜 계정 생성
    fallback_email = f"{provider}_{provider_id}@social.bookkeep.local"
    user = User(
        email=email or fallback_email,
        password=hash_password(secrets.token_urlsafe(32)),  # 소셜 로그인용 임시 비밀번호
        name=name or (email.split("@")[0] if email else provider_id),
        role="employee",
        provider=provider,
        provider_id=provider_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _error_redirect(reason: str) -> RedirectResponse:
    return RedirectResponse(f"{FRONTEND_URL}/login?social_error={reason}")


# ──────────────────────────────────────────────────────────────
#  카카오
# ──────────────────────────────────────────────────────────────

@router.get("/kakao/login")
def kakao_login():
    if not KAKAO_CLIENT_ID:
        raise HTTPException(status_code=503, detail="카카오 로그인이 설정되지 않았습니다.")
    state = _make_state()
    url = (
        "https://kauth.kakao.com/oauth/authorize"
        f"?client_id={KAKAO_CLIENT_ID}"
        f"&redirect_uri={KAKAO_REDIRECT_URI}"
        f"&response_type=code"
        f"&state={state}"
    )
    return RedirectResponse(url)


@router.get("/kakao/callback")
def kakao_callback(code: str, state: str = "", db: Session = Depends(get_db)):
    if state and not _verify_state(state):
        return _error_redirect("invalid_state")

    token_data: dict = {
        "grant_type": "authorization_code",
        "client_id": KAKAO_CLIENT_ID,
        "redirect_uri": KAKAO_REDIRECT_URI,
        "code": code,
    }
    if KAKAO_CLIENT_SECRET:
        token_data["client_secret"] = KAKAO_CLIENT_SECRET

    with httpx.Client() as client:
        token_res = client.post("https://kauth.kakao.com/oauth/token", data=token_data)
    if token_res.status_code != 200:
        return _error_redirect("kakao_token")

    access_token = token_res.json().get("access_token", "")
    with httpx.Client() as client:
        info_res = client.get(
            "https://kapi.kakao.com/v2/user/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )
    if info_res.status_code != 200:
        return _error_redirect("kakao_userinfo")

    data          = info_res.json()
    provider_id   = str(data["id"])
    kakao_account = data.get("kakao_account", {})
    email         = kakao_account.get("email", "")
    name          = kakao_account.get("profile", {}).get("nickname", "")

    user = _get_or_create_social_user(db, "kakao", provider_id, email, name)
    jwt  = create_access_token(data={"sub": str(user.id), "role": user.role})
    return RedirectResponse(f"{FRONTEND_URL}/auth/callback?token={jwt}")


# ──────────────────────────────────────────────────────────────
#  네이버
# ──────────────────────────────────────────────────────────────

@router.get("/naver/login")
def naver_login():
    if not NAVER_CLIENT_ID:
        raise HTTPException(status_code=503, detail="네이버 로그인이 설정되지 않았습니다.")
    state = _make_state()
    url = (
        "https://nid.naver.com/oauth2.0/authorize"
        f"?client_id={NAVER_CLIENT_ID}"
        f"&redirect_uri={NAVER_REDIRECT_URI}"
        f"&response_type=code"
        f"&state={state}"
    )
    return RedirectResponse(url)


@router.get("/naver/callback")
def naver_callback(code: str, state: str = "", db: Session = Depends(get_db)):
    if state and not _verify_state(state):
        return _error_redirect("invalid_state")

    with httpx.Client() as client:
        token_res = client.get(
            "https://nid.naver.com/oauth2.0/token",
            params={
                "grant_type": "authorization_code",
                "client_id": NAVER_CLIENT_ID,
                "client_secret": NAVER_CLIENT_SECRET,
                "redirect_uri": NAVER_REDIRECT_URI,
                "code": code,
                "state": state,
            },
        )
    if token_res.status_code != 200:
        return _error_redirect("naver_token")

    access_token = token_res.json().get("access_token", "")
    with httpx.Client() as client:
        info_res = client.get(
            "https://openapi.naver.com/v1/nid/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )
    if info_res.status_code != 200:
        return _error_redirect("naver_userinfo")

    resp        = info_res.json().get("response", {})
    provider_id = str(resp.get("id", ""))
    email       = resp.get("email", "")
    name        = resp.get("name", "")

    user = _get_or_create_social_user(db, "naver", provider_id, email, name)
    jwt  = create_access_token(data={"sub": str(user.id), "role": user.role})
    return RedirectResponse(f"{FRONTEND_URL}/auth/callback?token={jwt}")


# ──────────────────────────────────────────────────────────────
#  구글
# ──────────────────────────────────────────────────────────────

@router.get("/google/login")
def google_login():
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=503, detail="구글 로그인이 설정되지 않았습니다.")
    state = _make_state()
    url = (
        "https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={GOOGLE_CLIENT_ID}"
        f"&redirect_uri={GOOGLE_REDIRECT_URI}"
        f"&response_type=code"
        f"&scope=openid%20email%20profile"
        f"&access_type=offline"
        f"&state={state}"
    )
    return RedirectResponse(url)


@router.get("/google/callback")
def google_callback(code: str, state: str = "", db: Session = Depends(get_db)):
    if state and not _verify_state(state):
        return _error_redirect("invalid_state")

    with httpx.Client() as client:
        token_res = client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "grant_type": "authorization_code",
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": GOOGLE_REDIRECT_URI,
                "code": code,
            },
        )
    if token_res.status_code != 200:
        return _error_redirect("google_token")

    access_token = token_res.json().get("access_token", "")
    with httpx.Client() as client:
        info_res = client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
    if info_res.status_code != 200:
        return _error_redirect("google_userinfo")

    data        = info_res.json()
    provider_id = str(data.get("sub", ""))
    email       = data.get("email", "")
    name        = data.get("name", "")

    user = _get_or_create_social_user(db, "google", provider_id, email, name)
    jwt  = create_access_token(data={"sub": str(user.id), "role": user.role})
    return RedirectResponse(f"{FRONTEND_URL}/auth/callback?token={jwt}")
