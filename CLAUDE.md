# Storming Bastille

Historical events connection and causal reasoning web application. Users ask free-text questions about history and receive streaming AI-powered analysis with interactive causal graphs, timelines, and verified sources.

## Architecture

```
User Query
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  Frontend (Next.js 15 + React 19 + TailwindCSS)            │
│  ┌──────────┐  ┌──────────────┐  ┌────────────┐            │
│  │SearchBox │──│StreamNarrative│  │CausalGraph │            │
│  │Presets   │  │SourceCites   │  │(React Flow)│            │
│  │FollowUp │  │SaveDialog    │  │Timeline(D3)│            │
│  └──────────┘  └──────────────┘  └────────────┘            │
└────────────────────────┬────────────────────────────────────┘
                         │ SSE (POST /api/query)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Backend (FastAPI + Python 3.12)                            │
│                                                             │
│  QueryOrchestrator                                          │
│  ┌─────────┐  ┌──────────────┐  ┌────────────────┐         │
│  │Historian │──│CausalAnalyst │──│ GraphBuilder   │         │
│  │(research)│  │(relationships│  │(React Flow     │         │
│  └────┬─────┘  │ & causation) │  │ schema output) │         │
│       │        └──────────────┘  └────────────────┘         │
│       │  ┌────────────────┐  ┌─────────────┐               │
│       ├──│SourceVerifier  │  │FollowUpAgent│               │
│       │  │(fact-checking) │  │(context mgmt│               │
│       │  └────────────────┘  └─────────────┘               │
│       ▼                                                     │
│  ┌──────────────────┐                                       │
│  │ Deep Search       │                                      │
│  │ (DuckDuckGo +    │──── Cache (TTL 30min)                │
│  │  Bing parallel)  │                                       │
│  └──────────────────┘                                       │
│                                                             │
│  SQLite (sessions, queries, graphs) ◄── aiosqlite          │
│  Claude API (Anthropic SDK) ◄── streaming + tool use        │
└─────────────────────────────────────────────────────────────┘
```

## Project Layout

```
storming-bastille/
├── CLAUDE.md                    # This file
├── README.md                    # Setup guide, tech stack
├── start.sh                     # Start both servers
├── stop.sh                      # Stop both servers
├── .env.example                 # Environment template
│
├── backend/
│   ├── pyproject.toml           # Python deps (uv)
│   ├── app/
│   │   ├── main.py              # FastAPI app, lifespan, CORS, routers
│   │   ├── core/
│   │   │   ├── config.py        # pydantic-settings env config
│   │   │   ├── anthropic_client.py  # Shared AsyncAnthropic singleton
│   │   │   └── cache.py         # TTL cache for search results
│   │   ├── agents/
│   │   │   ├── base_agent.py    # BaseAgent with run() and stream()
│   │   │   ├── orchestrator.py  # Central pipeline: research → analyze → graph → stream
│   │   │   ├── historian.py     # Historical fact extraction + web search
│   │   │   ├── causal_analyst.py    # Causal relationship identification
│   │   │   ├── source_verifier.py   # Cross-verification of claims
│   │   │   ├── graph_builder.py     # React Flow graph schema generation
│   │   │   └── followup.py     # Follow-up context management
│   │   ├── tools/
│   │   │   ├── web_search.py    # DuckDuckGo + Bing parallel search
│   │   │   └── source_fetcher.py    # URL content extraction
│   │   ├── api/routes/
│   │   │   ├── query.py         # POST /api/query (SSE streaming)
│   │   │   ├── sessions.py      # CRUD /api/sessions
│   │   │   ├── presets.py       # GET /api/presets
│   │   │   └── health.py        # GET /health
│   │   ├── schemas/             # Pydantic models
│   │   ├── db/                  # SQLite via aiosqlite
│   │   └── prompts/presets.json # Starter prompts
│   └── tests/
│
├── frontend/
│   ├── package.json             # Node deps (bun)
│   ├── next.config.ts           # API proxy to backend
│   ├── src/
│   │   ├── app/                 # Next.js App Router pages
│   │   ├── components/
│   │   │   ├── search/          # SearchBox, PresetPrompts, SearchPage
│   │   │   ├── results/         # StreamingNarrative, SourceCitations, FollowUp
│   │   │   ├── graph/           # CausalGraph, EventNode, CausalEdge, GraphEditor
│   │   │   ├── timeline/        # D3 Timeline, TimelineEvent
│   │   │   ├── sessions/        # SessionList, SessionCard, SaveDialog
│   │   │   └── shared/          # Navigation, Logo, LoadingState
│   │   ├── hooks/               # useStreamingQuery, useGraph, useSessions, usePresets
│   │   ├── lib/                 # api, sse, graph-layout, types, utils
│   │   └── providers/           # ThemeProvider, QueryProvider
│   └── public/
│
├── .agents/                     # Claude agent definitions
├── .claude/                     # Claude Code settings, skills, hooks
└── scripts/                     # Architecture diagram generator
```

## Commands

```bash
# Setup
./start.sh                         # Install deps + start backend and frontend
./stop.sh                          # Stop all servers

# Backend
cd backend && uv sync              # Install Python deps
cd backend && uv run uvicorn app.main:app --reload   # Dev server on :8000

# Frontend
cd frontend && bun install         # Install Node deps
cd frontend && bun dev             # Dev server on :3000

# Tests
cd backend && uv run pytest tests/ -v

# Linting
cd backend && uv run ruff check app/
cd backend && uv run ruff format app/
```

## Key Conventions

- **Agents are specialists.** Each agent (historian, causal analyst, etc.) has a focused system prompt and single responsibility.
- **Orchestrator coordinates.** The QueryOrchestrator runs agents in parallel where possible and streams SSE events progressively.
- **Streaming-first.** All query responses stream via SSE. The frontend renders progressively.
- **Two search engines.** DuckDuckGo and Bing are searched in parallel and results are deduplicated.
- **Intent understanding first.** Before searching, the orchestrator extracts entities, time period, and scope from the user query.
- **Cross-verification.** The SourceVerifier cross-checks historical claims against multiple sources.
- **Graph is editable.** Users can drag, add, remove, and edit nodes/edges in the causal graph.
- **Sessions persist.** All queries auto-save to SQLite. Users can name and reload sessions.
- **Follow-up context.** Previous conversation is summarized and prepended for follow-up questions.

## Adding a New Agent

1. Create `backend/app/agents/{name}.py`, inherit from `BaseAgent`
2. Write a focused system prompt
3. Implement the specialist method (e.g., `analyze()`, `research()`)
4. Wire into `orchestrator.py` at the appropriate pipeline phase
5. Add tests in `backend/tests/`

## Dependencies

### Backend
- **fastapi** + **uvicorn** — Async web framework
- **anthropic** — Claude API SDK (streaming + tool use)
- **httpx** — Async HTTP client
- **aiosqlite** — Async SQLite
- **duckduckgo-search** — Web search
- **beautifulsoup4** — HTML parsing
- **sse-starlette** — Server-Sent Events for FastAPI
- **pydantic-settings** — Environment config

### Frontend
- **Next.js 15** + **React 19** — App Router, SSR
- **@xyflow/react** — Interactive causal graph (React Flow v12)
- **d3** — Timeline visualization
- **motion** — Animations
- **tailwindcss v4** — Utility-first CSS
- **zustand** — Lightweight state management
- **react-markdown** — Narrative rendering
- **next-themes** — Dark/light mode
