import json
import uuid
from datetime import datetime, timezone

from app.db.database import AsyncSQLiteDatabase
from app.schemas.graph import GraphNode, GraphEdge, TimelineEvent
from app.schemas.response import CausalGraphResponse
from app.schemas.session import QueryRecord, Session, SessionSummary


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _uuid() -> str:
    return uuid.uuid4().hex[:16]


class SessionRepository:
    def __init__(self, db: AsyncSQLiteDatabase):
        self.db = db

    async def create_session(self, title: str, user_id: str | None = None) -> Session:
        session_id = _uuid()
        now = _now()
        await self.db.execute(
            "INSERT INTO sessions (id, title, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            (session_id, title, user_id, now, now),
        )
        return Session(id=session_id, title=title, created_at=now, updated_at=now, queries=[])

    async def get_session(
        self, session_id: str, user_id: str | None = None
    ) -> Session | None:
        if user_id is not None:
            row = await self.db.fetchone(
                "SELECT * FROM sessions WHERE id = ? AND user_id = ?",
                (session_id, user_id),
            )
        else:
            row = await self.db.fetchone(
                "SELECT * FROM sessions WHERE id = ?", (session_id,)
            )
        if row is None:
            return None

        query_rows = await self.db.fetchall(
            "SELECT * FROM queries WHERE session_id = ? ORDER BY sequence", (session_id,)
        )

        queries: list[QueryRecord] = []
        for qr in query_rows:
            graph_row = await self.db.fetchone(
                "SELECT * FROM graphs WHERE query_id = ?", (qr["id"],)
            )
            graph = None
            if graph_row:
                graph = CausalGraphResponse(
                    nodes=[GraphNode(**n) for n in json.loads(graph_row["nodes"])],
                    edges=[GraphEdge(**e) for e in json.loads(graph_row["edges"])],
                    timeline=[TimelineEvent(**t) for t in json.loads(graph_row["timeline"])],
                )
            queries.append(
                QueryRecord(
                    id=qr["id"],
                    query_text=qr["query_text"],
                    narrative=qr["narrative"] or "",
                    sources=json.loads(qr["sources"]) if qr["sources"] else [],
                    graph=graph,
                    created_at=qr["created_at"],
                    sequence=qr["sequence"],
                )
            )

        return Session(
            id=row["id"],
            title=row["title"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
            queries=queries,
        )

    async def list_sessions(self, user_id: str | None = None) -> list[SessionSummary]:
        if user_id is not None:
            rows = await self.db.fetchall(
                """
                SELECT s.id, s.title, s.created_at,
                       (SELECT COUNT(*) FROM queries q WHERE q.session_id = s.id) AS query_count
                FROM sessions s
                WHERE s.user_id = ?
                ORDER BY s.updated_at DESC
                """,
                (user_id,),
            )
        else:
            rows = await self.db.fetchall(
                """
                SELECT s.id, s.title, s.created_at,
                       (SELECT COUNT(*) FROM queries q WHERE q.session_id = s.id) AS query_count
                FROM sessions s
                ORDER BY s.updated_at DESC
                """
            )
        return [
            SessionSummary(
                id=r["id"], title=r["title"], created_at=r["created_at"], query_count=r["query_count"]
            )
            for r in rows
        ]

    async def delete_session(self, session_id: str) -> None:
        await self.db.execute("DELETE FROM sessions WHERE id = ?", (session_id,))

    async def save_query(self, session_id: str, query_text: str, sequence: int) -> QueryRecord:
        query_id = _uuid()
        now = _now()
        await self.db.execute(
            "INSERT INTO queries (id, session_id, query_text, narrative, sources, created_at, sequence) "
            "VALUES (?, ?, ?, '', '[]', ?, ?)",
            (query_id, session_id, query_text, now, sequence),
        )
        await self.db.execute(
            "UPDATE sessions SET updated_at = ? WHERE id = ?", (now, session_id)
        )
        return QueryRecord(
            id=query_id,
            query_text=query_text,
            narrative="",
            sources=[],
            graph=None,
            created_at=now,
            sequence=sequence,
        )

    async def update_query(
        self, query_id: str, narrative: str, sources: list[dict], graph_data: dict | None = None
    ) -> None:
        await self.db.execute(
            "UPDATE queries SET narrative = ?, sources = ? WHERE id = ?",
            (narrative, json.dumps(sources), query_id),
        )
        if graph_data:
            await self.update_graph(
                query_id,
                graph_data.get("nodes", []),
                graph_data.get("edges", []),
                graph_data.get("timeline", []),
            )

    async def update_graph(
        self, query_id: str, nodes: list, edges: list, timeline: list
    ) -> None:
        now = _now()
        existing = await self.db.fetchone("SELECT id FROM graphs WHERE query_id = ?", (query_id,))
        if existing:
            await self.db.execute(
                "UPDATE graphs SET nodes = ?, edges = ?, timeline = ?, updated_at = ? WHERE query_id = ?",
                (json.dumps(nodes), json.dumps(edges), json.dumps(timeline), now, query_id),
            )
        else:
            graph_id = _uuid()
            await self.db.execute(
                "INSERT INTO graphs (id, query_id, nodes, edges, timeline, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
                (graph_id, query_id, json.dumps(nodes), json.dumps(edges), json.dumps(timeline), now),
            )

    async def find_cached_query(self, query_text: str) -> dict | None:
        """Find the most recent completed query with matching text that has a narrative and graph."""
        row = await self.db.fetchone(
            "SELECT q.id, q.narrative, q.sources FROM queries q "
            "WHERE q.query_text = ? AND q.narrative != '' "
            "ORDER BY q.created_at DESC LIMIT 1",
            (query_text,),
        )
        if row is None:
            return None
        graph_row = await self.db.fetchone(
            "SELECT nodes, edges, timeline FROM graphs WHERE query_id = ?", (row["id"],)
        )
        if graph_row is None:
            return None
        return {
            "narrative": row["narrative"],
            "sources": json.loads(row["sources"]) if row["sources"] else [],
            "nodes": json.loads(graph_row["nodes"]),
            "edges": json.loads(graph_row["edges"]),
            "timeline": json.loads(graph_row["timeline"]),
        }

    async def get_session_context(self, session_id: str) -> list[dict]:
        rows = await self.db.fetchall(
            "SELECT query_text, narrative FROM queries WHERE session_id = ? ORDER BY sequence",
            (session_id,),
        )
        return [{"query": r["query_text"], "response": r["narrative"] or ""} for r in rows]
