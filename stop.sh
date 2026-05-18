#!/bin/bash
# =============================================================================
# Storming Bastille — Stop Script
# =============================================================================
# Gracefully stops backend and frontend servers.
# Usage: ./stop.sh

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "========================================="
echo "  Storming Bastille — Stopping Servers"
echo "========================================="
echo ""

# Stop backend
if [ -f "$PROJECT_DIR/backend.pid" ]; then
    BACKEND_PID=$(cat "$PROJECT_DIR/backend.pid")
    if kill -0 "$BACKEND_PID" 2>/dev/null; then
        echo "Stopping backend (PID: $BACKEND_PID)..."
        kill "$BACKEND_PID"
        rm "$PROJECT_DIR/backend.pid"
        echo "  Backend stopped."
    else
        echo "  Backend process not running (stale PID file)."
        rm "$PROJECT_DIR/backend.pid"
    fi
else
    echo "  No backend PID file found."
fi

# Stop frontend
if [ -f "$PROJECT_DIR/frontend.pid" ]; then
    FRONTEND_PID=$(cat "$PROJECT_DIR/frontend.pid")
    if kill -0 "$FRONTEND_PID" 2>/dev/null; then
        echo "Stopping frontend (PID: $FRONTEND_PID)..."
        kill "$FRONTEND_PID"
        rm "$PROJECT_DIR/frontend.pid"
        echo "  Frontend stopped."
    else
        echo "  Frontend process not running (stale PID file)."
        rm "$PROJECT_DIR/frontend.pid"
    fi
else
    echo "  No frontend PID file found."
fi

# Kill any remaining processes on the ports
for PORT in 8000 3000; do
    PID=$(lsof -ti :$PORT 2>/dev/null)
    if [ -n "$PID" ]; then
        echo "Cleaning up process on port $PORT (PID: $PID)..."
        kill "$PID" 2>/dev/null
    fi
done

echo ""
echo "All servers stopped."
