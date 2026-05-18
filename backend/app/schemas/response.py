from pydantic import BaseModel

from app.schemas.graph import GraphNode, GraphEdge, TimelineEvent


class StreamEvent(BaseModel):
    event: str
    data: dict


class CausalGraphResponse(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]
    timeline: list[TimelineEvent]
