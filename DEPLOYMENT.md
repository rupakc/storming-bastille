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

Every push to any branch runs `.github/workflows/ci.yml`:

- `backend-checks`: `ruff check`, `ruff format --check`, `pytest`
- `frontend-checks`: `bun install --frozen-lockfile`, `bun run build`

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

Cloud Run containers are ephemeral. The backend Dockerfile ships a `docker-entrypoint.sh` that:
- **On startup**: downloads `bastille.db` from GCS if a backup exists
- **On SIGTERM**: uploads `bastille.db` back to GCS before the container exits

This provides durability with eventual consistency (last writer wins on concurrent scale-out, which is acceptable given `max_instances = 5` and SQLite's write serialization).

### SSE Streaming

Cloud Run supports Server-Sent Events natively (HTTP/2 + streaming). The `INGRESS_TRAFFIC_ALL` setting ensures no load balancer strips the SSE `Content-Type: text/event-stream` headers.

### Secret Injection

Secrets are injected as environment variables at Cloud Run revision creation time via `value_source.secret_key_ref`. The default Compute service account is granted `roles/secretmanager.secretAccessor` by Terraform.
