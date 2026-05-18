import json
import logging

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.db.repository import SessionRepository

logger = logging.getLogger(__name__)
router = APIRouter()


class CreateSessionBody(BaseModel):
    title: str
    query_id: str | None = None


class PatchGraphBody(BaseModel):
    nodes: list[dict]
    edges: list[dict]
    timeline: list[dict] = []
    query_id: str


@router.get("/api/sessions")
async def list_sessions(request: Request):
    repo = SessionRepository(request.app.state.db)
    sessions = await repo.list_sessions()
    return [s.model_dump() for s in sessions]


@router.get("/api/sessions/{session_id}")
async def get_session(request: Request, session_id: str):
    repo = SessionRepository(request.app.state.db)
    session = await repo.get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return session.model_dump()


@router.post("/api/sessions")
async def create_session(request: Request, body: CreateSessionBody):
    repo = SessionRepository(request.app.state.db)
    session = await repo.create_session(body.title)
    return session.model_dump()


@router.delete("/api/sessions/{session_id}")
async def delete_session(request: Request, session_id: str):
    repo = SessionRepository(request.app.state.db)
    session = await repo.get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    await repo.delete_session(session_id)
    return {"status": "deleted", "session_id": session_id}


@router.patch("/api/sessions/{session_id}/graph")
async def patch_graph(request: Request, session_id: str, body: PatchGraphBody):
    repo = SessionRepository(request.app.state.db)
    session = await repo.get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    await repo.update_graph(body.query_id, body.nodes, body.edges, body.timeline)
    return {"status": "updated", "query_id": body.query_id}
