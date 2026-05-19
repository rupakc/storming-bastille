import asyncio
import logging
from collections.abc import AsyncGenerator

from app.agents.causal_analyst import CausalAnalystAgent
from app.agents.followup import FollowUpAgent
from app.agents.graph_builder import GraphBuilderAgent
from app.agents.historian import HistorianAgent
from app.db.database import AsyncSQLiteDatabase
from app.db.repository import SessionRepository
from app.schemas.query import QueryRequest
from app.tools.web_search import deep_search

logger = logging.getLogger(__name__)


class QueryOrchestrator:
    def __init__(self, db: AsyncSQLiteDatabase):
        self.db = db
        self.repo = SessionRepository(db)
        self.historian = HistorianAgent()
        self.analyst = CausalAnalystAgent()
        self.graph_builder = GraphBuilderAgent()
        self.followup = FollowUpAgent()

    async def execute_query(self, request: QueryRequest) -> AsyncGenerator[dict, None]:
        # Phase 0: Setup session (fast — just DB inserts)
        if request.session_id:
            session = await self.repo.get_session(request.session_id)
            if session is None:
                session = await self.repo.create_session(title=request.query[:80])
        else:
            session = await self.repo.create_session(title=request.query[:80])

        sequence = len(session.queries) + 1
        query_record = await self.repo.save_query(session.id, request.query, sequence)

        yield {"event": "session", "data": {"session_id": session.id, "query_id": query_record.id}}

        # ── Follow-up Q&A path: simple conversational answer, no new graph/timeline ──
        if request.follow_up and request.session_id:
            yield {"event": "status", "data": {"phase": "thinking", "message": "Thinking..."}}
            async for item in self._handle_followup(request, session.id, query_record.id):
                yield item
            return

        yield {
            "event": "status",
            "data": {"phase": "researching", "message": "Researching historical events..."},
        }

        # Check for cached results (exact query match)
        cached = await self.repo.find_cached_query(request.query)
        if cached and not request.follow_up:
            # Stream cached narrative in chunks for progressive rendering
            narrative = cached["narrative"]
            chunk_size = 200
            for i in range(0, len(narrative), chunk_size):
                yield {"event": "narrative", "data": {"chunk": narrative[i : i + chunk_size]}}

            yield {
                "event": "status",
                "data": {"phase": "analyzing", "message": "Loading cached analysis..."},
            }
            yield {"event": "graph", "data": {"nodes": cached["nodes"], "edges": cached["edges"]}}
            yield {"event": "timeline", "data": {"events": cached["timeline"]}}
            yield {"event": "sources", "data": {"citations": cached["sources"][:20]}}

            asyncio.create_task(
                self._persist_results(
                    query_record.id,
                    narrative,
                    cached["sources"],
                    {
                        "nodes": cached["nodes"],
                        "edges": cached["edges"],
                        "timeline": cached["timeline"],
                    },
                )
            )

            yield {"event": "done", "data": {"session_id": session.id, "query_id": query_record.id}}
            return

        # ── PARALLEL PIPELINE ─────────────────────────────────────────────────
        # Two concurrent Haiku calls:
        #   1. get_events_async  — short non-streaming call (~300 tokens, ~5-8s)
        #                          produces the structured events JSON for the graph
        #   2. stream_narrative_only — streams readable text immediately (~1s first token)
        #
        # The graph appears as soon as call 1 finishes while the user has been
        # reading the narrative for several seconds. Causal analysis also starts
        # the moment events arrive, running concurrently with the rest of the text.

        # Start events fetch immediately as a background task
        events_task: asyncio.Task = asyncio.create_task(
            self.historian.get_events_async(request.query)
        )

        events: list[dict] = []
        narrative_text = ""
        sources: list[dict] = []
        causal_task: asyncio.Task | None = None
        graph_data_no_edges: dict = {}
        events_dispatched = False

        try:
            async for chunk in self.historian.stream_narrative_only(
                request.query, search_context=""
            ):
                narrative_text += chunk
                yield {"event": "narrative", "data": {"chunk": chunk}}

                # Non-blocking check: send graph the moment events are ready
                if not events_dispatched and events_task.done():
                    try:
                        events = events_task.result()
                    except Exception as exc:
                        logger.warning("Events task failed: %s", exc)
                        events = []
                    if events:
                        events_dispatched = True
                        graph_data_no_edges = self.graph_builder._build_fallback_graph(
                            events, [], query=request.query
                        )
                        yield {
                            "event": "graph",
                            "data": {
                                "nodes": graph_data_no_edges.get("nodes", []),
                                "edges": [],
                            },
                        }
                        yield {
                            "event": "timeline",
                            "data": {"events": graph_data_no_edges.get("timeline", [])},
                        }
                        yield {
                            "event": "status",
                            "data": {
                                "phase": "analyzing",
                                "message": f"Found {len(events)} events, analyzing causal links...",
                            },
                        }
                        causal_task = asyncio.create_task(self._run_analysis(request.query, events))

        except Exception as exc:
            logger.error("Narrative streaming failed: %s", exc)
            yield {"event": "error", "data": {"message": f"Research phase failed: {exc}"}}
            return

        # If events weren't ready during narrative, wait for them now
        if not events_dispatched:
            try:
                events = await asyncio.wait_for(asyncio.shield(events_task), timeout=15.0)
            except Exception as exc:
                logger.error("Events fetch failed after narrative: %s", exc)
                events = []

            if events:
                graph_data_no_edges = self.graph_builder._build_fallback_graph(
                    events, [], query=request.query
                )
                yield {
                    "event": "graph",
                    "data": {"nodes": graph_data_no_edges.get("nodes", []), "edges": []},
                }
                yield {
                    "event": "timeline",
                    "data": {"events": graph_data_no_edges.get("timeline", [])},
                }
                yield {
                    "event": "status",
                    "data": {
                        "phase": "analyzing",
                        "message": f"Found {len(events)} events, analyzing causal links...",
                    },
                }
                causal_task = asyncio.create_task(self._run_analysis(request.query, events))

        if not events:
            yield {
                "event": "error",
                "data": {
                    "message": "Could not identify historical events for this query. Please try rephrasing."
                },
            }
            return

        # Phase 2: Await causal analysis (already running in background).
        # By the time narrative finishes it may already be done.
        relationships: list[dict] = []
        if causal_task is not None:
            try:
                relationships = await asyncio.wait_for(asyncio.shield(causal_task), timeout=30.0)
                logger.info("Causal analysis returned %d relationships", len(relationships))
            except asyncio.TimeoutError:
                logger.error("Causal analysis timed out after 30s")
            except Exception as exc:
                logger.error("Causal analysis failed: %s", exc, exc_info=True)

        # Send updated graph WITH edges (nodes stay the same, edges added)
        if relationships:
            graph_data = self.graph_builder._build_fallback_graph(
                events, relationships, query=request.query
            )
            yield {
                "event": "graph",
                "data": {
                    "nodes": graph_data.get("nodes", []),
                    "edges": graph_data.get("edges", []),
                },
            }
        else:
            graph_data = graph_data_no_edges

        # Persist to database (non-blocking)
        asyncio.create_task(
            self._persist_results(query_record.id, narrative_text, sources, graph_data)
        )

        yield {"event": "done", "data": {"session_id": session.id, "query_id": query_record.id}}

    async def _run_analysis(self, query: str, events: list[dict]) -> list[dict]:
        """Run causal analysis as a separate task for parallelization."""
        return await self.analyst.analyze(query, events)

    async def _handle_followup(
        self, request: QueryRequest, session_id: str, query_id: str
    ) -> AsyncGenerator[dict, None]:
        """Handle follow-up questions with a simple conversational response.
        Streams only narrative chunks — no graph/timeline/sources replacement."""
        from app.core.anthropic_client import get_client

        # Gather session history for context
        history = await self.repo.get_session_context(session_id)
        history_text = ""
        for idx, entry in enumerate(history[:-1], 1):  # exclude current empty query
            q = entry.get("query", "")
            r = entry.get("response", "")
            summary = r[:1200] if len(r) > 1200 else r
            history_text += f"\n--- Turn {idx} ---\nUser: {q}\nAssistant: {summary}\n"

        # Kick off search in background — DON'T wait for it before streaming
        search_task = asyncio.create_task(self._fetch_search_context(request.query))

        # Start streaming the answer IMMEDIATELY — don't wait for search
        search_section = ""
        # Check if search finished quickly (100ms grace)
        try:
            search_context = await asyncio.wait_for(asyncio.shield(search_task), timeout=0.1)
            if search_context:
                search_section = f"\n\nRelevant web search results:\n{search_context}"
        except (asyncio.TimeoutError, Exception):
            pass  # Stream without search context — speed > completeness

        system_prompt = (
            "You are a knowledgeable history expert continuing a conversation about historical events. "
            "Answer the user's follow-up question directly and concisely using the conversation context, "
            "your own knowledge, and any provided search results. "
            "Use markdown formatting with bullet points where appropriate. "
            "Keep your answer focused and under 400 words. Do NOT output JSON or structured data."
        )

        user_message = (
            f"Previous conversation:\n{history_text}\n"
            f"{search_section}\n\n"
            f"Follow-up question: {request.query}"
        )

        client = get_client()
        narrative_text = ""

        try:
            async with client.messages.stream(
                model="claude-haiku-4-5-20251001",
                max_tokens=2048,
                system=system_prompt,
                messages=[{"role": "user", "content": user_message}],
            ) as stream:
                async for event in stream:
                    if event.type == "content_block_delta" and hasattr(event.delta, "text"):
                        chunk = event.delta.text
                        narrative_text += chunk
                        yield {"event": "narrative", "data": {"chunk": chunk}}
        except Exception as exc:
            logger.error("Follow-up response failed: %s", exc)
            yield {"event": "error", "data": {"message": f"Follow-up failed: {exc}"}}
            return

        # Persist the follow-up answer (no graph data)
        asyncio.create_task(
            self._persist_results(
                query_id, narrative_text, [], {"nodes": [], "edges": [], "timeline": []}
            )
        )

        yield {"event": "done", "data": {"session_id": session_id, "query_id": query_id}}

    async def _fetch_search_context(self, query: str) -> str:
        """Run deep search and format results as context string for the historian."""
        try:
            results = await deep_search(query)
            if not results:
                return ""
            lines = []
            for r in results[:8]:
                lines.append(f"Source: {r.title}\nURL: {r.url}\nExcerpt: {r.snippet}\n")
            return "\n---\n".join(lines)
        except Exception as exc:
            logger.warning("Search context fetch failed: %s", exc)
            return ""

    def _extract_sources_from_context(self, context: str) -> list[dict]:
        """Parse source citations from the search context string."""
        sources = []
        for idx, block in enumerate(context.split("---")):
            title = ""
            url = ""
            snippet = ""
            for line in block.strip().split("\n"):
                if line.startswith("Source: "):
                    title = line[8:].strip()
                elif line.startswith("URL: "):
                    url = line[5:].strip()
                elif line.startswith("Excerpt: "):
                    snippet = line[9:].strip()
            if title and url:
                score = max(0.5, 1.0 - idx * 0.06)
                sources.append(
                    {
                        "title": title,
                        "url": url,
                        "snippet": snippet,
                        "relevance_score": round(score, 2),
                    }
                )
        return sources

    async def _persist_results(
        self, query_id: str, narrative: str, sources: list, graph_data: dict
    ) -> None:
        """Save results to database without blocking the response stream."""
        try:
            await self.repo.update_query(
                query_id,
                narrative=narrative,
                sources=sources[:20],
                graph_data={
                    "nodes": graph_data.get("nodes", []),
                    "edges": graph_data.get("edges", []),
                    "timeline": graph_data.get("timeline", []),
                },
            )
        except Exception as exc:
            logger.error("Failed to save query results: %s", exc)
