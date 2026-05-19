"""Tests for FastAPI app endpoints."""

import os

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("ANTHROPIC_API_KEY", "sk-ant-test")
os.environ.setdefault("JWT_SECRET_KEY", "test-jwt-secret-key-32-chars-long!!")
os.environ.setdefault("ADMIN_PASSWORD", "test-admin-password-123")
os.environ.setdefault("DATABASE_PATH", ":memory:")


@pytest.fixture(scope="module")
def client():
    from app.main import app

    with TestClient(app) as c:
        yield c


class TestHealthEndpoint:
    def test_health_returns_200(self, client):
        response = client.get("/health")
        assert response.status_code == 200

    def test_health_response_has_status(self, client):
        data = client.get("/health").json()
        assert "status" in data

    def test_health_status_is_ok(self, client):
        data = client.get("/health").json()
        assert data["status"] in ("ok", "healthy", "OK")


class TestPresetsEndpoint:
    def test_presets_returns_200(self, client):
        response = client.get("/api/presets")
        assert response.status_code == 200

    def test_presets_returns_non_empty(self, client):
        data = client.get("/api/presets").json()
        # Response is either a list or a dict with a "presets" key
        items = data if isinstance(data, list) else data.get("presets", data)
        assert len(items) > 0


class TestAuthEndpoints:
    def test_login_with_bad_credentials_returns_401(self, client):
        response = client.post(
            "/api/auth/login",
            json={"username": "nonexistent", "password": "wrongpassword"},
        )
        assert response.status_code == 401

    def test_login_with_admin_credentials_returns_200(self, client):
        response = client.post(
            "/api/auth/login",
            json={"username": "admin", "password": "test-admin-password-123"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_me_without_token_returns_401(self, client):
        response = client.get("/api/auth/me")
        assert response.status_code == 401

    def test_me_with_valid_token_returns_user(self, client):
        login = client.post(
            "/api/auth/login",
            json={"username": "admin", "password": "test-admin-password-123"},
        )
        token = login.json()["access_token"]
        response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "admin"
        assert data["is_admin"] is True


class TestAdminEndpoints:
    def _admin_token(self, client) -> str:
        resp = client.post(
            "/api/auth/login",
            json={"username": "admin", "password": "test-admin-password-123"},
        )
        return resp.json()["access_token"]

    def test_list_users_requires_auth(self, client):
        response = client.get("/api/admin/users")
        assert response.status_code == 401

    def test_list_users_as_admin(self, client):
        token = self._admin_token(client)
        response = client.get("/api/admin/users", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        usernames = [u["username"] for u in data]
        assert "admin" in usernames
