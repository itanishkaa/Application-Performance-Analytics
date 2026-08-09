"""
Application configuration.

Values are read from environment variables (see .env.example at the project
root). Keeping this centralized means nothing else in the codebase should
call os.environ directly.
"""
from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # --- App ---
    APP_NAME: str = "PulseOps"
    API_V1_PREFIX: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # --- Database ---
    # SQLite file lives at the project root by default. Override via env
    # for a different location (e.g. in tests).
    DATABASE_URL: str = "sqlite:///./pulseops.db"

    # --- Auth ---
    JWT_SECRET_KEY: str = "CHANGE_ME_IN_PRODUCTION"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # --- CORS ---
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    # --- Ingestion ---
    # Where uploaded/ingested CSVs are read from when not sent via the API.
    DEFAULT_RAW_CSV_PATH: str = "../data/raw/api_logs_uncleaned.csv"
    MAX_UPLOAD_SIZE_MB: int = 50

    # --- AI (Ollama) ---
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.2"
    AI_REQUEST_TIMEOUT_SECONDS: int = 30

    # --- Thresholds (used by incident detection / reliability score) ---
    SLOW_REQUEST_THRESHOLD_MS: int = 1000
    HIGH_ERROR_RATE_PERCENT: float = 5.0
    HIGH_LATENCY_P95_MS: int = 1500
    LATENCY_REGRESSION_MULTIPLIER: float = 1.5  # current vs baseline

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )


@lru_cache
def get_settings() -> Settings:
    """Cached settings instance — import this, not Settings() directly."""
    return Settings()


settings = get_settings()
