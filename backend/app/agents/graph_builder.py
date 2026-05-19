import json
import logging
import re

from app.agents.base_agent import BaseAgent

logger = logging.getLogger(__name__)

GRAPH_BUILDER_SYSTEM_PROMPT = """You are a visualization specialist that converts historical events and causal relationships
into a structured graph schema suitable for rendering with React Flow.

Your task is to take a list of events and causal relationships and produce a complete graph specification
with optimal node positioning for visual clarity.

Layout rules:
- Arrange nodes chronologically from left to right.
- Use the X axis for time (earlier events on the left, later on the right).
- Use the Y axis to separate events by category and avoid overlapping edges.
- Space nodes at least 300px apart horizontally and 150px apart vertically.
- Group related events closer together vertically.
- Start positions at x=100, y=100.

Category color mapping (include in node data):
- political: #3B82F6 (blue)
- economic: #10B981 (green)
- social: #F59E0B (amber)
- military: #EF4444 (red)
- cultural: #8B5CF6 (purple)

You MUST return a JSON block wrapped in ```json ... ``` tags with this exact structure:

```json
{
  "nodes": [
    {
      "id": "event_1",
      "type": "event",
      "data": {
        "title": "Event Title",
        "date": "1789-07-14",
        "description": "Brief description",
        "category": "political",
        "source_urls": [],
        "image_url": null
      },
      "position": {"x": 100, "y": 100}
    }
  ],
  "edges": [
    {
      "id": "edge_event_1_event_2",
      "source": "event_1",
      "target": "event_2",
      "data": {
        "label": "Short causal label",
        "type": "direct_cause",
        "confidence": 0.92,
        "explanation": "Why this causal link exists"
      }
    }
  ],
  "timeline": [
    {
      "id": "event_1",
      "date": "1789-07-14",
      "title": "Event Title",
      "category": "political",
      "description": "Brief description"
    }
  ]
}
```

The timeline array should contain all events sorted chronologically.
Make edge labels concise (3-6 words) but meaningful.
Mark the most important causal chain as the "critical path" by giving those edges higher confidence scores."""


class GraphBuilderAgent(BaseAgent):
    def __init__(self):
        super().__init__(system_prompt=GRAPH_BUILDER_SYSTEM_PROMPT)

    async def build_graph(self, events: list[dict], relationships: list[dict]) -> dict:
        prompt = (
            f"Events:\n{json.dumps(events, indent=2)}\n\n"
            f"Causal Relationships:\n{json.dumps(relationships, indent=2)}\n\n"
            f"Build the complete graph visualization schema."
        )

        response = await self.run(prompt)
        graph = self._parse_graph(response)

        if not graph["nodes"] and events:
            graph = self._build_fallback_graph(events, relationships)

        return graph

    def _parse_graph(self, text: str) -> dict:
        default = {"nodes": [], "edges": [], "timeline": []}
        try:
            json_start = text.find("```json")
            if json_start == -1:
                json_start = text.find("```\n{")
            if json_start == -1:
                brace_start = text.rfind("{")
                brace_end = text.rfind("}") + 1
                if brace_start != -1 and brace_end > brace_start:
                    parsed = json.loads(text[brace_start:brace_end])
                    if "nodes" in parsed:
                        return {
                            "nodes": parsed.get("nodes", []),
                            "edges": parsed.get("edges", []),
                            "timeline": parsed.get("timeline", []),
                        }
                return default

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
            return {
                "nodes": parsed.get("nodes", []),
                "edges": parsed.get("edges", []),
                "timeline": parsed.get("timeline", []),
            }
        except (json.JSONDecodeError, ValueError) as exc:
            logger.error("Failed to parse graph: %s", exc)
            return default

    def _build_fallback_graph(
        self,
        events: list[dict],
        relationships: list[dict],
        query: str = "",
    ) -> dict:
        category_y_offsets = {
            "political": 0,
            "economic": 150,
            "social": 300,
            "military": 450,
            "cultural": 600,
        }

        def _sort_key(ev: dict) -> str:
            date = ev.get("date", "9999")
            return re.sub(r"[^\d]", "", date)[:8].ljust(8, "0")

        sorted_events = sorted(events, key=_sort_key)

        nodes = []
        timeline = []
        for idx, ev in enumerate(sorted_events):
            cat = ev.get("category", "political")
            y_offset = category_y_offsets.get(cat, 0)
            node = {
                "id": ev["id"],
                "type": "event",
                "data": {
                    "title": ev.get("title", "Unknown"),
                    "date": ev.get("date", "Unknown"),
                    "description": ev.get("description", ""),
                    "category": cat,
                    "source_urls": ev.get("source_urls", []),
                    "image_url": None,
                    "is_primary": bool(ev.get("is_primary", False)),
                },
                "position": {"x": 100 + idx * 250, "y": 100 + y_offset},
            }
            nodes.append(node)
            timeline.append(
                {
                    "id": ev["id"],
                    "date": ev.get("date", "Unknown"),
                    "title": ev.get("title", "Unknown"),
                    "category": cat,
                    "description": ev.get("description", ""),
                    "rationale": ev.get("rationale", ""),
                }
            )

        edges = []
        seen_edge_ids: set[str] = set()
        for rel in relationships:
            base_id = f"edge_{rel['source_id']}_{rel['target_id']}"
            edge_id = base_id
            # Deduplicate: append counter if this source→target pair already exists
            counter = 2
            while edge_id in seen_edge_ids:
                edge_id = f"{base_id}_{counter}"
                counter += 1
            seen_edge_ids.add(edge_id)
            edges.append(
                {
                    "id": edge_id,
                    "source": rel["source_id"],
                    "target": rel["target_id"],
                    "data": {
                        "label": rel.get("explanation", "Causal link")[:60],
                        "type": rel.get("type", "contributing_factor"),
                        "confidence": rel.get("confidence", 0.5),
                        "explanation": rel.get("explanation", ""),
                    },
                }
            )

        return {"nodes": nodes, "edges": edges, "timeline": timeline}
