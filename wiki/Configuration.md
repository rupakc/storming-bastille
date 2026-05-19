# Configuration

All backend configuration lives in `backend/app/core/config.py`, implemented as a Pydantic `BaseSettings` class. Values are read from environment variables or a `.env` file in the `backend/` directory.

---

## Environment variables

### ANTHROPIC_API_KEY

| | |
|---|---|
| **Required** | Yes |
| **Default** | None |
| **Format** | `sk-ant-api03-...` |

Your Anthropic API key. The app will raise a startup error if this is missing. All Claude API calls (HistorianAgent, CausalAnalystAgent, SourceVerifierAgent, FollowUpAgent) use this key.

Without it: the application will not start.

---

### BACKEND_HOST

| | |
|---|---|
| **Required** | No |
| **Default** | `0.0.0.0` |

The host address the Uvicorn server binds to. `0.0.0.0` binds to all interfaces, which is required for Docker and Cloud Run. Use `127.0.0.1` if you only need local access and want to avoid binding to external interfaces.

---

### BACKEND_PORT

| | |
|---|---|
| **Required** | No |
| **Default** | `8000` |

The port Uvicorn listens on. If you change this, update `NEXT_PUBLIC_API_URL` in the frontend `.env.local` to match.

---

### FRONTEND_URL

| | |
|---|---|
| **Required** | No |
| **Default** | `http://localhost:3000` |

Used in the CORS configuration to allow the frontend to call the backend. In production, set this to your Cloud Run frontend URL or custom domain. If this is wrong, browser requests will be blocked with a CORS error.

Without correct value: frontend cannot reach backend API (CORS blocked).

---

### DATABASE_PATH

| | |
|---|---|
| **Required** | No |
| **Default** | `data/bastille.db` |

Path to the SQLite database file. Relative paths are resolved from the directory where Uvicorn is started (`backend/`). The `data/` directory is created automatically on startup if it doesn't exist.

In Docker and Cloud Run, this should be a path inside the container. The file is ephemeral unless `BACKUP_BUCKET` is set.

---

### LOG_LEVEL

| | |
|---|---|
| **Required** | No |
| **Default** | `INFO` |
| **Values** | `DEBUG`, `INFO`, `WARNING`, `ERROR` |

Controls structlog output verbosity. Use `DEBUG` locally to see full agent prompts and responses in the logs. In production `INFO` is appropriate — `DEBUG` will log the full Claude prompt and response for every query, which is verbose and may include user data.

---

### JWT_SECRET_KEY

| | |
|---|---|
| **Required** | No (but must be changed for production) |
| **Default** | A hardcoded development placeholder |

The HMAC secret used to sign and verify JWT tokens. If left at the default, tokens signed in one environment will be verifiable in any other environment running the same default — which is a security risk in production.

In production: set this to a random 32+ character string and store it in GCP Secret Manager.

Without correct value (in production): session tokens from previous deployments may remain valid indefinitely.

---

### ADMIN_USERNAME

| | |
|---|---|
| **Required** | No |
| **Default** | `admin` |

The username of the seeded admin account created on first startup. If an account with this username already exists in the database, the seed is skipped.

---

### ADMIN_PASSWORD

| | |
|---|---|
| **Required** | No |
| **Default** | `changeme` |

The initial password for the admin account. This is hashed with bcrypt before storage — the plaintext is never written to the database.

Change this immediately after first login, especially in any non-local environment.

---

### BACKUP_BUCKET

| | |
|---|---|
| **Required** | No |
| **Default** | Empty (backup disabled) |
| **Format** | GCS bucket name only, e.g. `my-bastille-backups` (no `gs://` prefix) |

When set, the app:
- Downloads `bastille.db` from this bucket on startup (if the local file doesn't exist)
- Uploads `bastille.db` to this bucket every 5 minutes
- Uploads `bastille.db` to this bucket on SIGTERM

Leave blank for local development. Required for persistent data on Cloud Run.

The GCS client uses Application Default Credentials — in Cloud Run, attach the service account with Storage Object Admin on this bucket.

Without correct value (on Cloud Run): data is lost on container restart.

---

## The .env.example template

```env
# Required
ANTHROPIC_API_KEY=sk-ant-

# Server
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
FRONTEND_URL=http://localhost:3000

# Database
DATABASE_PATH=data/bastille.db

# Auth
JWT_SECRET_KEY=replace-this-with-a-random-secret
ADMIN_USERNAME=admin
ADMIN_PASSWORD=changeme

# GCS backup (optional)
BACKUP_BUCKET=

# Logging
LOG_LEVEL=INFO
```

---

## Production vs local differences

| Variable | Local | Production (Cloud Run) |
|---|---|---|
| `BACKEND_HOST` | `127.0.0.1` or `0.0.0.0` | `0.0.0.0` (required) |
| `FRONTEND_URL` | `http://localhost:3000` | Cloud Run frontend URL |
| `DATABASE_PATH` | `data/bastille.db` | `/tmp/bastille.db` or similar |
| `JWT_SECRET_KEY` | Any string | Random secret from Secret Manager |
| `ADMIN_PASSWORD` | `changeme` | Strong password from Secret Manager |
| `BACKUP_BUCKET` | Empty | GCS bucket name |
| `LOG_LEVEL` | `DEBUG` | `INFO` |

In production, environment variables are sourced from GCP Secret Manager via Cloud Run's secret binding — you don't put them in a `.env` file. See [Deployment](Deployment) for setup steps.
