import logging
import os
from pathlib import Path

import aiosqlite

logger = logging.getLogger(__name__)


class AsyncSQLiteDatabase:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self._connection: aiosqlite.Connection | None = None

    async def connect(self) -> None:
        os.makedirs(os.path.dirname(self.db_path) or ".", exist_ok=True)
        self._connection = await aiosqlite.connect(self.db_path)
        self._connection.row_factory = aiosqlite.Row
        await self._connection.execute("PRAGMA journal_mode=WAL")
        await self._connection.execute("PRAGMA foreign_keys=ON")
        await self._connection.commit()
        await self.run_migrations()
        logger.info("Database connected at %s", self.db_path)

    async def disconnect(self) -> None:
        if self._connection:
            await self._connection.close()
            self._connection = None
            logger.info("Database disconnected")

    @property
    def conn(self) -> aiosqlite.Connection:
        if self._connection is None:
            raise RuntimeError("Database is not connected. Call connect() first.")
        return self._connection

    async def execute(self, sql: str, params: tuple = ()) -> aiosqlite.Cursor:
        cursor = await self.conn.execute(sql, params)
        await self.conn.commit()
        return cursor

    async def fetchone(self, sql: str, params: tuple = ()) -> dict | None:
        cursor = await self.conn.execute(sql, params)
        row = await cursor.fetchone()
        if row is None:
            return None
        return dict(row)

    async def fetchall(self, sql: str, params: tuple = ()) -> list[dict]:
        cursor = await self.conn.execute(sql, params)
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]

    async def run_migrations(self) -> None:
        migrations_dir = Path(__file__).resolve().parent.parent.parent / "data" / "migrations"
        if not migrations_dir.exists():
            logger.warning("Migrations directory not found at %s", migrations_dir)
            return

        # Create a schema_migrations tracking table so each file runs exactly once
        await self.conn.execute("""
            CREATE TABLE IF NOT EXISTS schema_migrations (
                filename TEXT PRIMARY KEY,
                applied_at TEXT DEFAULT (datetime('now'))
            )
        """)
        await self.conn.commit()

        migration_files = sorted(migrations_dir.glob("*.sql"))
        for mf in migration_files:
            row = await (
                await self.conn.execute(
                    "SELECT 1 FROM schema_migrations WHERE filename = ?", (mf.name,)
                )
            ).fetchone()
            if row:
                continue  # already applied
            logger.info("Running migration: %s", mf.name)
            sql = mf.read_text()
            await self.conn.executescript(sql)
            await self.conn.execute(
                "INSERT INTO schema_migrations (filename) VALUES (?)", (mf.name,)
            )
            await self.conn.commit()
        logger.info("All migrations applied")
