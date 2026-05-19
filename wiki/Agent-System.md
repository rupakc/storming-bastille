# Agent System

## BaseAgent

`backend/app/agents/base_agent.py` defines the shared interface all agents inherit from. It holds a reference to the Anthropic client singleton (`backend/app/core/anthropic_client.py`) and provides two methods:

- `_call_claude(model, system_prompt, user_message, stream=False)` — wraps the Anthropic API call, handles retries on rate-limit errors, and optionally returns a streaming response
- `_parse_json_from_response(text)` — extracts JSON from a Claude response, with fallback strategies for when Claude wraps JSON in markdown code fences or adds explanatory prose

The Anthropic client is a module-level singleton to avoid re-initialising the HTTP connection pool on every request.

---

## HistorianAgent

**File:** `backend/app/agents/historian.py`
**Model:** Claude Haiku 4.5 (fast, optimised for first-token latency)
**Called in:** Phase 1

**What it does:**
Takes the user's question and the pre-fetched web search results, streams a researched narrative response, and embeds structured event data in its output.

**Inputs:**
- User query string
- Web search context (formatted text from DuckDuckGo + Bing results)

**Outputs:**
- Streamed narrative text chunks (yielded one by one to the SSE stream)
- A JSON block embedded in the response listing 8–10 key historical events, each with: `id`, `name`, `date`, `description`, `significance`, `type` (political, military, economic, social, cultural)

**System prompt approach:**
The historian is instructed to act as an academic researcher. It is told explicitly to: cite sources inline, focus on causal chains not just chronology, and embed a structured JSON event list at the end of its response in a specific format. This structured output is what feeds Phase 2 and Phase 3.

**Edge cases:**
If the JSON block is missing or malformed, `_parse_json_from_response` attempts to extract any JSON object from the response text. If that also fails, GraphBuilderAgent creates minimal placeholder nodes so the graph doesn't appear broken.

---

## GraphBuilderAgent

**File:** `backend/app/agents/graph_builder.py`
**Model:** None (pure Python, no Claude call)
**Called in:** Phase 2

**What it does:**
Converts the structured events list from the historian into React Flow node objects and Dagre-compatible timeline data. No AI involved — this is deterministic transformation.

**Inputs:**
- List of structured event dicts from HistorianAgent output

**Outputs:**
- React Flow nodes array: each node has `id`, `type` (always `"eventNode"`), `position` (initial Dagre layout), `data` (event fields including label, date, description, significance, type)
- Timeline data array: chronologically sorted events with normalized date values for D3 rendering

**Node positioning:**
Initial node positions are calculated using a simple left-to-right Dagre layout based on event chronology. The frontend re-runs Dagre layout with the edges once Phase 3 completes.

---

## CausalAnalystAgent

**File:** `backend/app/agents/causal_analyst.py`
**Model:** Claude Sonnet (more capable, used for complex reasoning)
**Called in:** Phase 3

**What it does:**
Takes the list of events and determines which pairs have causal relationships, what kind of relationship, and how confident the model is.

**Inputs:**
- Events list (same as GraphBuilderAgent receives)

**Outputs:**
A JSON array of edge objects, each with:
```json
{
  "source": "event_id",
  "target": "event_id",
  "relationship_type": "direct_cause",
  "confidence": 0.85,
  "explanation": "The execution of Louis XVI..."
}
```

**Relationship types:**
- `direct_cause` — Event A directly caused Event B
- `contributing_factor` — Event A made Event B more likely but wasn't the primary driver
- `enabling_condition` — Event A created conditions that allowed Event B to occur
- `consequence` — Event B was a consequence of Event A (same as direct_cause but framed as downstream)
- `feedback_loop` — Events A and B mutually reinforced each other

**Confidence scoring:**
Scores run from 0.3 to 1.0. Historical consensus relationships (e.g., assassination of Franz Ferdinand → WWI outbreak) score 0.85–0.95. Interpretive connections (economic stagnation → revolutionary sentiment) score 0.4–0.65. The frontend uses confidence to set edge opacity — lower confidence edges appear lighter.

Edges with confidence below 0.3 are filtered out by the agent before returning.

---

## SourceVerifierAgent

**File:** `backend/app/agents/source_verifier.py`
**Model:** Claude Haiku 4.5
**Called in:** Phase 4 (fire-and-forget)

**What it does:**
Cross-checks narrative claims against the scraped web sources and assigns each source a reliability tier.

**Reliability tiers (highest to lowest):**
1. `Academic` — peer-reviewed papers, university publications, JSTOR, arXiv
2. `Encyclopedia` — Wikipedia, Britannica, similar encyclopedic sources
3. `News` — established news outlets (BBC, Reuters, NYT, major nationals)
4. `Web` — general websites, government sites, institutional pages
5. `Blog` — personal blogs, forums, opinion sites

**Inputs:**
- Narrative text from HistorianAgent
- Raw web search results (URLs + snippets)

**Outputs:**
A list of source objects:
```json
{
  "url": "https://...",
  "title": "...",
  "reliability_tier": "Encyclopedia",
  "relevance_score": 0.78,
  "supports_claims": ["claim about ...", "..."]
}
```

These are saved to SQLite as part of the query record and surfaced in the frontend's citations panel.

---

## FollowUpAgent

**File:** `backend/app/agents/followup.py`
**Model:** Claude Haiku 4.5
**Called in:** Subsequent queries in the same session

**What it does:**
Handles conversational follow-ups where the user wants to dig deeper into a topic without starting a new analysis. No graph generation happens — this is pure narrative continuation.

**Inputs:**
- Follow-up question
- Session context (previous queries and narrative summaries in the session)
- The existing graph's event list (for context)

**Outputs:**
- Streamed narrative response only

The session context prevents the agent from repeating background already covered. If the user asks "tell me more about the role of the bourgeoisie" after an analysis of the French Revolution, the agent knows not to re-explain the basic timeline.

---

## Web search pipeline

**File:** `backend/app/tools/web_search.py`

DuckDuckGo and Bing are queried in parallel using `asyncio.gather`. Each search runs with a 4-second timeout — if one engine times out, the other's results are used alone. Both engines use `httpx` for async HTTP and `BeautifulSoup4` for result extraction.

**Deduplication:**
URLs are deduplicated across both engines before injection. Result snippets are concatenated and truncated to a token budget that fits comfortably in the historian's context window without crowding out the system prompt.

**Format injected into prompt:**
```
[Web Search Results]
Source 1: {title}
URL: {url}
{snippet}

Source 2: ...
```

This plaintext format was chosen over structured JSON to give Claude more natural reading context and reduce prompt tokens.

**Caching:**
Results are cached for 1 hour by query string in the TTL cache. Cache misses trigger live search; cache hits skip both engine calls.
