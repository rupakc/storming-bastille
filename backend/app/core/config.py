from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    anthropic_api_key: str
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    frontend_url: str = "http://localhost:3000"
    database_path: str = "data/bastille.db"
    log_level: str = "INFO"

    # JWT — kept for backwards compat; jwt_secret_key is the canonical name
    jwt_secret: str = ""
    jwt_secret_key: str = ""

    # Seeded admin account (used only on first startup to create the admin user)
    admin_username: str = "admin"
    admin_password: str = ""

    def model_post_init(self, __context) -> None:
        # Allow either JWT_SECRET or JWT_SECRET_KEY env vars to work
        if not self.jwt_secret_key and self.jwt_secret:
            object.__setattr__(self, "jwt_secret_key", self.jwt_secret)
        elif not self.jwt_secret_key:
            object.__setattr__(self, "jwt_secret_key", "storming-bastille-secret-key-2026")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
