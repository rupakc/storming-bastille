from pydantic import BaseModel

from app.schemas.response import CausalGraphResponse


class QueryRecord(BaseModel):
    id: str
    query_text: str
    narrative: str = ""
    sources: list[dict] = []
    graph: CausalGraphResponse | None = None
    created_at: str
    sequence: int


class Session(BaseModel):
    id: str
    title: str
    created_at: str
    updated_at: str
    queries: list[QueryRecord] = []


class SessionSummary(BaseModel):
    id: str
    title: str
    created_at: str
    query_count: int
