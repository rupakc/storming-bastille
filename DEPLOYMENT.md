# Deployment Guide

Storming Bastille deploys to Google Cloud Platform using Terraform (infrastructure as code) and GitHub Actions (CI/CD). Every push to `main` triggers a three-job pipeline: bootstrap → build images → terraform apply.

## GCP Services Used

| Service | Purpose |
|---|---|
| Cloud Run (Gen2) | Backend (FastAPI) and frontend (Next.js) containers, scales to zero |
| Artifact Registry | Docker image storage with auto-cleanup (keeps last 5 per service) |
| Secret Manager | `ANTHROPIC_API_KEY`, `JWT_SECRET_KEY`, `ADMIN_PASSWORD` |
| Cloud Storage | SQLite database backup/restore across container restarts |
| Cloud Monitoring | Uptime checks, 5xx error rate alert, `/api/query` request dashboard |
| Cloud Logging | Structured application logs |

## Prerequisites

- GCP account with billing enabled
- `gcloud` CLI authenticated: `gcloud auth login`
- `terraform` >= 1.7
- `docker` (for local testing)
- A GitHub repository: `rupakc/storming-bastille`

## Step 1 — One-Time Bootstrap

```bash
BILLING_ACCOUNT=XXXXXX-XXXXXX-XXXXXX bash infrastructure/scripts/bootstrap.sh
```

This script (safe to re-run — all steps are idempotent):

1. Creates the GCP project `storming-bastille-prod`
2. Enables all required APIs
3. Creates a GCS bucket for Terraform remote state
4. Creates an Artifact Registry repository
5. Creates a GitHub Actions service account and downloads `github-sa-key.json`

## Step 2 — Add GitHub Repository Secrets

In GitHub: **Settings → Secrets and variables → Actions → New repository secret**

| Secret | Value |
|---|---|
| `GCP_PROJECT_ID` | `storming-bastille-prod` (printed by bootstrap.sh) |
| `GCP_SA_KEY` | Paste the entire content of `github-sa-key.json` |
| `ALERT_EMAIL` | Email address for monitoring alerts |
| `ANTHROPIC_API_KEY` | Your Anthropic API key (`sk-ant-...`) |
| `JWT_SECRET_KEY` | Generate with: `openssl rand -hex 32` |
| `ADMIN_PASSWORD` | A strong admin password |

> **Security**: Add `github-sa-key.json` to `.gitignore` and never commit it.

## Step 3 — Populate Secret Manager (optional — CI does this automatically)

If you want to populate secrets locally before the first deploy:

```bash
GCP_PROJECT_ID=storming-bastille-prod bash infrastructure/scripts/populate-secrets.sh
```

## Step 4 — Deploy

```bash
git push origin main
```

GitHub Actions will:
1. **Bootstrap** — Enable APIs, create TF state bucket, AR repo, upsert secrets
2. **push-images** — Build backend and frontend Docker images, push to Artifact Registry
3. **terraform** — `terraform init` → `validate` → `plan` → `apply`, print URLs

Deployment takes approximately 5–10 minutes on a fresh project.

## CI Pipeline (all branches / PRs)

Every push to any branch runs `.github/workflows/ci.yml`. All jobs must pass before a PR can merge.

| Job | What it checks |
|-----|---------------|
| `backend-lint` | `ruff check` + `ruff format --check` |
| `backend-test` | `pytest` with coverage report (uploaded as artifact) |
| `backend-security` | `bandit` SAST (fail on HIGH/CRITICAL) + `pip-audit` CVE scan |
| `frontend-lint` | ESLint + `next build` (TypeScript type-check) |
| `code-scan` | CodeQL analysis for Python and JavaScript/TypeScript (security-extended query suite) |
| `dependency-scan` | `pip-audit` SBOM (CycloneDX) + `bun audit` for HIGH+ npm advisories |
| `integration-test` | Full stack via Docker Compose + backend health check + pytest |
| `image-scan` | Trivy scan of both Docker images — CRITICAL/HIGH CVEs fail the job |

### Security artifacts

Coverage reports, bandit JSON, pip-audit JSON, and SBOMs are uploaded as GitHub Actions artifacts (retained 7–30 days). Trivy SARIF results are pushed to the GitHub Security tab (requires Advanced Security enabled on the repo).

## Local Docker Testing

Test the production container build locally before pushing:

```bash
# Copy .env.example → .env and fill in your ANTHROPIC_API_KEY
cp .env.example .env

# Build and start both services
docker compose up --build

# Backend:  http://localhost:8000/health
# Frontend: http://localhost:3000
```

To stop: `docker compose down`

## Rollback

To roll back to a previous commit's images:

```bash
# Re-run the deploy workflow for a specific commit SHA
# GitHub Actions → Deploy → Run workflow
# Or manually:
cd infrastructure/terraform
terraform apply \
  -var="backend_image=us-central1-docker.pkg.dev/PROJECT_ID/storming-bastille/backend:PREVIOUS_SHA" \
  -var="frontend_image=us-central1-docker.pkg.dev/PROJECT_ID/storming-bastille/frontend:PREVIOUS_SHA" \
  -var="project_id=storming-bastille-prod" \
  -var="alert_email=your@email.com" \
  -var="tf_state_bucket=storming-bastille-prod-tf-state"
```

## Updating Infrastructure

Any Terraform change merged to `main` is applied automatically by the deploy pipeline. To preview changes before merging:

```bash
cd infrastructure/terraform
terraform init -backend-config="bucket=storming-bastille-prod-tf-state" -backend-config="prefix=terraform/state"
terraform plan \
  -var="project_id=storming-bastille-prod" \
  -var="backend_image=placeholder" \
  -var="frontend_image=placeholder" \
  -var="alert_email=your@email.com" \
  -var="tf_state_bucket=storming-bastille-prod-tf-state"
```

## Estimated Cost

With `min_instance_count = 0` and moderate traffic:

| Resource | Monthly Cost |
|---|---|
| Cloud Run backend + frontend | ~$0 (within free tier at low traffic) |
| Artifact Registry (~2 GB) | ~$0.20 |
| Cloud Storage (SQLite backup) | ~$0.03 |
| Secret Manager (3 secrets) | ~$0.06 |
| Cloud Monitoring | ~$0 (within free tier) |
| **Total** | **< $1/month** |

To keep one backend instance warm (eliminates cold start for SSE streaming), set `min_instance_count = 1` in `modules/backend_service/main.tf` — adds approximately $6–8/month.

## Architecture Notes

### SQLite Database Persistence

Cloud Run containers are ephemeral. The backend ships `gcs_backup.py` (Python + `google-cloud-storage`) and `docker-entrypoint.sh` that together provide three layers of durability:

| Layer | When | What |
|-------|------|------|
| **Cold-start restore** | Container startup | Downloads both `bastille.db` and `users.db` from GCS |
| **Periodic sync** | Every 5 minutes (configurable via `BACKUP_INTERVAL_SECONDS`) | WAL checkpoint + uploads both DBs |
| **Graceful shutdown** | SIGTERM (redeploy / scale-to-zero) | Final WAL checkpoint + uploads both DBs |

**WAL checkpoint**: Before each upload, `PRAGMA wal_checkpoint(TRUNCATE)` flushes the `-wal` sidecar into the main DB file, ensuring a consistent snapshot.

**Worst-case data loss**:
- Normal redeploy or scale-to-zero → zero (SIGTERM triggers final sync)
- OOM kill or crash → up to 5 minutes of writes

**GCS versioning**: The backup bucket retains the 10 most recent versions of each file. To restore a previous version:

```bash
# List generations
gsutil ls -la gs://storming-bastille-prod-storming-bastille-data/bastille.db

# Restore a specific generation
gsutil cp "gs://storming-bastille-prod-storming-bastille-data/bastille.db#<generation>" ./bastille.db
```

**Concurrent instances**: With `max_instance_count = 5`, multiple backend instances write to GCS independently (last writer wins). For strict consistency, set `max_instance_count = 1` in `modules/backend_service/main.tf`. For a personal app with user-scoped sessions, this is acceptable.

**Local development**: `BACKUP_BUCKET` is not set locally, so all backup logic is skipped silently. Data persists in the `backend_data` Docker volume between `docker compose up/down` cycles.

### SSE Streaming

Cloud Run supports Server-Sent Events natively (HTTP/2 + streaming). The `INGRESS_TRAFFIC_ALL` setting ensures no load balancer strips the SSE `Content-Type: text/event-stream` headers.

### Secret Injection

Secrets are injected as environment variables at Cloud Run revision creation time via `value_source.secret_key_ref`. The default Compute service account is granted `roles/secretmanager.secretAccessor` by Terraform.
