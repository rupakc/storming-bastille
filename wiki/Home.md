# Storming Bastille

Storming Bastille is an AI-powered research tool that maps the causal chains behind historical events. You ask a question — "What caused the fall of the Roman Empire?" or "Why did the French Revolution happen?" — and within seconds the app starts building a structured picture of cause and effect: a streamed narrative, an interactive graph of connected events, a zoomable timeline, and a set of cited sources ranked by reliability.

The central idea is **causal discovery**, not just fact retrieval. Most AI assistants return a paragraph. Storming Bastille returns a *graph* — nodes representing discrete historical events, edges representing causal relationships (direct causes, enabling conditions, feedback loops, consequences) with confidence scores attached to each connection. You can edit the graph by hand, save your session, and come back to it later.

---

## Why it exists

History is rarely linear. A war doesn't have one cause; a revolution doesn't have one trigger. The tools most people use to research history — search engines, encyclopedias, AI chat — present information as prose, which flattens causal complexity into narrative sequence. Storming Bastille was built to make those hidden relationships *visible and interactive*.

---

## What a typical session looks like

1. You land on the app and see a set of preset questions across six categories (wars, revolutions, economic crises, scientific breakthroughs, political collapses, cultural shifts).
2. You pick a preset or type your own question.
3. Within 1–2 seconds, narrative text starts streaming in on the left panel — a researched explanation written by an AI historian agent that has already searched the web for context.
4. Simultaneously, a causal graph begins to appear on the right: event nodes materialise as the historian identifies key events. You're not staring at a spinner.
5. A few seconds later, the edges appear — the causal connections between events, colour-coded by relationship type, with confidence scores.
6. A D3-powered timeline fills in below the graph.
7. Source citations appear at the bottom, grouped by reliability tier (Academic > Encyclopedia > News > Web > Blog).
8. You can rename and save the session. Next time you open the app, it's there.

---

## The 4-phase orchestration

The app coordinates five AI agents in a specific sequence designed to minimise time-to-first-pixel:

**Phase 1 — Research and narrative (parallel search + streaming)**
DuckDuckGo and Bing are queried simultaneously. Their results are injected as plain text into the HistorianAgent prompt. The HistorianAgent (Claude Haiku 4.5) streams the narrative in chunks and embeds structured event data as JSON in its output. First token arrives within 1–2 seconds of the query.

**Phase 2 — Graph nodes (immediate after Phase 1)**
The GraphBuilderAgent parses the structured events from the historian's output and converts them into React Flow nodes and timeline data. An SSE event is emitted. Nodes appear on screen within roughly 2 seconds of the query — before any causal analysis is done.

**Phase 3 — Causal edges (async, heavier)**
The CausalAnalystAgent (Claude Sonnet) takes the events and identifies the causal relationships: which events caused which, what kind of causation, how confident the model is. It emits a second SSE event with the edge set. The graph "completes" visually at this point.

**Phase 4 — Source verification (fire-and-forget)**
The SourceVerifierAgent cross-checks claims against the scraped sources and assigns reliability tiers. Results are saved to SQLite and backed up to GCS. This happens in the background after the user already has everything they need to start working.

---

## Wiki pages

| Page | What it covers |
|------|----------------|
| [Architecture](Architecture) | Pipeline diagram, SSE event sequence, search injection, backup strategy |
| [Agent System](Agent-System) | All 5 agents, models used, output schemas, confidence scoring, web search |
| [Setup and Installation](Setup-and-Installation) | Prerequisites, local dev, environment config, first login |
| [Configuration](Configuration) | Every environment variable, defaults, what breaks without it |
| [API Reference](API-Reference) | All endpoints, SSE event schema, request/response shapes |
| [Frontend](Frontend) | Next.js structure, Zustand store, custom hooks, React Flow, D3 |
| [Deployment](Deployment) | GCP Cloud Run, Terraform, GitHub Actions, GCS backup, cost |
| [Security](Security) | JWT auth, scanning tools, CORS, secret management |
