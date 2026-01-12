from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    PROJECT_NAME: str = "Club Manager API"
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5434/club_db"
    SECRET_KEY: str = "replace_this_with_a_secure_random_string"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    GEMINI_API_KEY: Optional[str] = None

    class Config:
        env_file = ".env"


settings = Settings()
# Forced reload for .env update
