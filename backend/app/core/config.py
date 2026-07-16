from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    DATABASE_URL: str = "sqlite+aiosqlite:///./scheduling.db"
    CHECKPOINT_DB_URL: str = "./checkpoints.db"

    GROQ_API_KEY: str
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_NAME: str = "Scheduling Assistant"

    ALLOWED_ORIGINS: str = "http://localhost:8080"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"
    APP_VERSION: str = "1.0.0"

    MAX_TURNS: int = 20
    MAX_ACTIVE_BOOKINGS_PER_EMAIL: int = 5
    BOOKING_WINDOW_DAYS: int = 90

    # Simple API key for booking endpoints (set in Render env vars)
    BOOKINGS_API_KEY: str = ""

    @property
    def origins_list(self) -> list[str]:
        return [o.strip().rstrip("/") for o in self.ALLOWED_ORIGINS.split(",")]


settings = Settings()