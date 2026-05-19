# Deployment

Storming Bastille is designed for GCP Cloud Run — serverless, scales to zero, no infrastructure to maintain. Backend and frontend run as separate Cloud Run services. Infrastructure is managed with Terraform.

---

## Prerequisites

- GCP project with billing enabled
- `gcloud` CLI authenticated (`gcloud auth login && gcloud auth application-default login`)
- Docker installed locally (for building images)
- Terraform 1.5+ installed
- Anthropic API key

---

## Step-by-step GCP deployment

### 1. Enable GCP APIs

```bash
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  storage.googleapis.com \
  cloudbuild.googleapis.com
```

### 2. Create Artifact Registry repository

```bash
gcloud artifacts repositories create storming-bastille \
  --repository-format=docker \
  --location=us-central1
```

### 3. Store secrets in Secret Manager

```bash
# Anthropic API key
echo -n "sk-ant-..." | gcloud secrets create ANTHROPIC_API_KEY --data-file=-

# JWT secret (generate a random one)
openssl rand -hex 32 | gcloud secrets create JWT_SECRET_KEY --data-file=-

# Admin password
echo -n "your-strong-password" | gcloud secrets create ADMIN_PASSWORD --data-file=-
```

### 4. Create GCS bucket for SQLite backup

```bash
gcloud storage buckets create gs://your-bastille-backups \
  --location=us-central1 \
  --uniform-bucket-level-access
```

### 5. Build and push Docker images

```bash
PROJECT_ID=$(gcloud config get-value project)
REGION=us-central1
REPO="${REGION}-docker.pkg.dev/${PROJECT_ID}/storming-bastille"

# Backend
docker build -t ${REPO}/backend:latest ./backend
docker push ${REPO}/backend:latest

# Frontend
docker build -t ${REPO}/frontend:latest ./frontend
docker push ${REPO}/frontend:latest
```

### 6. Deploy backend to Cloud Run

```bash
gcloud run deploy bastille-backend \
  --image=${REPO}/backend:latest \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated \
  --set-secrets="ANTHROPIC_API_KEY=ANTHROPIC_API_KEY:latest,JWT_SECRET_KEY=JWT_SECRET_KEY:latest,ADMIN_PASSWORD=ADMIN_PASSWORD:latest" \
  --set-env-vars="BACKUP_BUCKET=your-bastille-backups,LOG_LEVEL=INFO" \
  --memory=1Gi \
  --cpu=1 \
  --concurrency=80 \
  --max-instances=10
```

Note the backend URL from the output (e.g., `https://bastille-backend-xxxx-uc.a.run.app`).

### 7. Deploy frontend to Cloud Run

```bash
gcloud run deploy bastille-frontend \
  --image=${REPO}/frontend:latest \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated \
  --set-env-vars="NEXT_PUBLIC_API_URL=https://bastille-backend-xxxx-uc.a.run.app" \
  --memory=512Mi \
  --cpu=1
```

### 8. Update backend CORS

Set `FRONTEND_URL` on the backend service to the frontend Cloud Run URL:

```bash
gcloud run services update bastille-backend \
  --region=us-central1 \
  --update-env-vars="FRONTEND_URL=https://bastille-frontend-xxxx-uc.a.run.app"
```

---

## GitHub Actions CI/CD pipeline

The `.github/workflows/` directory contains:

**`ci.yml`** — runs on every push and PR:
- Runs Bandit SAST scan on backend Python code
- Runs pip-audit for known CVEs in dependencies
- Runs pytest with coverage check
- Runs CodeQL analysis
- Runs Trivy container vulnerability scan on built images

**`deploy.yml`** — runs on push to `main`:
- Builds backend and frontend Docker images
- Pushes to Artifact Registry
- Deploys to Cloud Run (backend first, then frontend)

Required GitHub secrets:
- `GCP_PROJECT_ID`
- `GCP_SA_KEY` — service account key JSON with Cloud Run Admin and Artifact Registry Writer roles
- `GCP_REGION`

---

## Terraform modules overview

The `terraform/` directory manages:

- `modules/cloud_run/` — Cloud Run service definitions for backend and frontend
- `modules/artifact_registry/` — Docker repository
- `modules/secrets/` — Secret Manager secret resources (not the secret values — those are managed externally)
- `modules/storage/` — GCS backup bucket
- `main.tf` — module wiring
- `variables.tf` — project_id, region, image tags
- `outputs.tf` — service URLs

To apply:

```bash
cd terraform
terraform init
terraform plan -var="project_id=your-project" -var="backend_image=..."
terraform apply
```

---

## SQLite on Cloud Run: the pattern

Cloud Run containers have ephemeral local filesystems — they're wiped on each new revision or when the container is recycled. The database persistence pattern:

1. **Startup restore:** `backend/app/db/backup.py` checks if `DATABASE_PATH` exists. If not and `BACKUP_BUCKET` is set, downloads `bastille.db` from GCS. The app doesn't accept traffic until this completes.
2. **Periodic backup:** A background `asyncio.create_task` uploads the database file every 5 minutes.
3. **Shutdown backup:** A `lifespan` context manager registers a SIGTERM handler that runs a final upload before exit. Cloud Run gives containers 10 seconds to shut down cleanly.

This gives you SQLite persistence with at most ~5 minutes of potential data loss on an unexpected crash. For moderate traffic (hundreds of sessions, not millions), this is entirely sufficient and avoids the cost and operational overhead of Cloud SQL.

---

## Cost expectations

Cloud Run scales to zero — you pay only for request processing time:

| Traffic level | Estimated monthly cost |
|---|---|
| Light (< 100 queries/day) | ~$0–2 |
| Moderate (100–1000 queries/day) | ~$5–20 |
| Heavy (> 1000 queries/day) | Scale with Claude API costs |

The dominant cost driver is the Anthropic API — Claude Sonnet calls for causal analysis are more expensive than Haiku calls for narrative. Monitor your Anthropic usage dashboard to understand AI costs separately from infrastructure.

GCS backup storage is negligible (SQLite file is typically < 100 MB).

---

## Monitoring and alerting

Cloud Run emits logs to Cloud Logging automatically. Useful filters:

```
# Errors
resource.type="cloud_run_revision"
severity>=ERROR

# Slow queries (causal analysis > 30s)
resource.type="cloud_run_revision"
textPayload:"causal_analyst"
```

Set up a Cloud Monitoring uptime check on `GET /api/health` to alert on service outages.

---

## Rollback

To roll back to the previous revision:

```bash
# List revisions
gcloud run revisions list --service=bastille-backend --region=us-central1

# Route 100% traffic to a specific revision
gcloud run services update-traffic bastille-backend \
  --region=us-central1 \
  --to-revisions=bastille-backend-00005-abc=100
```

The database is unaffected by a service rollback — SQLite data persists in GCS independently of the container revision.
