#!/bin/sh
set -e

# next.config.ts rewrites() is evaluated at BUILD time, not runtime.
# The backend URL baked in during docker build defaults to localhost:8000.
# At runtime on Cloud Run, NEXT_PUBLIC_API_URL is injected as an env var.
# Patch the compiled routes manifest before starting the server.
BACKEND_URL="${NEXT_PUBLIC_API_URL:-}"
if [ -n "$BACKEND_URL" ] && [ "$BACKEND_URL" != "http://localhost:8000" ]; then
  MANIFEST="/app/.next/routes-manifest.json"
  if [ -f "$MANIFEST" ]; then
    sed -i "s|http://localhost:8000|$BACKEND_URL|g" "$MANIFEST"
    echo "[entrypoint] Patched routes manifest → $BACKEND_URL"
  fi
fi

exec node server.js
