#!/usr/bin/env bash
# =============================================================================
# DFC Application - Nuclear DB Reset (Linux / macOS)
# =============================================================================
# Drops + recreates dfc_database, re-migrates, re-seeds. DESTRUCTIVE.
# Run from project root:
#     bash scripts/reset-db.sh
# =============================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

echo "!!  This will DROP database 'dfc_database' and recreate it."
read -r -p "Type 'RESET' to continue: " confirm
[ "$confirm" = "RESET" ] || { echo "Aborted."; exit 0; }

export PGPASSWORD="dabiko"

echo "==> Terminating active connections..."
psql -U postgres -h localhost -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='dfc_database' AND pid <> pg_backend_pid();" >/dev/null

echo "==> Dropping + recreating dfc_database..."
psql -U postgres -h localhost -c "DROP DATABASE IF EXISTS dfc_database;"
psql -U postgres -h localhost -c "CREATE DATABASE dfc_database;"

cd "$REPO_ROOT/backend"
# shellcheck disable=SC1091
source venv/bin/activate

echo "==> Applying migrations..."
python manage.py migrate

echo "==> Initializing roles + seed data..."
python manage.py init_roles 2>/dev/null || true
python manage.py seed_data

echo "==> Optional: rebuilding Elasticsearch index..."
python manage.py rebuild_index --noinput 2>/dev/null || true

cd "$REPO_ROOT"
echo "==> Reset complete. Default users restored (admin/admin123 etc)."
