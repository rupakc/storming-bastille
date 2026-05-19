#!/usr/bin/env bash
# docker-entrypoint.sh — GCS backup/restore wrapper for SQLite DB.
# Environment variables consumed:
#   BACKUP_BUCKET  — GCS bucket name (e.g. myproject-storming-bastille-data)
#   DATA_DIR       — Directory containing bastille.db  (default: /app/data)
set -euo pipefail

DATA_DIR="${DATA_DIR:-/app/data}"
DB_FILE="${DATA_DIR}/bastille.db"
BACKUP_BUCKET="${BACKUP_BUCKET:-}"
BACKUP_OBJECT="bastille.db"

mkdir -p "$DATA_DIR"

# ─── Restore from GCS on startup ─────────────────────────────────────────────
if [[ -n "$BACKUP_BUCKET" ]]; then
  if gsutil -q stat "gs://${BACKUP_BUCKET}/${BACKUP_OBJECT}" 2>/dev/null; then
    echo "[entrypoint] Restoring database from gs://${BACKUP_BUCKET}/${BACKUP_OBJECT}"
    gsutil cp "gs://${BACKUP_BUCKET}/${BACKUP_OBJECT}" "$DB_FILE"
    echo "[entrypoint] Restore complete"
  else
    echo "[entrypoint] No existing backup found — starting fresh"
  fi
else
  echo "[entrypoint] BACKUP_BUCKET not set — skipping GCS restore"
fi

# ─── SIGTERM handler: save to GCS before exit ────────────────────────────────
_save_to_gcs() {
  if [[ -n "$BACKUP_BUCKET" && -f "$DB_FILE" ]]; then
    echo "[entrypoint] SIGTERM received — backing up database to gs://${BACKUP_BUCKET}/${BACKUP_OBJECT}"
    gsutil cp "$DB_FILE" "gs://${BACKUP_BUCKET}/${BACKUP_OBJECT}"
    echo "[entrypoint] Backup complete"
  fi
}

trap '_save_to_gcs' SIGTERM SIGINT

# ─── Launch the application ───────────────────────────────────────────────────
exec "$@"
