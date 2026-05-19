import logging
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import auth, health, presets, query, sessions
from app.api.routes.admin import router as admin_router
from app.core.anthropic_client import close_client
from app.core.config import settings
from app.db.database import AsyncSQLiteDatabase
from app.db.users_db import create_users_table, seed_admin

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Users DB must be initialised before the session DB so auth deps work
    create_users_table()
    seed_admin()

    db = AsyncSQLiteDatabase(settings.database_path)
    await db.connect()
    app.state.db = db
    logger.info("Storming Bastille backend started")
    yield
    await db.disconnect()
    await close_client()
    logger.info("Storming Bastille backend shut down")


app = FastAPI(
    title="Storming Bastille",
    description="Historical events causal reasoning API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Public routes first
app.include_router(health.router)
app.include_router(presets.router)

# Auth routes (login is public, me/change-password require token)
app.include_router(auth.router)

# Protected routes
app.include_router(admin_router)
app.include_router(query.router)
app.include_router(sessions.router)


def run():
    uvicorn.run(
        "app.main:app",
        host=settings.backend_host,
        port=settings.backend_port,
        reload=True,
    )


if __name__ == "__main__":
    run()
