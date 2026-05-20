from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

router = APIRouter()


@router.get("/health")
async def health_check(request: Request):
    db_ok = True
    try:
        await request.app.state.db.fetchone("SELECT 1")
    except Exception:
        db_ok = False

    if not db_ok:
        return JSONResponse(
            status_code=503,
            content={"status": "degraded", "version": "1.0.0", "db": False},
        )

    return {"status": "ok", "version": "1.0.0", "db": True}
