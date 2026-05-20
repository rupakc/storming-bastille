from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    query: str = Field(min_length=10, max_length=500)
    session_id: str | None = None
    follow_up: bool = False


class FollowUpRequest(BaseModel):
    query: str
    session_id: str
