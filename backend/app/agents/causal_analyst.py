import json
import logging

from app.agents.base_agent import BaseAgent

logger = logging.getLogger(__name__)

CAUSAL_ANALYST_SYSTEM_PROMPT = """You are an expert historical analyst specializing in causal reasoning and counterfactual analysis.
Your task is to examine a set of historical events and identify the causal relationships between them.

For each relationship you identify, classify it as one of these types:
- **direct_cause**: Event A directly and immediately led to Event B (e.g., assassination -> declaration of war)
- **contributing_factor**: Event A made Event B more likely but was not the sole cause (e.g., economic hardship -> revolution)
- **enabling_condition**: Event A created the conditions that made Event B possible (e.g., invention of printing press -> Protestant Reformation)
- **consequence**: Event B was a direct result of Event A (similar to direct_cause but emphasizes the outcome)
- **feedback_loop**: Events A and B mutually reinforced each other (e.g., arms race dynamics)

For each relationship, also assign a confidence score between 0.0 and 1.0:
- 0.9-1.0: Universally accepted causal link by historians
- 0.7-0.89: Strong consensus with some scholarly debate
- 0.5-0.69: Plausible causal link, actively debated
- 0.3-0.49: Speculative but defensible connection
- Below 0.3: Weak or highly contested

You MUST return your analysis as a JSON block wrapped in ```json ... ``` tags.
The JSON must be an object with a "relationships" key containing an array.

Example format:
```json
{
  "relationships": [
    {
      "source_id": "event_1",
      "target_id": "event_2",
      "type": "direct_cause",
      "confidence": 0.92,
      "explanation": "A concise explanation of why event_1 caused event_2, citing specific mechanisms."
    }
  ]
}
```

Be rigorous. Avoid identifying spurious correlations as causal links.
Prefer well-documented causal chains over speculative ones.
Identify both obvious and subtle connections, including feedback loops where they exist.
Aim for at least one relationship per event, but do not force connections that don't exist."""


class CausalAnalystAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            system_prompt=CAUSAL_ANALYST_SYSTEM_PROMPT, model="claude-haiku-4-5-20251001"
        )

    async def analyze(self, query: str, events: list[dict]) -> list[dict]:
        events_summary = json.dumps(events, indent=2)
        prompt = (
            f"Original query: {query}\n\n"
            f"Here are the historical events identified. Analyze the causal relationships between them:\n\n"
            f"{events_summary}"
        )

        response = await self.run(prompt)
        relationships = self._parse_relationships(response)
        return relationships

    def _parse_relationships(self, text: str) -> list[dict]:
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
                    return parsed.get("relationships", [])
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
            relationships = parsed.get("relationships", [])

            valid_types = {
                "direct_cause",
                "contributing_factor",
                "enabling_condition",
                "consequence",
                "feedback_loop",
            }
            for rel in relationships:
                if rel.get("type") not in valid_types:
                    rel["type"] = "contributing_factor"
                if not isinstance(rel.get("confidence"), (int, float)):
                    rel["confidence"] = 0.5
                rel["confidence"] = max(0.0, min(1.0, float(rel["confidence"])))

            return relationships
        except (json.JSONDecodeError, ValueError) as exc:
            logger.error("Failed to parse causal relationships: %s", exc)
            return []
