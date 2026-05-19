# Security

## Authentication design

### JWT HS256

Session tokens are signed using HMAC-SHA256 with the `JWT_SECRET_KEY` environment variable as the signing secret. The token payload contains:

```json
{
  "sub": "user_uuid",
  "username": "admin",
  "is_admin": true,
  "exp": 1234567890
}
```

Tokens expire after 24 hours. There is no refresh token mechanism — users log in again after expiry. The expiry window is intentionally short to limit blast radius if a token is leaked.

The `JWT_SECRET_KEY` must be a random string of at least 32 characters. In production it is stored in GCP Secret Manager and injected as a Cloud Run environment variable via Secret Manager binding — it is never written to source code, Docker images, or `.env` files committed to the repository.

### bcrypt password hashing

User passwords are hashed with bcrypt (work factor 12) before storage in SQLite. The plaintext password is never stored or logged. `bcrypt.checkpw` is used for verification at login.

The admin account is seeded on first startup using `ADMIN_USERNAME` and `ADMIN_PASSWORD` from environment variables. After seeding, the environment variable is only needed if you need to reset the account — the database record is the source of truth.

### FastAPI dependency injection for auth

Protected routes use a FastAPI `Depends(get_current_user)` dependency (`backend/app/api/routes/auth.py`). This dependency decodes and validates the JWT, fetches the user from SQLite, and returns the user object. If the token is missing, expired, or invalid, it raises a 401. Admin-only routes additionally check `current_user.is_admin` and raise 403 if false.

---

## Security scanning tools

The CI pipeline runs four security scanners on every push and PR:

### Bandit (SAST)

[Bandit](https://bandit.readthedocs.io/) performs static analysis of the Python backend for common security issues: hardcoded secrets, use of `eval()`, subprocess injection, insecure use of `pickle`, SQL injection patterns, and more.

Configuration: `backend/pyproject.toml` or `backend/.bandit` (if present). Severity threshold is set to MEDIUM — any medium or high severity finding fails the CI run.

### pip-audit

[pip-audit](https://pypi.org/project/pip-audit/) checks all Python dependencies against the Python Packaging Advisory Database (PyPA Advisory DB) and the Open Source Vulnerabilities (OSV) database for known CVEs.

Run: `pip-audit -r backend/requirements.txt` (or against the lockfile). Any unfixed HIGH or CRITICAL CVE fails CI.

### CodeQL

GitHub's [CodeQL](https://codeql.github.com/) performs semantic code analysis for both Python and TypeScript. It catches more complex vulnerabilities than Bandit — SQL injection through data flow analysis, XSS patterns in the frontend, path traversal, etc. Results are surfaced in the GitHub Security tab.

### Trivy

[Trivy](https://trivy.dev/) scans Docker images for vulnerabilities in OS packages and application dependencies. It runs against the built backend and frontend images in CI before they're pushed to Artifact Registry. Any CRITICAL severity finding blocks the push.

---

## CORS configuration

CORS is configured in `backend/app/main.py` using FastAPI's `CORSMiddleware`. The allowed origins list is built from the `FRONTEND_URL` environment variable:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
```

In production, `FRONTEND_URL` is set to the Cloud Run frontend URL. The backend will reject preflight requests from any other origin.

For local development, `FRONTEND_URL=http://localhost:3000` allows the local Next.js dev server.

Wildcard origins (`*`) are never used — this would defeat the purpose of CORS for a credentialed API.

---

## Secret management in production

Secrets are never stored in:
- Source code or git history
- Docker images (not in `ENV` directives in the Dockerfile)
- Environment variable files committed to the repository
- GitHub Actions secrets visible in logs

The production secret flow:
1. Secrets are stored in GCP Secret Manager (one secret per value)
2. The Cloud Run service account is granted `Secret Manager Secret Accessor` on each secret
3. Cloud Run injects secrets as environment variables at runtime via the `--set-secrets` flag
4. The app reads them through the Pydantic settings class as normal environment variables

For local development, secrets go in `backend/.env` which is listed in `.gitignore`. The `.env.example` file shows the variable names with placeholder values and is safe to commit.

---

## Admin-only routes

The `/admin` route prefix is protected at the FastAPI dependency level. The `require_admin` dependency:

```python
def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user
```

This dependency is applied to all routes in the admin router. It's not possible to bypass it by manipulating the JWT payload — the token signature would fail validation if tampered with.

The frontend also hides admin UI elements for non-admin users, but this is a UX concern only. The backend is the enforcement point.
