"""Simple JWT authentication for Storming Bastille."""

import time

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import settings

USERS = {
    "history": {"password": "bastille@123", "name": "History"},
}

_bearer = HTTPBearer(auto_error=False)


def authenticate_user(username: str, password: str) -> dict | None:
    user = USERS.get(username)
    if user and user["password"] == password:
        return {"username": username, "name": user["name"]}
    return None


def create_token(username: str) -> str:
    payload = {"sub": username, "exp": int(time.time()) + 86400 * 7}
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def verify_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        username = payload.get("sub")
        if username and username in USERS:
            return {"username": username, "name": USERS[username]["name"]}
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        pass
    return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> dict:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    user = verify_token(credentials.credentials)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return user
