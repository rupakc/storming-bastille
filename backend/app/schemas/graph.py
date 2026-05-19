from pydantic import BaseModel


class Position(BaseModel):
    x: float
    y: float


class EventData(BaseModel):
    title: str
    date: str
    description: str
    category: str  # political / economic / social / military / cultural
    source_urls: list[str] = []
    image_url: str | None = None
    is_primary: bool = False


class GraphNode(BaseModel):
    id: str
    type: str = "event"
    data: EventData
    position: Position


class EdgeData(BaseModel):
    label: str
    type: (
        str  # direct_cause / contributing_factor / enabling_condition / consequence / feedback_loop
    )
    confidence: float
    explanation: str


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    data: EdgeData


class TimelineEvent(BaseModel):
    id: str
    date: str
    title: str
    category: str
    description: str = ""
