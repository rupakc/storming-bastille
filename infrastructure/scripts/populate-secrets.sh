#!/usr/bin/env bash
# populate-secrets.sh — Upsert all app secrets into GCP Secret Manager.
#
# Run this after bootstrap.sh and after terraform has created the secret shells,
# or at any time to rotate secret values.
#
# Prerequisites:
#   - gcloud CLI authenticated with a principal that has roles/secretmanager.admin
#   - GCP_PROJECT_ID env var set, or gcloud config project configured
#
# Usage:
#   GCP_PROJECT_ID=my-project bash infrastructure/scripts/populate-secrets.sh
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-$(gcloud config get-value project)}"

if [[ -z "$PROJECT_ID" ]]; then
  echo "Error: GCP_PROJECT_ID is not set and gcloud has no default project."
  exit 1
fi

echo "=== Populating Secret Manager secrets ==="
echo "Project: $PROJECT_ID"
echo ""

# Upsert a secret: creates it if missing, then adds a new version.
upsert_secret() {
  local name="$1"
  local value="$2"
  if ! gcloud secrets describe "$name" --project="$PROJECT_ID" &>/dev/null; then
    gcloud secrets create "$name" \
      --project="$PROJECT_ID" \
      --replication-policy=automatic
    echo "  Created secret shell: $name"
  fi
  echo -n "$value" | gcloud secrets versions add "$name" \
    --data-file=- \
    --project="$PROJECT_ID"
  echo "  Upserted: $name"
}

# ─── ANTHROPIC_API_KEY ────────────────────────────────────────────────────────
read -rsp "ANTHROPIC_API_KEY (sk-ant-...): " ANTHROPIC_API_KEY
echo
upsert_secret "anthropic-api-key" "$ANTHROPIC_API_KEY"

# ─── JWT_SECRET_KEY ───────────────────────────────────────────────────────────
echo ""
echo "Generating JWT_SECRET_KEY automatically (openssl rand -hex 32)..."
JWT_SECRET_KEY=$(openssl rand -hex 32)
upsert_secret "jwt-secret-key" "$JWT_SECRET_KEY"
echo "  (auto-generated — no need to record separately)"

# ─── ADMIN_PASSWORD ───────────────────────────────────────────────────────────
echo ""
read -rsp "ADMIN_PASSWORD (choose a strong password): " ADMIN_PASSWORD
echo
upsert_secret "admin-password" "$ADMIN_PASSWORD"

echo ""
echo "=== All secrets populated successfully ==="
echo ""
echo "Next step: push to main to trigger the deploy pipeline."
