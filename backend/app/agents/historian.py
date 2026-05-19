import json
import logging
from collections.abc import AsyncGenerator

from app.agents.base_agent import BaseAgent
from app.core.anthropic_client import get_client
from app.tools.web_search import SearchResult

logger = logging.getLogger(__name__)

# ── Prompt 1: events JSON only ────────────────────────────────────────────────
# Short focused call (~300 tokens output). Returns raw JSON, no markdown fences.
# Runs in parallel with the narrative stream so the graph can appear early.
EVENTS_SYSTEM_PROMPT = """You are a historian. Return ONLY a raw JSON object — no markdown, no code fences, no explanation.

The JSON must have an "events" key with 6-8 events in chronological order.
Exactly ONE event must have "is_primary": true — the main subject of the query itself (not its causes or effects).

{
  "events": [
    {
      "id": "event_1",
      "title": "Short descriptive title",
      "date": "1789",
      "description": "2-3 sentences: what happened, who was involved, why it mattered.",
      "rationale": "1-2 sentences: how this event contributed causally to the outcome.",
      "category": "political",
      "is_primary": false,
      "source_urls": []
    }
  ]
}

Output nothing except the JSON object. No preamble, no trailing text."""

# ── Prompt 2: narrative text only ─────────────────────────────────────────────
# Streams readable text from the very first token. No JSON, no code blocks.
NARRATIVE_SYSTEM_PROMPT = """You are a historian and geopolitical analyst. Write a narrative analysis directly — no JSON, no code blocks.

Use EXACTLY these section headers and numbered lists:

## Overview
3-4 sentences. What happened, why it matters, and a hook to the present.

## Key Insights
Numbered list, 6-8 items. Each item = one causal factor or connection, 2-3 sentences.
1. **Bold term:** Clear explanation with specific dates, names, and mechanisms.

## Causal Chain
Numbered chronological list. Each item 2 sentences — what happened AND what it directly caused.
1. **Event (Date):** What occurred and who was involved. This led to [next consequence].

## Lessons Learned
Numbered list, 3-5 items. Historical pattern → modern generalization, 2-3 sentences each.
1. **Lesson title:** Describe the historical pattern. Explain how it applies to business, politics, or society today.

## Modern Parallels
Numbered list, 3-4 items. Specific 2020s parallel, 2-3 sentences each.
1. **Parallel title:** Name the modern event or leader. Explain which historical pattern it mirrors.

RULES:
- Start with ## Overview immediately. No preamble.
- Use NUMBERED LISTS (1. 2. 3.) for all sections — never bullet points.
- Be informative and precise. Every sentence must add information.
- If web search results are provided, cite them inline as [Title](url)."""


class HistorianAgent(BaseAgent):
    def __init__(self):
        # BaseAgent is only used for the legacy stream_research path.
        # The new parallel path calls the Anthropic client directly.
        super().__init__(
            system_prompt=NARRATIVE_SYSTEM_PROMPT,
            model="claude-haiku-4-5-20251001",
            max_tokens=4000,
        )
        self._search_results: list[SearchResult] = []

    # ── Primary API (used by orchestrator) ────────────────────────────────────

    async def get_events_async(self, query: str) -> list[dict]:
        """Non-streaming call that returns just the structured events JSON.

        Short output (~300 tokens) so this completes in ~5-8s — well before
        the narrative stream finishes — allowing the graph to appear early.
        """
        client = get_client()
        try:
            response = await client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=2000,
                system=EVENTS_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": query}],
            )
            text = "".join(block.text for block in response.content if hasattr(block, "text"))
            events = self._parse_events(text)
            logger.info("get_events_async returned %d events", len(events))
            return events
        except Exception as exc:
            logger.error("get_events_async failed: %s", exc)
            return []

    async def stream_narrative_only(
        self, query: str, search_context: str = ""
    ) -> AsyncGenerator[str, None]:
        """Stream narrative text only — first readable token arrives in ~1s.

        No JSON preamble. Runs in parallel with get_events_async so the user
        sees real text immediately while the graph is being prepared.
        """
        if search_context:
            enriched = (
                f"{query}\n\n"
                f"Relevant web search results (use for inline citations):\n\n"
                f"{search_context}"
            )
        else:
            enriched = query

        client = get_client()
        async with client.messages.stream(
            model="claude-haiku-4-5-20251001",
            max_tokens=4000,
            system=NARRATIVE_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": enriched}],
        ) as stream:
            async for event in stream:
                if event.type == "content_block_delta" and hasattr(event.delta, "text"):
                    yield event.delta.text

    # ── Legacy path (kept for compatibility) ──────────────────────────────────

    async def research(self, query: str) -> tuple[list[dict], list[dict]]:
        self._search_results = []
        response = await self.run(query)
        events = self._parse_events(response)
        sources = [
            {"title": r.title, "url": r.url, "snippet": r.snippet} for r in self._search_results
        ]
        return events, sources

    async def stream_research(
        self, query: str, search_context: str = ""
    ) -> AsyncGenerator[dict, None]:
        """Legacy combined stream. Kept as fallback; orchestrator uses the
        parallel get_events_async + stream_narrative_only approach instead."""
        self._search_results = []
        narrative_chunks: list[str] = []
        events_emitted = False

        enriched = query
        if search_context:
            enriched = f"{query}\n\nHere are some relevant web search results:\n\n{search_context}"

        async for chunk in self.stream(enriched):
            narrative_chunks.append(chunk)
            yield {"type": "narrative", "chunk": chunk}

            if not events_emitted and "```" in chunk:
                partial = "".join(narrative_chunks)
                events = self._parse_events(partial)
                if events:
                    events_emitted = True
                    yield {"type": "events_early", "data": events}

        full_narrative = "".join(narrative_chunks)
        if not events_emitted:
            events = self._parse_events(full_narrative)
            yield {"type": "events", "data": events}
        yield {"type": "narrative_complete", "text": full_narrative}

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _parse_events(self, text: str) -> list[dict]:
        """Parse events JSON from raw text or markdown-fenced JSON block."""
        text = text.strip()
        try:
            # Fast path: model returned raw JSON (new events-only prompt)
            if text.startswith("{"):
                parsed = json.loads(text)
                return self._normalise(parsed.get("events", []))

            # Markdown fence: ```json ... ``` or ``` ... ```
            json_start = text.find("```json")
            if json_start == -1:
                json_start = text.find("```\n{")
            if json_start != -1:
                json_start = text.index("{", json_start)
                depth = 0
                json_end = json_start
                for i, c in enumerate(text[json_start:], start=json_start):
                    if c == "{":
                        depth += 1
                    elif c == "}":
                        depth -= 1
                        if depth == 0:
                            json_end = i + 1
                            break
                raw = text[json_start:json_end]
                parsed = json.loads(raw)
                return self._normalise(parsed.get("events", []))

            # Last resort: find the outermost {...}
            brace_start = text.find("{")
            brace_end = text.rfind("}") + 1
            if brace_start != -1 and brace_end > brace_start:
                parsed = json.loads(text[brace_start:brace_end])
                return self._normalise(parsed.get("events", [parsed] if "title" in parsed else []))
        except (json.JSONDecodeError, ValueError) as exc:
            logger.error("Failed to parse events: %s", exc)
        return []

    def _normalise(self, events: list[dict]) -> list[dict]:
        for idx, ev in enumerate(events):
            ev.setdefault("id", f"event_{idx + 1}")
            ev.setdefault("category", "political")
            ev.setdefault("source_urls", [])
        return events
