from pydantic import BaseModel


class QueryRequest(BaseModel):
    query: str
    session_id: str | None = None
    follow_up: bool = False


class FollowUpRequest(BaseModel):
    query: str
    session_id: str
