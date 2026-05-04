#!/usr/bin/env bash
# =============================================================================
# DFC Application - Daily Dev Start (Linux / macOS)
# =============================================================================
# Backend + frontend run in the foreground via process substitution. Ctrl+C
# stops both. Docker stays up across runs.
# Run from project root:
#     bash scripts/start.sh
# =============================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

echo "==> Starting Docker infrastructure..."
docker compose up -d
sleep 3
docker compose ps

echo "==> Starting backend (port 8000) + frontend (port 5173)..."
echo "    Logs are interleaved. Ctrl+C stops both."

(
    cd "$REPO_ROOT/backend"
    # shellcheck disable=SC1091
    source venv/bin/activate
    exec python manage.py runserver
) &
BACK_PID=$!

(
    cd "$REPO_ROOT/frontend"
    exec npm run dev
) &
FRONT_PID=$!

trap "kill $BACK_PID $FRONT_PID 2>/dev/null || true" INT TERM EXIT
wait
