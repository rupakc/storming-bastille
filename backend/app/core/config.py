from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    anthropic_api_key: str
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    frontend_url: str = "http://localhost:3000"
    database_path: str = "data/bastille.db"
    log_level: str = "INFO"
    jwt_secret: str = "storming-bastille-secret-key-2026"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
