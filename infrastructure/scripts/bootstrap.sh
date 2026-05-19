#!/usr/bin/env bash
# bootstrap.sh — One-time GCP project setup for storming-bastille.
#
# Prerequisites:
#   - gcloud CLI installed and authenticated: gcloud auth login
#   - Billing account ID (format: XXXXXX-XXXXXX-XXXXXX)
#
# Usage:
#   BILLING_ACCOUNT=XXXXXX-XXXXXX-XXXXXX bash infrastructure/scripts/bootstrap.sh
#
# Optional overrides (env vars):
#   PROJECT_ID   — defaults to "storming-bastille-prod"
#   REGION       — defaults to "us-central1"
set -euo pipefail

# ─── Configuration ────────────────────────────────────────────────────────────
BILLING_ACCOUNT="${BILLING_ACCOUNT:-}"
PROJECT_ID="${PROJECT_ID:-storming-bastille-prod}"
APP_NAME="storming-bastille"
REGION="${REGION:-us-central1}"
TF_STATE_BUCKET="${PROJECT_ID}-tf-state"
DEPLOYER_SA="github-actions-sa"
DEPLOYER_SA_EMAIL="${DEPLOYER_SA}@${PROJECT_ID}.iam.gserviceaccount.com"
KEY_FILE="github-sa-key.json"

if [[ -z "$BILLING_ACCOUNT" ]]; then
  echo "Error: BILLING_ACCOUNT is required."
  echo ""
  echo "Usage: BILLING_ACCOUNT=XXXXXX-XXXXXX-XXXXXX bash infrastructure/scripts/bootstrap.sh"
  echo ""
  echo "Find your billing account ID with: gcloud billing accounts list"
  exit 1
fi

echo "=== Storming Bastille Bootstrap ==="
echo "Project:  $PROJECT_ID"
echo "Region:   $REGION"
echo ""

# ─── Create GCP project ───────────────────────────────────────────────────────
if ! gcloud projects describe "$PROJECT_ID" &>/dev/null; then
  echo "[1/6] Creating GCP project: $PROJECT_ID"
  gcloud projects create "$PROJECT_ID" --name="$APP_NAME"
else
  echo "[1/6] GCP project already exists: $PROJECT_ID"
fi

gcloud config set project "$PROJECT_ID"
gcloud billing projects link "$PROJECT_ID" --billing-account="$BILLING_ACCOUNT"

# ─── Enable APIs ──────────────────────────────────────────────────────────────
echo "[2/6] Enabling GCP APIs..."
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  storage.googleapis.com \
  storage-component.googleapis.com \
  iam.googleapis.com \
  cloudresourcemanager.googleapis.com \
  compute.googleapis.com \
  monitoring.googleapis.com \
  logging.googleapis.com \
  --quiet

# ─── Terraform state bucket ───────────────────────────────────────────────────
echo "[3/6] Creating Terraform state bucket: gs://$TF_STATE_BUCKET"
if ! gcloud storage buckets describe "gs://$TF_STATE_BUCKET" &>/dev/null; then
  gcloud storage buckets create "gs://$TF_STATE_BUCKET" \
    --project="$PROJECT_ID" \
    --location="$REGION" \
    --uniform-bucket-level-access
  gcloud storage buckets update "gs://$TF_STATE_BUCKET" --versioning
else
  echo "  Already exists — skipping."
fi

# ─── Artifact Registry repository ────────────────────────────────────────────
echo "[4/6] Creating Artifact Registry repository: $APP_NAME"
if ! gcloud artifacts repositories describe "$APP_NAME" \
     --location="$REGION" &>/dev/null; then
  gcloud artifacts repositories create "$APP_NAME" \
    --repository-format=docker \
    --location="$REGION" \
    --project="$PROJECT_ID"
else
  echo "  Already exists — skipping."
fi

# ─── GitHub Actions service account ──────────────────────────────────────────
echo "[5/6] Creating GitHub Actions deployer service account: $DEPLOYER_SA"
if ! gcloud iam service-accounts describe "$DEPLOYER_SA_EMAIL" &>/dev/null; then
  gcloud iam service-accounts create "$DEPLOYER_SA" \
    --display-name="$APP_NAME GitHub Actions Deployer" \
    --project="$PROJECT_ID"
fi

for role in \
  roles/run.admin \
  roles/artifactregistry.admin \
  roles/storage.admin \
  roles/secretmanager.admin \
  roles/iam.serviceAccountUser \
  roles/resourcemanager.projectIamAdmin \
  roles/monitoring.admin \
  roles/logging.admin; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$DEPLOYER_SA_EMAIL" \
    --role="$role" \
    --quiet
done

# ─── Download service account key ────────────────────────────────────────────
echo "[6/6] Downloading service account key to: $KEY_FILE"
gcloud iam service-accounts keys create "$KEY_FILE" \
  --iam-account="$DEPLOYER_SA_EMAIL" \
  --project="$PROJECT_ID"

# ─── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "=== Bootstrap complete ==="
echo ""
echo "Add the following secrets to your GitHub repository"
echo "(Settings → Secrets and variables → Actions):"
echo ""
echo "  GCP_PROJECT_ID   = $PROJECT_ID"
echo "  GCP_SA_KEY       = (paste the entire content of $KEY_FILE)"
echo "  ALERT_EMAIL      = (your monitoring alert email)"
echo "  ANTHROPIC_API_KEY= (your Anthropic API key)"
echo "  JWT_SECRET_KEY   = (run: openssl rand -hex 32)"
echo "  ADMIN_PASSWORD   = (choose a strong admin password)"
echo ""
echo "Then populate Secret Manager secrets locally (optional, or let CI do it):"
echo "  bash infrastructure/scripts/populate-secrets.sh"
echo ""
echo "Push to main to trigger the full deploy pipeline."
echo ""
echo "SECURITY: Add $KEY_FILE to .gitignore and do NOT commit it."
