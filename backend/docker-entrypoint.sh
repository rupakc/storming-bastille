#!/usr/bin/env bash
# docker-entrypoint.sh — GCS backup/restore wrapper for SQLite databases.
#
# Environment variables consumed:
#   BACKUP_BUCKET            GCS bucket name (no-op locally if unset)
#   DATA_DIR                 Directory containing database files (default: /app/data)
#   BACKUP_INTERVAL_SECONDS  Seconds between periodic syncs (default: 300)
set -euo pipefail

DATA_DIR="${DATA_DIR:-/app/data}"
BACKUP_INTERVAL="${BACKUP_INTERVAL_SECONDS:-300}"

mkdir -p "$DATA_DIR"

# ─── Restore both DBs from GCS on cold start ─────────────────────────────────
/app/.venv/bin/python /app/gcs_backup.py restore

# ─── Periodic background sync ────────────────────────────────────────────────
_periodic_backup() {
  while true; do
    sleep "$BACKUP_INTERVAL"
    /app/.venv/bin/python /app/gcs_backup.py save
  done
}

_periodic_backup &
BACKUP_PID=$!

# ─── Graceful shutdown handler ───────────────────────────────────────────────
# Runs on SIGTERM (Cloud Run scale-to-zero / redeploy) and SIGINT (Ctrl-C).
# Kills the periodic loop, runs a final backup, then terminates the app cleanly.
_shutdown() {
  echo "[entrypoint] Shutdown signal received — running final backup"
  kill "$BACKUP_PID" 2>/dev/null || true
  /app/.venv/bin/python /app/gcs_backup.py save
  echo "[entrypoint] Backup complete — shutting down app"
  kill "$APP_PID" 2>/dev/null || true
  wait "$APP_PID" 2>/dev/null || true
  exit 0
}

trap '_shutdown' SIGTERM SIGINT

# ─── Launch the application ───────────────────────────────────────────────────
# NOTE: intentionally NOT exec — the shell must stay alive as PID 1 to own
# the signal trap and the periodic backup loop.
"$@" &
APP_PID=$!
wait "$APP_PID"
