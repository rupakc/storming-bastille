"""Tests for configuration and application settings."""

import os

import pytest

os.environ.setdefault("ANTHROPIC_API_KEY", "sk-ant-test")
os.environ.setdefault("JWT_SECRET_KEY", "test-jwt-secret-key-32-chars-long!!")
os.environ.setdefault("ADMIN_PASSWORD", "test-admin-password-123")


class TestSettings:
    def test_settings_loads(self):
        from app.core.config import settings

        assert settings is not None

    def test_default_host(self):
        from app.core.config import settings

        assert settings.backend_host == "0.0.0.0"

    def test_default_port(self):
        from app.core.config import settings

        assert settings.backend_port == 8000

    def test_jwt_secret_key_resolved(self):
        from app.core.config import settings

        assert settings.jwt_secret_key != ""

    def test_admin_username_default(self):
        from app.core.config import settings

        assert settings.admin_username == "admin"
