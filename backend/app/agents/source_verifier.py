import json
import logging

from app.agents.base_agent import BaseAgent
from app.tools.web_search import SearchResult

logger = logging.getLogger(__name__)

SOURCE_VERIFIER_SYSTEM_PROMPT = """You are a meticulous historical fact-checker and source verification specialist.
Your role is to cross-reference historical claims against available sources and assess their reliability.

Given a list of historical events and search results, you must:

1. Evaluate each source for reliability:
   - Academic sources (.edu, journal articles): highest reliability
   - Established encyclopedias (Britannica, Wikipedia with citations): high reliability
   - Reputable news archives: moderate-high reliability
   - General web sources: moderate reliability
   - Blogs and opinion pieces: low reliability

2. Cross-reference key claims:
   - Verify dates match across sources
   - Confirm key actors and their roles
   - Check that causal claims are supported

3. Return a JSON assessment wrapped in ```json ... ``` tags:

```json
{
  "verified_sources": [
    {
      "url": "https://example.com/article",
      "title": "Article Title",
      "relevance_score": 0.85,
      "verified_claims": ["Claim 1 from the events list that this source supports", "Claim 2"]
    }
  ]
}
```

Be honest about uncertainty. If a source doesn't clearly support a claim, don't list it.
Prioritize quality over quantity in verified claims."""


class SourceVerifierAgent(BaseAgent):
    def __init__(self):
        super().__init__(system_prompt=SOURCE_VERIFIER_SYSTEM_PROMPT)

    async def verify(
        self, events: list[dict], search_results: list[SearchResult]
    ) -> list[dict]:
        events_text = json.dumps(events, indent=2)
        sources_text = "\n".join(
            f"- [{r.title}]({r.url}): {r.snippet}" for r in search_results[:15]
        )

        prompt = (
            f"Historical events to verify:\n{events_text}\n\n"
            f"Available sources:\n{sources_text}\n\n"
            f"Cross-reference these sources against the events and assess reliability."
        )

        response = await self.run(prompt)
        return self._parse_verified(response)

    def _parse_verified(self, text: str) -> list[dict]:
        try:
            json_start = text.find("```json")
            if json_start == -1:
                json_start = text.find("```\n{")
            if json_start == -1:
                brace_start = text.rfind("{")
                brace_end = text.rfind("}") + 1
                if brace_start != -1 and brace_end > brace_start:
                    parsed = json.loads(text[brace_start:brace_end])
                    return parsed.get("verified_sources", [])
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
            return parsed.get("verified_sources", [])
        except (json.JSONDecodeError, ValueError) as exc:
            logger.error("Failed to parse source verification: %s", exc)
            return []
