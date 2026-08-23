from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Plataforma de Gestión de Cumplimiento Ambiental"
    app_env: str = "development"
    database_url: str
    jwt_secret_key: str
    access_token_expire_minutes: int = 60
    cookie_secure: bool = False
    cookie_samesite: Literal["lax", "strict", "none"] = "lax"
    backend_cors_origins: list[str] = ["http://localhost:3000"]
    ai_provider: str = "gemini"
    ai_api_key: str | None = None
    ai_model: str = "gemini-2.5-flash-lite"
    ai_timeout_seconds: int = 20

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
