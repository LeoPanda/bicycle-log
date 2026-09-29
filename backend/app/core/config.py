import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "bicycle-log"
    VERSION: str = "1.0.0"
    TZ: str = "Asia/Tokyo"
    LOG_LEVEL: str = "DEBUG"
    DATABASE_URL: str = "sqlite:///./data/app.db"
    SQL_ECHO: bool = False
    INTERNAL_AI_TOKEN: str = "ai_agent_secret_secure_token_2026"
    
    # External API Keys & Credentials
    STRAVA_CLIENT_ID: str = ""
    STRAVA_CLIENT_SECRET: str = ""
    STRAVA_REFRESH_TOKEN: str = ""
    GOOGLE_PLACES_API_KEY: str = ""
    
    # Storage
    GCS_BUCKET_NAME_IMAGES: str = "bicycle-log-images"
    GCS_LITESTREAM_BACKUP_BUCKET: str = "bicycle-log-litestream"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
