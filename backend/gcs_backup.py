#!/usr/bin/env python3
"""
GCS backup and restore for SQLite databases.

Commands:
  restore   Download all DBs from GCS to DATA_DIR (on container cold start)
  save      WAL checkpoint + upload all DBs to GCS (periodic sync / SIGTERM)

Environment:
  BACKUP_BUCKET            GCS bucket name; no-op if unset (local dev)
  DATA_DIR                 Directory for database files (default: /app/data)
"""

from __future__ import annotations

import os
import sqlite3
import sys
from pathlib import Path

# Add new databases here — restore and save both cover this list automatically.
DBS = ["bastille.db", "users.db"]


def _bucket_name() -> str | None:
    return os.environ.get("BACKUP_BUCKET", "").strip() or None


def _data_dir() -> Path:
    return Path(os.environ.get("DATA_DIR", "/app/data"))


def _gcs_client():
    from google.cloud import storage  # noqa: PLC0415 — not available locally
    return storage.Client()


def _checkpoint(db_path: Path) -> None:
    """Flush SQLite WAL into the main DB file before upload."""
    if not db_path.exists():
        return
    try:
        conn = sqlite3.connect(str(db_path))
        conn.execute("PRAGMA wal_checkpoint(TRUNCATE);")
        conn.close()
    except Exception as exc:
        print(f"[gcs_backup] WARNING: wal_checkpoint failed for {db_path.name}: {exc}", file=sys.stderr)


def restore() -> None:
    """Download each DB from GCS if a backup exists; skip silently if not."""
    bucket_name = _bucket_name()
    if not bucket_name:
        print("[gcs_backup] BACKUP_BUCKET not set — skipping restore")
        return

    data_dir = _data_dir()
    data_dir.mkdir(parents=True, exist_ok=True)
    client = _gcs_client()
    bucket = client.bucket(bucket_name)

    for db_name in DBS:
        blob = bucket.blob(db_name)
        dest = data_dir / db_name
        try:
            blob.reload()
            print(f"[gcs_backup] Restoring {db_name} from gs://{bucket_name}/{db_name}")
            blob.download_to_filename(str(dest))
            print(f"[gcs_backup] Restored {db_name} ({dest.stat().st_size:,} bytes)")
        except Exception as exc:
            exc_type = type(exc).__name__
            if "404" in str(exc) or "NotFound" in exc_type:
                print(f"[gcs_backup] No backup found for {db_name} — starting fresh")
            else:
                print(f"[gcs_backup] WARNING: failed to restore {db_name}: {exc}", file=sys.stderr)


def save() -> None:
    """Checkpoint WAL and upload each DB to GCS."""
    bucket_name = _bucket_name()
    if not bucket_name:
        print("[gcs_backup] BACKUP_BUCKET not set — skipping save")
        return

    data_dir = _data_dir()
    client = _gcs_client()
    bucket = client.bucket(bucket_name)

    for db_name in DBS:
        src = data_dir / db_name
        if not src.exists():
            print(f"[gcs_backup] Skipping {db_name} — file not found")
            continue
        _checkpoint(src)
        try:
            blob = bucket.blob(db_name)
            blob.upload_from_filename(str(src))
            print(f"[gcs_backup] Saved {db_name} to gs://{bucket_name}/{db_name} ({src.stat().st_size:,} bytes)")
        except Exception as exc:
            print(f"[gcs_backup] ERROR: failed to upload {db_name}: {exc}", file=sys.stderr)


if __name__ == "__main__":
    if len(sys.argv) != 2 or sys.argv[1] not in ("restore", "save"):
        print("Usage: gcs_backup.py restore | save", file=sys.stderr)
        sys.exit(1)
    {"restore": restore, "save": save}[sys.argv[1]]()
