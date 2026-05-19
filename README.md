# Storming Bastille

**Discover the hidden connections between historical events.**

An AI-powered web application that uncovers causal relationships in history. Ask any free-text question and receive a streaming, interactive analysis: a Claude-generated narrative, an editable causal graph, a D3 timeline, and verified source citations — all rendered progressively as the pipeline runs.

![System Architecture](system_architecture.png)

---

## Live Demo

| | URL |
|---|---|
| **Frontend** | https://storming-bastille-frontend-2hrxgxqboa-uc.a.run.app |
| **Backend API** | https://storming-bastille-backend-2hrxgxqboa-uc.a.run.app/docs |

> Hosted on Google Cloud Run (us-central1). Cold starts may add 2–3 seconds on first request.

---

## Features

- **Streaming AI narratives** — Claude streams the response word-by-word via SSE so you see results in seconds
- **Interactive causal graphs** — drag, edit, add, and remove nodes and edges in a React Flow visualization
- **D3 timeline** — zoomable chronological view of events
- **Parallel web research** — DuckDuckGo + Bing searched simultaneously; results deduplicated
- **Source verification** — claims cross-checked across multiple sources before citation
- **Two-phase graph rendering** — nodes appear immediately; edges are added once causal analysis completes
- **Follow-up conversations** — full session context preserved so follow-ups feel natural
- **Auto-saved sessions** — every query persists to SQLite; name, reload, and continue any past session
- **Export graph** — download causal graph as PNG
- **Dark / light mode** — system-aware with manual toggle
- **Preset prompts** — 12 curated starter questions across 6 historical categories

---

## Architecture

```
User Query
    │
    ▼
┌────────────────────────────────────────────────────────┐
│  Frontend  (Next.js 15 + React 19 + TailwindCSS v4)   │
│  SearchBox → StreamingNarrative → CausalGraph          │
│                               → Timeline + Sources     │
└───────────────────────┬────────────────────────────────┘
                        │  SSE  POST /api/query
                        ▼
┌────────────────────────────────────────────────────────┐
│  Backend  (FastAPI + Python 3.12)                      │
│                                                        │
│  QueryOrchestrator                                     │
│    │                                                   │
│    ├── Phase 1 ─ HistorianAgent                        │
│    │             ├── DuckDuckGo + Bing (parallel)      │
│    │             ├── Stream narrative via SSE          │
│    │             └── Extract event list                │
│    │                                                   │
│    ├── Phase 2 ─ GraphBuilder                          │
│    │             └── Emit nodes immediately (no edges) │
│    │                                                   │
│    ├── Phase 3 ─ CausalAnalystAgent                    │
│    │             └── Add edges + confidence scores     │
│    │                                                   │
│    └── Phase 4 ─ SourceVerifier + DB persist           │
│                                                        │
│  Cache: TTL 30 min (search results)                    │
│  Database: SQLite via aiosqlite                        │
└────────────────────────────────────────────────────────┘
```

The two-phase graph approach means the user sees nodes within seconds of the narrative starting; edges appear once the heavier causal analysis completes.

---

## Tech Stack

### Backend

| Package | Version | Purpose |
|---------|---------|---------|
| fastapi | ≥ 0.115 | Async web framework |
| uvicorn | ≥ 0.32 | ASGI server |
| anthropic | ≥ 0.40 | Claude API — streaming + tool use |
| sse-starlette | ≥ 2.1 | Server-Sent Events |
| aiosqlite | ≥ 0.20 | Async SQLite |
| duckduckgo-search | ≥ 7.0 | DuckDuckGo web search |
| httpx | ≥ 0.28 | Async HTTP (Bing search) |
| beautifulsoup4 | ≥ 4.12 | HTML parsing |
| pydantic-settings | ≥ 2.6 | Env-based config |
| cachetools | ≥ 5.5 | TTL in-memory cache |
| pyjwt | ≥ 2.12 | JWT auth |

Dev: `pytest`, `pytest-asyncio`, `ruff`

### Frontend

| Package | Version | Purpose |
|---------|---------|---------|
| next | ^15.3 | React framework with App Router |
| react | ^19.1 | UI library |
| @xyflow/react | ^12.6 | Causal graph (React Flow v12) |
| d3 | ^7.9 | Timeline visualization |
| dagre | ^0.8 | Auto graph layout |
| tailwindcss | ^4.1 | Utility-first CSS |
| motion | ^12.6 | Animations (Framer Motion) |
| zustand | ^5.0 | Global state |
| react-markdown | ^10.1 | Narrative rendering |
| next-themes | ^0.4 | Dark / light mode |
| html-to-image | ^1.11 | Export graph as PNG |
| lucide-react | ^0.475 | Icons |

---

## Prerequisites

- **Python 3.12+**
- **uv** — `curl -LsSf https://astral.sh/uv/install.sh | sh`
- **Bun** — `curl -fsSL https://bun.sh/install | bash`
- **Anthropic API key** — [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)

---

## Quick Start

```bash
git clone https://github.com/rupakc/storming-bastille.git
cd storming-bastille

# Set your API key
cp .env.example .env
# edit .env → ANTHROPIC_API_KEY=sk-ant-...

# Install deps + start both servers
./start.sh
```

Open **http://localhost:3000**. Backend API at **http://localhost:8000/docs**.

```bash
./stop.sh   # graceful shutdown
```

---

## Manual Setup

### Backend

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
bun install
bun dev
```

---

## Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | **Yes** | — | Claude API key |
| `BACKEND_HOST` | No | `0.0.0.0` | Backend bind address |
| `BACKEND_PORT` | No | `8000` | Backend port |
| `LOG_LEVEL` | No | `INFO` | `DEBUG` / `INFO` / `WARNING` / `ERROR` |
| `FRONTEND_URL` | No | `http://localhost:3000` | Used for CORS |
| `DATABASE_PATH` | No | `data/bastille.db` | SQLite path |

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/query` | Submit a query — returns SSE stream |
| `GET` | `/api/presets` | 12 curated starter prompts |
| `GET` | `/api/sessions` | List all saved sessions |
| `GET` | `/api/sessions/:id` | Load a session |
| `POST` | `/api/sessions` | Save and name a session |
| `DELETE` | `/api/sessions/:id` | Delete a session |
| `PATCH` | `/api/sessions/:id/graph` | Persist an edited causal graph |
| `GET` | `/health` | Health check |

### SSE event stream

The `/api/query` endpoint streams these event types:

| Event | Payload |
|-------|---------|
| `narrative_chunk` | Text fragment (rendered progressively) |
| `graph_update` | React Flow nodes + edges payload |
| `timeline_update` | D3 timeline data |
| `source_citations` | Verified source list |
| `status` | Pipeline phase indicator |
| `done` | Stream complete |

---

## Project Structure

```
storming-bastille/
├── backend/
│   └── app/
│       ├── main.py                   # FastAPI app, CORS, routers
│       ├── core/
│       │   ├── config.py             # Env settings
│       │   ├── anthropic_client.py   # Shared AsyncAnthropic singleton
│       │   └── cache.py              # TTL cache
│       ├── agents/
│       │   ├── orchestrator.py       # Pipeline coordinator
│       │   ├── historian.py          # Research + web search
│       │   ├── causal_analyst.py     # Cause-effect analysis
│       │   ├── graph_builder.py      # React Flow schema output
│       │   ├── source_verifier.py    # Claim cross-verification
│       │   └── followup.py           # Conversation context
│       ├── tools/
│       │   ├── web_search.py         # DuckDuckGo + Bing parallel search
│       │   └── source_fetcher.py     # URL content extraction
│       ├── api/routes/               # query, sessions, presets, health, auth
│       ├── db/                       # SQLite schema + queries
│       └── schemas/                  # Pydantic models
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── graph/                # CausalGraph, EventNode, CausalEdge, GraphEditor
│       │   ├── timeline/             # D3 Timeline, TimelineEvent
│       │   ├── results/              # StreamingNarrative, SourceCitations, FollowUpInput
│       │   ├── search/               # SearchBox, PresetPrompts
│       │   └── sessions/             # SessionList, SaveDialog
│       ├── hooks/                    # useStreamingQuery, useGraph, useSessions
│       └── lib/                      # api, sse, graph-layout, types, utils
├── .agents/                          # Claude agent definitions
│   ├── orchestrator.md
│   ├── historian.md
│   ├── causal-analyst.md
│   └── graph-builder.md
├── .claude/                          # Claude Code settings, hooks, skills
├── scripts/
│   └── generate_architecture.py      # Regenerate system_architecture.png
├── start.sh / stop.sh
└── .env.example
```

---

## Development

```bash
# Backend tests
cd backend && uv run pytest tests/ -v

# Backend lint + format
cd backend && uv run ruff check app/ --fix
cd backend && uv run ruff format app/

# Regenerate architecture diagram
python3 scripts/generate_architecture.py
```

---

## Adding a New Agent

1. Create `backend/app/agents/{name}.py`, inherit from `BaseAgent`
2. Write a focused system prompt in the constructor
3. Implement the specialist method (`analyze()`, `research()`, etc.)
4. Wire into `orchestrator.py` at the right pipeline phase
5. Add tests in `backend/tests/`
6. Create `.agents/{name}.md` with the agent definition

---

## How It Works

1. User submits a free-text question about history
2. The orchestrator extracts entities, time period, and geographic scope
3. **Phase 1** — HistorianAgent searches DuckDuckGo + Bing in parallel, streams a narrative, and extracts a list of events
4. **Phase 2** — GraphBuilder converts events to React Flow nodes and emits them immediately so the graph appears fast
5. **Phase 3** — CausalAnalystAgent identifies cause-effect relationships and adds labelled edges to the graph
6. **Phase 4** — SourceVerifier cross-checks claims; session saved to SQLite
7. The user can drag nodes, ask follow-up questions, save the session, and export the graph as PNG

---

## License

MIT
