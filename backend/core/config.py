from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DB_HOST: str
    DB_PORT: int
    DB_USER: str
    DB_PASSWORD: str
    DB_NAME: str

    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int

    OPENAI_API_KEY: str

    GMAIL_USER:         str = ""
    GMAIL_APP_PASSWORD: str = ""

    # 소셜 로그인
    FRONTEND_URL: str = "http://localhost:3000"

    KAKAO_CLIENT_ID:     str = ""
    KAKAO_CLIENT_SECRET: str = ""
    KAKAO_REDIRECT_URI:  str = "http://localhost:8000/api/auth/kakao/callback"

    NAVER_CLIENT_ID:     str = ""
    NAVER_CLIENT_SECRET: str = ""
    NAVER_REDIRECT_URI:  str = "http://localhost:8000/api/auth/naver/callback"

    GOOGLE_CLIENT_ID:     str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI:  str = "http://localhost:8000/api/auth/google/callback"

    class Config:
        env_file = ".env"

settings = Settings()