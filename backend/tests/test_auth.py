"""Unit tests for JWT auth utilities."""

import os

import pytest

os.environ.setdefault("ANTHROPIC_API_KEY", "sk-ant-test")
os.environ.setdefault("JWT_SECRET_KEY", "test-jwt-secret-key-32-chars-long!!")
os.environ.setdefault("ADMIN_PASSWORD", "test-admin-password-123")

from app.core.auth import (  # noqa: E402
    ACCESS_TOKEN_EXPIRE_HOURS,
    MIN_PASSWORD_LENGTH,
    create_access_token,
    decode_token,
)


class TestCreateAccessToken:
    def test_returns_string(self):
        token = create_access_token({"sub": "alice"})
        assert isinstance(token, str)
        assert len(token) > 0

    def test_roundtrip_sub(self):
        token = create_access_token({"sub": "alice"})
        payload = decode_token(token)
        assert payload["sub"] == "alice"

    def test_roundtrip_extra_claims(self):
        token = create_access_token({"sub": "alice", "is_admin": True, "is_first_login": False})
        payload = decode_token(token)
        assert payload["is_admin"] is True
        assert payload["is_first_login"] is False

    def test_exp_claim_present(self):
        token = create_access_token({"sub": "alice"})
        payload = decode_token(token)
        assert "exp" in payload

    def test_different_users_produce_different_tokens(self):
        t1 = create_access_token({"sub": "alice"})
        t2 = create_access_token({"sub": "bob"})
        assert t1 != t2


class TestDecodeToken:
    def test_invalid_token_raises_401(self):
        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc_info:
            decode_token("not.a.valid.token")
        assert exc_info.value.status_code == 401

    def test_tampered_token_raises_401(self):
        from fastapi import HTTPException

        token = create_access_token({"sub": "alice"})
        tampered = token[:-4] + "xxxx"
        with pytest.raises(HTTPException) as exc_info:
            decode_token(tampered)
        assert exc_info.value.status_code == 401

    def test_empty_string_raises_401(self):
        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc_info:
            decode_token("")
        assert exc_info.value.status_code == 401


class TestConstants:
    def test_expire_hours_positive(self):
        assert ACCESS_TOKEN_EXPIRE_HOURS > 0

    def test_min_password_length_reasonable(self):
        assert MIN_PASSWORD_LENGTH >= 8
