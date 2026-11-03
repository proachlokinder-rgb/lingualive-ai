import os
from functools import lru_cache
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "LinguaLive AI Backend"
    APP_ENV: str = "development"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"

    ALLOWED_ORIGINS: str = "*"

    DEFAULT_TRANSLATION_PROVIDER: str = "google"

    # Optional Cloud API keys
    OPENAI_API_KEY: str = ""
    AZURE_SPEECH_KEY: str = ""
    AZURE_SPEECH_REGION: str = "eastus"
    GOOGLE_APPLICATION_CREDENTIALS: str = ""

    # WebRTC STUN/TURN
    STUN_SERVER: str = "stun:stun.l.google.com:19302"
    TURN_SERVER: str = ""
    TURN_USERNAME: str = ""
    TURN_CREDENTIAL: str = ""

    MAX_ROOM_CAPACITY: int = 2
    ROOM_INACTIVE_TIMEOUT_SECONDS: int = 3600
    MAX_AUDIO_UPLOAD_MB: int = 15

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def cors_origins(self) -> List[str]:
        if self.ALLOWED_ORIGINS.strip() == "*":
            return ["*"]
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]


@lru_cache()
def get_settings() -> Settings:
    return Settings()
