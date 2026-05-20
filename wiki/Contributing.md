# Contributing

Contributions are welcome. This page explains how to set up a development environment, the code style requirements, how to run tests and lints, and the PR process.

---

## Development setup

Follow the same steps as [Setup and Installation](Setup-and-Installation). You need:

- Python 3.12+
- uv (`pip install uv` or see [uv docs](https://docs.astral.sh/uv/))
- Bun (`curl -fsSL https://bun.sh/install | bash`)
- An Anthropic API key (set in `backend/.env`)

```bash
git clone https://github.com/rupakc/storming-bastille.git
cd storming-bastille
cp backend/.env.example backend/.env
# Edit backend/.env and set ANTHROPIC_API_KEY
./start.sh
```

This starts the backend on `http://localhost:8000` and the frontend on `http://localhost:3000`.

For backend-only work, run the two servers separately:

```bash
# Backend
cd backend
uv sync
uv run uvicorn app.main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
bun install
bun dev
```

---

## Code style

### Python (backend)

The project uses [ruff](https://docs.astral.sh/ruff/) for both linting and formatting.

```bash
cd backend
uv run ruff check app/          # lint
uv run ruff format app/         # format
```

`ruff check` runs with the configuration in `pyproject.toml`. Fix all lint errors before opening a PR — the CI pipeline fails on any ruff warning.

Type hints are expected on all function signatures. The project uses Python 3.12 and makes use of modern union syntax (`X | Y` rather than `Optional[X]`).

### TypeScript (frontend)

The project uses ESLint with the Next.js recommended configuration.

```bash
cd frontend
bun lint           # ESLint check
bun run build      # TypeScript type-check + production build
```

A clean `bun run build` is required before a PR can merge. Type errors and ESLint errors both fail the build.

---

## Running tests

### Backend

```bash
cd backend
uv run pytest tests/ -v
```

To run with a coverage report:

```bash
uv run pytest tests/ --cov=app --cov-report=term-missing
```

The project targets 91% line coverage. New agent code should include tests with mocked Anthropic responses — see the existing agent tests in `backend/tests/` for the pattern.

### Frontend

```bash
cd frontend
bun test
```

---

## Adding a new agent

1. Create `backend/app/agents/{name}.py` and inherit from `BaseAgent` (`backend/app/agents/base_agent.py`).
2. Write a focused system prompt. Agents should do one thing well — avoid combining research, analysis, and output formatting in a single prompt.
3. Implement the specialist method (e.g., `analyze()`, `research()`). Use `_call_claude()` for non-streaming calls and the streaming variant for token-by-token output.
4. Wire the agent into `orchestrator.py` at the appropriate pipeline phase. If the agent can run in parallel with an existing phase, use `asyncio.gather`. If it must run sequentially, add it after the phase it depends on.
5. Add tests in `backend/tests/agents/` with a mocked Anthropic client.

The five existing agents are good reference implementations:
- `historian.py` — streaming output with embedded structured JSON
- `causal_analyst.py` — non-streaming structured JSON output
- `graph_builder.py` — pure Python, no AI call
- `source_verifier.py` — fire-and-forget with tiered output
- `followup.py` — conversational agent with session context

---

## Commit message style

Use [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | When to use |
|--------|-------------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation only |
| `refactor:` | Code change that neither fixes a bug nor adds a feature |
| `test:` | Adding or updating tests |
| `chore:` | Build process, dependency updates, CI changes |

Examples:

```
feat: add FollowUpAgent with session context summarization
fix: handle missing JSON block in historian output
docs: add Architecture wiki page
refactor: extract search deduplication into utility function
```

Keep the subject line under 72 characters. Use the body for context when the change is non-obvious.

---

## Pull request process

1. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make your changes.** Run tests and lints locally before pushing:
   ```bash
   cd backend && uv run ruff check app/ && uv run pytest tests/ -v
   cd frontend && bun lint && bun run build
   ```

3. **Open a PR against `main`.** The PR description should explain what the change does and why, not just what files were edited.

4. **All CI checks must pass** before the PR can be merged:
   - `ruff check` — no lint errors
   - `pytest` — all tests pass, coverage above threshold
   - `bun run build` — TypeScript compiles, no ESLint errors
   - Bandit SAST scan — no high-severity findings
   - pip-audit — no known CVEs in dependencies
   - Trivy container scan — no critical vulnerabilities

5. **Address review comments** on the PR. Once approved and CI is green, the PR can be squash-merged into `main`.

Do not push directly to `main`. All changes go through PRs.

---

## Reporting bugs and requesting features

Use [GitHub Issues](https://github.com/rupakc/storming-bastille/issues). For bugs, include:
- Steps to reproduce
- Expected behaviour
- Actual behaviour
- Backend logs if relevant (the backend logs to stdout; `./start.sh` output or `docker logs` if containerised)
- Browser console errors if the issue is on the frontend
