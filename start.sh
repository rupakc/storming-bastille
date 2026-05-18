#!/bin/bash
# =============================================================================
# Storming Bastille — Start Script
# =============================================================================
# Installs dependencies and starts both backend and frontend servers.
# Usage: ./start.sh

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
PID_DIR="$PROJECT_DIR"

echo "========================================="
echo "  Storming Bastille — Starting Servers"
echo "========================================="
echo ""

# Check for .env
if [ ! -f "$BACKEND_DIR/.env" ]; then
    if [ -f "$PROJECT_DIR/.env.example" ]; then
        echo "No .env found in backend/. Copying from .env.example..."
        cp "$PROJECT_DIR/.env.example" "$BACKEND_DIR/.env"
        echo "Please edit backend/.env with your ANTHROPIC_API_KEY."
    else
        echo "ERROR: No .env file found. Copy .env.example to backend/.env and add your API key."
        exit 1
    fi
fi

# Install backend dependencies
echo "[1/4] Installing backend dependencies..."
cd "$BACKEND_DIR"
uv sync --quiet 2>/dev/null || uv sync
echo "  Backend dependencies installed."

# Install frontend dependencies
echo "[2/4] Installing frontend dependencies..."
cd "$FRONTEND_DIR"
bun install --silent 2>/dev/null || bun install
echo "  Frontend dependencies installed."

# Start backend
echo "[3/4] Starting backend server (port 8000)..."
cd "$BACKEND_DIR"
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
echo "$BACKEND_PID" > "$PID_DIR/backend.pid"
echo "  Backend PID: $BACKEND_PID"

# Wait for backend to be ready
echo "  Waiting for backend..."
for i in $(seq 1 30); do
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo "  Backend is ready."
        break
    fi
    sleep 1
done

# Start frontend
echo "[4/4] Starting frontend server (port 3000)..."
cd "$FRONTEND_DIR"
bun dev &
FRONTEND_PID=$!
echo "$FRONTEND_PID" > "$PID_DIR/frontend.pid"
echo "  Frontend PID: $FRONTEND_PID"

echo ""
echo "========================================="
echo "  Servers are running!"
echo "========================================="
echo ""
echo "  Frontend:  http://localhost:3000"
echo "  Backend:   http://localhost:8000"
echo "  Health:    http://localhost:8000/health"
echo "  API docs:  http://localhost:8000/docs"
echo ""
echo "  To stop: ./stop.sh"
echo ""

# Wait for both processes
wait
