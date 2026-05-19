# Architecture

## Overview

Storming Bastille is a FastAPI backend with a Next.js frontend, connected by Server-Sent Events (SSE). The backend coordinates five AI agents across four phases, writing results to SQLite with a GCS backup. The frontend maintains Zustand state and renders two concurrent views: a streaming narrative panel and a React Flow causal graph.

---

## The 4-phase pipeline

```
User query arrives at POST /api/query
│
├─ Phase 1: RESEARCH (parallel, streams first)
│   ├── DuckDuckGo search ──┐
│   └── Bing search ────────┴── results injected into HistorianAgent prompt
│                                       │
│                           HistorianAgent (Claude Haiku 4.5)
│                           - streams narrative chunks via SSE
│                           - embeds structured events as JSON in output
│                                       │
│                           [SSE: narrative chunks, ~1-2s first token]
│
├─ Phase 2: GRAPH NODES (immediate after Phase 1 completes)
│   GraphBuilderAgent
│   - parses events from historian output
│   - creates React Flow nodes + timeline data
│   [SSE: graph event with nodes only, no edges yet]
│
├─ Phase 3: CAUSAL ANALYSIS (async, runs concurrently with Phase 2 output)
│   CausalAnalystAgent (Claude Sonnet)
│   - takes events list
│   - identifies relationship types + confidence scores
│   [SSE: graph update event with edges added]
│
└─ Phase 4: SOURCE VERIFICATION (fire-and-forget)
    SourceVerifierAgent
    - cross-checks claims against scraped sources
    - assigns reliability tiers
    [SSE: sources event]
    [DB: saves to SQLite + GCS backup]
```

---

## Two-phase graph rendering: why nodes come first

The causal analyst (Claude Sonnet) is doing heavier work than the historian (Claude Haiku 4.5). If the frontend waited for edges before rendering anything, users would watch a blank canvas for 5–10 seconds.

The deliberate design choice: GraphBuilderAgent runs *immediately* after Phase 1 and emits a graph event with only nodes. The frontend renders these nodes in their initial positions (Dagre layout). Then when the causal analyst finishes, a *second* graph event arrives with edges, and React Flow updates in place. Users see something meaningful within 2 seconds and watch the graph "complete" rather than appear all at once.

This means the frontend must handle two distinct graph events for the same query:
1. First `graph` SSE event: nodes array populated, edges array empty
2. Second `graph` SSE event (update): edges array populated, nodes unchanged

The `useGraph` hook in the frontend handles this by merging rather than replacing.

---

## Search context injection vs. Claude tool-use

A deliberate architectural choice: web search results are fetched by Python code (`backend/app/tools/web_search.py`) and injected as formatted text into the HistorianAgent's prompt, rather than using Claude's built-in tool-use feature.

The reason is latency. Tool-use requires a round-trip: Claude decides to call a tool, the tool executes, results are returned, Claude continues. For this app, the search should happen before Claude starts thinking — not during. By pre-fetching in parallel with the initial request and injecting results as prompt context, the first token from Claude arrives faster and Claude has search results from the very start of its generation.

The tradeoff is that Claude can't decide *what* to search — queries are derived from the user's question directly. For historical research this works well; the user's question is already the ideal search query.

---

## SSE event sequence

Every query opens an SSE stream. The frontend's `useStreamingQuery` hook parses these events in order:

```
event: session
data: {"session_id": "uuid", "query": "..."}

event: status
data: {"message": "Searching the web...", "phase": 1}

event: narrative
data: {"chunk": "The French Revolution...", "done": false}
... (many narrative chunks)
event: narrative
data: {"chunk": "...", "done": true}

event: status
data: {"message": "Building causal graph...", "phase": 2}

event: graph
data: {"nodes": [...], "edges": [], "timeline": [...]}

event: status
data: {"message": "Analyzing causal relationships...", "phase": 3}

event: graph
data: {"nodes": [...], "edges": [...]}

event: sources
data: {"sources": [...]}

event: done
data: {"session_id": "uuid"}
```

The frontend renders each event type as it arrives. `narrative` events are appended to the streaming text panel. `graph` events update React Flow state. `sources` events populate the citations panel.

---

## How the orchestrator coordinates agents

`backend/app/agents/orchestrator.py` is the entry point for all queries. It:

1. Creates or retrieves a session in SQLite
2. Initialises the web search tools and runs DuckDuckGo + Bing concurrently via `asyncio.gather`
3. Yields the session SSE event
4. Instantiates and runs `HistorianAgent`, yielding its narrative chunks as SSE events
5. Once the historian finishes, passes its extracted events to `GraphBuilderAgent` and yields the nodes graph event
6. Launches `CausalAnalystAgent` and yields the edges graph event when done
7. Fire-and-forgets `SourceVerifierAgent` via `asyncio.create_task` — the SSE stream doesn't wait for it
8. Saves the completed graph to the database

---

## TTL search cache

`backend/app/core/cache.py` wraps a `cachetools.TTLCache` with a 1-hour TTL and max 100 entries. Web search results are cached by query string. Repeated queries for the same topic (e.g., two users ask about the French Revolution within an hour) reuse cached search results, skipping the DuckDuckGo/Bing round-trips entirely.

The cache lives in process memory — it does not persist across restarts and is not shared across Cloud Run instances. This is intentional: it's a latency optimisation, not a correctness concern.

---

## SQLite + GCS backup architecture

SQLite was chosen over a managed database for a few reasons: zero operational overhead, works inside a single Cloud Run container, and the data volume is modest (session history, not analytics).

The challenge with Cloud Run is that containers are ephemeral — a new revision wipes local disk. The solution:

1. On startup, the app checks for `data/bastille.db`. If missing, it downloads `bastille.db` from GCS (`BACKUP_BUCKET` env var).
2. Every 5 minutes, a background task uploads the current database file to GCS, overwriting the previous backup.
3. On SIGTERM (Cloud Run shutdown), a final upload runs before the process exits.
4. Schema migrations run at startup via the `schema_migrations` table.

The result: SQLite behaves like a persistent database across container restarts, with at most 5 minutes of potential data loss on an unexpected crash.

If `BACKUP_BUCKET` is not set (local dev), the backup task is a no-op. The database file lives at `DATABASE_PATH` (default `data/bastille.db`).
