from functools import lru_cache
from pathlib import Path

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Raqamli biznes nazorati"
    environment: str = "development"
    api_v1_prefix: str = "/api/v1"
    database_url: str = "sqlite:///./data/company_platform.db"
    jwt_secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60
    jwt_refresh_token_expire_days: int = 7
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://0.0.0.0:5173,http://localhost:3000,http://192.168.0.0:5173,http://192.168.1.0:5173"
    frontend_base_url: str = "http://localhost:5173"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"
    telegram_bot_token: str = ""
    telegram_bot_username: str = ""
    telegram_channel_id: str = ""
    telegram_api_id: int = 0
    telegram_api_hash: str = ""
    telegram_user_phone: str = ""
    telegram_session_name: str = "company_live"
    telegram_channel_username: str = ""

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[2] / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    @model_validator(mode="after")
    def validate_production_security(self):
        if self.environment.lower() in {"production", "prod"}:
            if self.jwt_secret_key == "change-me-in-production" or len(self.jwt_secret_key) < 32:
                raise ValueError("JWT_SECRET_KEY must be a unique value with at least 32 characters in production.")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
