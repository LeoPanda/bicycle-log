from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "bicycle-log"
    VERSION: str = "2.1.0"
    APP_VERSION: str = "2.1.0"
    ENV: str = "development"
    DEBUG: bool = True
    ALLOW_LOCAL_AUTH_BYPASS: bool = True
    TZ: str = "Asia/Tokyo"
    LOG_LEVEL: str = "DEBUG"
    DATABASE_URL: str = "sqlite:///./data/app.db"
    SQL_ECHO: bool = False
    INTERNAL_AI_TOKEN: str = "ai_agent_secret_secure_token_2026"

    # Google Cloud IAP Settings
    IAP_AUDIENCE: str = ""

    # External API Keys & Credentials
    STRAVA_CLIENT_ID: str = ""
    STRAVA_CLIENT_SECRET: str = ""
    STRAVA_REFRESH_TOKEN: str = ""
    GOOGLE_PLACES_API_KEY: str = ""

    # Storage
    GCS_BUCKET_NAME_IMAGES: str = "bicycle-log-images"
    GCS_LITESTREAM_BACKUP_BUCKET: str = "bicycle-log-litestream"

    @field_validator("DATABASE_URL")
    def validate_database_url(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("FATAL: DATABASE_URL must not be empty!")
        return v

    @field_validator("APP_VERSION")
    def validate_app_version(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("FATAL: APP_VERSION must not be empty!")
        return v

    @field_validator("INTERNAL_AI_TOKEN")
    def validate_internal_ai_token(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("FATAL: INTERNAL_AI_TOKEN must not be empty!")
        return v

    @field_validator("IAP_AUDIENCE")
    def validate_iap_audience(cls, v: str, info) -> str:
        env = info.data.get("ENV", "development")
        debug = info.data.get("DEBUG", False)
        if env == "production" and not debug:
            if not v or v.startswith("[YOUR_") or "example" in v:
                raise ValueError("FATAL: IAP_AUDIENCE must be properly configured in production environment!")
        return v

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
