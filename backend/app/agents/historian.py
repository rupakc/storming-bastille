import json
import logging
from collections.abc import AsyncGenerator

from app.agents.base_agent import BaseAgent
from app.tools.web_search import SearchResult

logger = logging.getLogger(__name__)

HISTORIAN_SYSTEM_PROMPT = """You are a historian and geopolitical analyst. Be precise and informative, but not verbose.

IMPORTANT: You MUST output the JSON events block FIRST, before any narrative sections.

Start your response with a JSON block wrapped in ```json ... ``` tags.
The JSON must have an "events" key with an array of 8-10 event objects in chronological order.
Each event description must be 2-3 sentences covering what happened, who was involved, and why it mattered.

IMPORTANT: Exactly ONE event must have "is_primary": true — the event that is the main subject of the user's query.
This is the event the user is asking about, NOT its causes or consequences.
Examples:
- "What events led to the French Revolution?" → The French Revolution itself is the primary event.
- "What caused the assassination of JFK?" → The Assassination of JFK is the primary event.
- "How did World War I start?" → The outbreak of World War I is the primary event.
All other events should have "is_primary": false.

```json
{
  "events": [
    {
      "id": "event_1",
      "title": "Event Title",
      "date": "1789-07-14",
      "description": "2-3 sentence description of the event, its key actors, and its significance in the causal chain.",
      "rationale": "1-2 sentence explanation of why this event contributed to or led to the final outcome being analyzed.",
      "category": "political",
      "is_primary": false,
      "source_urls": []
    }
  ]
}
```

After the JSON block, provide the narrative analysis in this EXACT format. Use NUMBERED LISTS for all sections.

## Overview
3-4 sentences. What happened, why it matters, and a hook to the present.

## Key Insights
Numbered list, 6-8 items. Each item = ONE causal factor or connection, 2-3 sentences:
1. **Bold term:** Clear explanation with specific dates, names, and mechanisms. Cite sources inline as [Source Title](url) when web results are provided.

## Causal Chain
Numbered chronological list. Each item 2 sentences — what happened AND what it directly caused:
1. **Event (Date):** Description of the event and key actors involved. This led to [next consequence]. Cite [Source](url) where available.

## Lessons Learned
Numbered list, 3-5 items. Pattern → modern generalization, 2-3 sentences each:
1. **Lesson title:** Describe the historical pattern. Explain how it generalizes to other domains — business, politics, technology, or society.

## Modern Parallels
Numbered list, 3-4 items. Specific 2020s parallel, 2-3 sentences each:
1. **Parallel title:** Name the modern event, country, or leader. Explain which historical pattern it mirrors and what it suggests about the future.

RULES:
- Output JSON block FIRST, before any narrative text.
- Use NUMBERED LISTS (1. 2. 3.) for all sections, never bullet points.
- Informative but not padded. Each sentence must add information, not filler.
- Inline citations: embed [Title](url) from provided web search results directly in text.
- If no web results provided, skip citations — do NOT invent URLs.
- 8-10 events in JSON, chronological order. Each event description = 2-3 sentences."""


class HistorianAgent(BaseAgent):
    def __init__(self):
        # Use Haiku for fast first-token latency (~1-2s vs ~5-10s for Sonnet)
        # Cap at 4000 tokens to keep narrative concise and streaming fast
        super().__init__(
            system_prompt=HISTORIAN_SYSTEM_PROMPT,
            model="claude-haiku-4-5-20251001",
            max_tokens=6000,
        )
        self._search_results: list[SearchResult] = []

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
        """Stream narrative and events. search_context is pre-fetched web search results.

        Yields events_early as soon as the JSON block closes (mid-stream) so the
        orchestrator can send the graph while the narrative is still streaming.
        Falls back to a final events yield at the end if extraction fails mid-stream.
        """
        self._search_results = []
        narrative_chunks: list[str] = []
        events_emitted = False

        if search_context:
            enriched = (
                f"{query}\n\n"
                f"Here are some relevant web search results for reference. Use them to verify dates and facts:\n\n"
                f"{search_context}"
            )
        else:
            enriched = query

        async for chunk in self.stream(enriched):
            narrative_chunks.append(chunk)
            yield {"type": "narrative", "chunk": chunk}

            # Try to extract events as soon as the closing ``` fence arrives.
            # The historian always outputs JSON first, so this fires ~200-400 tokens in,
            # well before the narrative sections start.
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

    def _parse_events(self, text: str) -> list[dict]:
        try:
            json_start = text.find("```json")
            if json_start == -1:
                json_start = text.find("```\n{")
            if json_start == -1:
                brace_start = text.rfind("{")
                brace_end = text.rfind("}") + 1
                if brace_start != -1 and brace_end > brace_start:
                    candidate = text[brace_start:brace_end]
                    parsed = json.loads(candidate)
                    return parsed.get("events", [parsed] if "title" in parsed else [])
                return []

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
            events = parsed.get("events", [])

            for idx, ev in enumerate(events):
                if "id" not in ev:
                    ev["id"] = f"event_{idx + 1}"
                if "category" not in ev:
                    ev["category"] = "political"
                if "source_urls" not in ev:
                    ev["source_urls"] = []

            return events
        except (json.JSONDecodeError, ValueError) as exc:
            logger.error("Failed to parse events from historian response: %s", exc)
            return []
