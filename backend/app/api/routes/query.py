import json
import logging

from fastapi import APIRouter, Request
from sse_starlette.sse import EventSourceResponse

from app.agents.orchestrator import QueryOrchestrator
from app.schemas.query import QueryRequest

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/api/query")
async def execute_query(request: Request, body: QueryRequest):
    db = request.app.state.db
    orchestrator = QueryOrchestrator(db)

    async def event_generator():
        try:
            async for event in orchestrator.execute_query(body):
                yield {
                    "event": event["event"],
                    "data": json.dumps(event["data"]),
                }
        except Exception as exc:
            logger.error("Query execution error: %s", exc)
            yield {
                "event": "error",
                "data": json.dumps({"message": str(exc)}),
            }

    return EventSourceResponse(
        event_generator(),
        headers={
            "X-Accel-Buffering": "no",       # Disable nginx/proxy buffering
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )
