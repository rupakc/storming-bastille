from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.auth import authenticate_user, create_token, get_current_user

router = APIRouter()


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/api/auth/login")
async def login(req: LoginRequest):
    user = authenticate_user(req.username, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = create_token(user["username"])
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.get("/api/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user
