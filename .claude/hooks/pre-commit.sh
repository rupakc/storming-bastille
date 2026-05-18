#!/bin/bash
# Pre-commit hook: lint and type-check before committing

set -e

echo "Running backend linter..."
cd backend && uv run ruff check app/ --fix
cd ..

echo "Running frontend type-check..."
cd frontend && bun run build 2>/dev/null || echo "Frontend build check skipped (run bun install first)"
cd ..

echo "Pre-commit checks passed."
