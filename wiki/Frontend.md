# Frontend

The frontend is a Next.js 15.5 application using the App Router, React 19, TypeScript, and TailwindCSS 4. It communicates with the backend exclusively via the REST API and SSE stream.

---

## Directory structure

```
frontend/src/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Root layout — providers, theme, fonts
│   ├── page.tsx                # Home page — search box + results
│   ├── sessions/               # Session management pages
│   └── admin/                  # Admin-only pages (user management)
├── components/
│   ├── graph/
│   │   ├── CausalGraph.tsx     # Main React Flow wrapper
│   │   ├── EventNode.tsx       # Custom node component
│   │   └── CausalEdge.tsx      # Custom edge component
│   ├── results/
│   │   ├── StreamingNarrative.tsx  # Markdown + streaming text display
│   │   └── SourceCitations.tsx     # Citations panel, grouped by tier
│   ├── search/
│   │   ├── SearchBox.tsx       # Query input with submit
│   │   └── PresetPrompts.tsx   # 12 starter question cards
│   ├── timeline/
│   │   └── D3Timeline.tsx      # D3 zoomable timeline
│   └── sessions/
│       ├── SessionList.tsx     # Sidebar session list
│       └── SaveDialog.tsx      # Name-and-save modal
├── hooks/
│   ├── useStreamingQuery.ts    # SSE connection + event parsing
│   ├── useGraph.ts             # React Flow state management
│   ├── useSessions.ts          # Session CRUD
│   └── usePresets.ts           # Preset question fetching
├── lib/
│   ├── api.ts                  # Typed fetch wrappers for all API calls
│   ├── sse.ts                  # SSE client utilities
│   ├── types.ts                # Shared TypeScript types
│   └── utils.ts                # Helpers (classnames, date formatting)
└── providers/
    ├── AuthProvider.tsx        # JWT context + login/logout
    └── ThemeProvider.tsx       # next-themes dark/light wrapper
```

---

## Next.js App Router structure

The app uses the App Router (not Pages Router). Route segments:
- `/` — the main analysis page (search + results)
- `/sessions` — session list and session detail view
- `/admin` — user management (redirects non-admins)

Client components (those using hooks, browser APIs, or event handlers) are marked with `"use client"`. Server components are used for static layout, metadata, and font loading.

---

## Zustand store

State is managed by a single Zustand store (`frontend/src/lib/store.ts` or similar). The store holds:

- `currentQuery` — the active question string
- `sessionId` — active session UUID
- `narrative` — accumulated streaming text
- `nodes` / `edges` — React Flow graph state
- `timeline` — D3 timeline data
- `sources` — citation list
- `isStreaming` — boolean, true while SSE is open
- `streamingPhase` — current phase number (1–4), used for progress indicator

The store is not persisted to localStorage — sessions are persisted server-side. On page reload, the last active session is re-fetched from the API.

---

## Custom hooks

### useStreamingQuery

`frontend/src/hooks/useStreamingQuery.ts`

Opens an SSE connection to `POST /api/query`, parses each event type, and dispatches to the Zustand store. Key behaviours:

- Uses the Fetch API with `ReadableStream` (not the `EventSource` API) so POST requests with a body are supported — `EventSource` only does GET
- Maintains an internal buffer to handle cases where multiple SSE events arrive in the same chunk
- On `narrative` events: appends the chunk to the `narrative` store field
- On first `graph` event: sets nodes and timeline, leaves edges empty
- On second `graph` event: merges edges into existing node state
- On `done` or error: sets `isStreaming = false`, closes the stream
- Exposes a `cancel()` function that aborts the fetch and closes the stream

### useGraph

`frontend/src/hooks/useGraph.ts`

Wraps React Flow's internal state with the app's graph data. Handles:

- Receiving node/edge arrays from the store and converting to React Flow format
- Running Dagre layout when edges are first added
- Exposing `onNodesChange` and `onEdgesChange` handlers for user edits
- `saveGraph()` — debounced call to `PATCH /api/sessions/{id}/graph` after user edits
- `exportPNG()` — uses React Flow's `getNodes()` + HTML Canvas to export the graph as a PNG file

### useSessions

`frontend/src/hooks/useSessions.ts`

Manages session CRUD:
- `sessions` — list of the user's sessions
- `loadSession(id)` — fetches full session detail and restores narrative + graph state
- `saveCurrentSession(name)` — creates or renames the active session
- `deleteSession(id)` — deletes and removes from list

### usePresets

`frontend/src/hooks/usePresets.ts`

Fetches the 12 preset questions from `GET /api/presets` on mount. Simple: no pagination, no caching beyond the component lifecycle.

---

## React Flow integration

`CausalGraph.tsx` wraps the React Flow `<ReactFlow>` component with:

- `nodeTypes={{ eventNode: EventNode }}` — registers the custom node
- `edgeTypes={{ causalEdge: CausalEdge }}` — registers the custom edge
- Controls panel (zoom in/out, fit view, export PNG)
- MiniMap for orientation on large graphs
- Background grid pattern

**EventNode (`graph/EventNode.tsx`):**
Renders as a styled card with: event name (bold), date (muted), type badge (colour-coded: political/military/economic/social/cultural), and a truncated description. Handle positions: left (target) and right (source). Selected state shows a highlighted border.

**CausalEdge (`graph/CausalEdge.tsx`):**
Custom edge component using React Flow's `getStraightPath` or `getBezierPath`. Opacity is set from `data.confidence` (0.3–1.0 → 30%–100% opacity). Edge label shows the relationship type on hover. Colour is determined by relationship type:
- `direct_cause` — red
- `contributing_factor` — orange
- `enabling_condition` — yellow
- `consequence` — blue
- `feedback_loop` — purple

---

## D3 timeline integration

`D3Timeline.tsx` renders a zoomable horizontal timeline using D3.js 7. Events are positioned by their `date_numeric` value (decimal year). Zoom is handled by `d3.zoom()` with x-axis rescaling. Clicking a timeline event highlights the corresponding node in React Flow (via shared event ID).

The timeline is rendered into a `<svg>` element via a `useEffect` hook that runs D3 imperatively. D3 manages the DOM inside the SVG directly; React manages the container. This is intentional — mixing React and D3 for the same DOM nodes causes conflicts.

---

## SSE parsing in useStreamingQuery

The Fetch API returns a `ReadableStream<Uint8Array>`. The hook reads this with a `TextDecoder` and accumulates text until it finds complete `event:` / `data:` pairs. SSE events are separated by blank lines (`\n\n`). The parser:

1. Splits on `\n\n`
2. For each complete event block, extracts the `event:` type and `data:` JSON
3. Calls the appropriate Zustand action
4. Leaves incomplete blocks in a carry buffer for the next chunk

---

## Theme switching

`ThemeProvider.tsx` wraps `next-themes`'s `ThemeProvider`. The root layout applies the theme class to `<html>`. TailwindCSS 4 uses CSS variables for all colour tokens — switching theme classes swaps the variable values, no JavaScript rerender needed.

The theme toggle button (in the top navigation) calls `useTheme().setTheme(...)` from next-themes.

---

## Auth flow and protected routes

`AuthProvider.tsx` holds the JWT token in memory (not localStorage, to reduce XSS surface area). On mount, it attempts to restore the session from a `httpOnly` cookie managed by Next.js middleware — if the cookie is present and the token is valid, the user is considered logged in without showing the login screen.

Protected routes check `useAuth().isAuthenticated`. If false, they redirect to the login page. The login form calls `POST /auth/login`, stores the returned token, and redirects to `/`.

Admin routes additionally check `useAuth().user.is_admin` and redirect non-admin users.
