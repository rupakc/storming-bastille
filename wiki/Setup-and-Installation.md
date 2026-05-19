# Setup and Installation

## Prerequisites

- **Python 3.12+** — the backend uses modern async patterns and type hints that require 3.12
- **Bun** — the frontend package manager and dev server (faster than npm/yarn for this setup)
- **uv** — Python package manager for the backend (`pip install uv` or see [uv docs](https://docs.astral.sh/uv/))
- **Anthropic API key** — the app won't start without one; get one at [console.anthropic.com](https://console.anthropic.com)

Optional for production:
- Docker (for containerised local testing)
- GCP account + `gcloud` CLI (for Cloud Run deployment)

---

## Quick start with start.sh

The repository includes a `start.sh` script that handles everything:

```bash
git clone https://github.com/rupakc/storming-bastille.git
cd storming-bastille
cp backend/.env.example backend/.env
# Edit backend/.env and add your ANTHROPIC_API_KEY
./start.sh
```

`start.sh` installs backend dependencies via `uv sync`, installs frontend dependencies via `bun install`, and starts both servers concurrently:
- Backend: `http://localhost:8000`
- Frontend: `http://localhost:3000`

Logs from both processes are interleaved in the terminal. Use Ctrl+C to stop both.

---

## Manual setup

If you need to run backend and frontend separately (e.g., for debugging, or running just one side):

### Backend

```bash
cd backend
uv sync                                              # installs from pyproject.toml into .venv
cp .env.example .env
# edit .env — at minimum set ANTHROPIC_API_KEY
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The `--reload` flag enables hot-reload on file changes. Remove it for slightly faster startup in repeated testing.

On first startup, the app creates `data/bastille.db` and runs schema migrations automatically. If `BACKUP_BUCKET` is set, it attempts to restore from GCS before creating a fresh database.

### Frontend

```bash
cd frontend
bun install
cp .env.local.example .env.local
# edit .env.local if backend is not at localhost:8000
bun dev
```

The frontend connects to the backend at `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`). If you're running the backend on a different port or host, set this variable.

---

## Environment file setup

### Backend: `backend/.env`

Copy `backend/.env.example` and fill in the required values:

```env
# Required
ANTHROPIC_API_KEY=sk-ant-...

# Optional — defaults shown
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
FRONTEND_URL=http://localhost:3000
DATABASE_PATH=data/bastille.db
LOG_LEVEL=INFO
JWT_SECRET_KEY=change-this-in-production
ADMIN_USERNAME=admin
ADMIN_PASSWORD=changeme
BACKUP_BUCKET=                    # leave blank for local dev
```

See the [Configuration](Configuration) page for a full description of every variable.

### Frontend: `frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

For production deployments this points to the Cloud Run backend URL.

---

## First login

The backend seeds an admin account on first startup using `ADMIN_USERNAME` and `ADMIN_PASSWORD`. Navigate to `http://localhost:3000`, click "Sign in", and use those credentials.

After logging in you can:
- Change your password via the account menu (calls `PATCH /auth/change-password`)
- Create additional user accounts via the admin panel at `/admin` (admin-only)

---

## Running tests

```bash
cd backend
uv run pytest tests/ -v
```

The test suite covers agents (with mocked Anthropic responses), API routes, database operations, and the web search tools. Coverage is tracked — the project targets 91% line coverage.

To run with coverage report:

```bash
uv run pytest tests/ --cov=app --cov-report=term-missing
```

Frontend tests:

```bash
cd frontend
bun test
```

---

## Common problems and fixes

**`ANTHROPIC_API_KEY not set` error on startup**
The app will refuse to start without this key. Make sure `backend/.env` exists and the key is set correctly (starts with `sk-ant-`).

**Port 8000 already in use**
Either kill the existing process (`lsof -ti:8000 | xargs kill`) or change `BACKEND_PORT` in `.env` and update `NEXT_PUBLIC_API_URL` in the frontend accordingly.

**`ModuleNotFoundError` on backend start**
Run `uv sync` again — the lockfile may be ahead of your local virtualenv. If you're not using `uv run`, ensure you've activated the `.venv` with `source backend/.venv/bin/activate`.

**Frontend shows "Failed to connect to backend"**
Check that the backend is running and that `NEXT_PUBLIC_API_URL` in `frontend/.env.local` matches the backend host and port.

**Database permission error**
The `data/` directory needs to be writable. Run `mkdir -p backend/data && chmod 755 backend/data`.

**Graph nodes appear but no edges**
This usually means the CausalAnalystAgent timed out or returned malformed JSON. Check backend logs for `causal_analyst` entries. The historian and graph builder can succeed independently of the analyst.

**Bun not found**
Install Bun: `curl -fsSL https://bun.sh/install | bash` and restart your shell.
