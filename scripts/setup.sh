#!/usr/bin/env bash
# =============================================================================
# DFC Application - First-Time Setup (Linux / macOS)
# =============================================================================
# Run from project root:
#     bash scripts/setup.sh
# =============================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

step() { printf "\n\033[36m==> %s\033[0m\n" "$1"; }
ok()   { printf "    \033[32mOK\033[0m  %s\n" "$1"; }
warn() { printf "    \033[33m!!\033[0m  %s\n" "$1"; }
fail() { printf "    \033[31mXX\033[0m  %s\n" "$1"; exit 1; }

step "Verifying prerequisites"
for c in git docker python3 node npm psql; do
    command -v "$c" >/dev/null 2>&1 || fail "$c not found on PATH"
    ok "$c available"
done

step "Starting Docker infrastructure"
docker compose up -d
ok "Containers requested. Waiting 30s..."
sleep 30
docker compose ps

step "Ensuring PostgreSQL database exists"
export PGPASSWORD="dabiko"
if ! psql -U postgres -h localhost -tAc "SELECT 1 FROM pg_database WHERE datname='dfc_database'" | grep -q 1; then
    psql -U postgres -h localhost -c "CREATE DATABASE dfc_database;"
    ok "Created database 'dfc_database'"
else
    ok "Database already present"
fi

step "Setting up backend"
cd "$REPO_ROOT/backend"
[ -d venv ] || python3 -m venv venv
# shellcheck disable=SC1091
source venv/bin/activate
pip install --upgrade pip >/dev/null
pip install -r requirements.txt
ok "Python deps installed"

[ -f .env ] || { cp .env.example .env; ok "Created backend/.env"; }

python manage.py migrate
ok "Migrations applied"

python manage.py init_roles 2>/dev/null || true
python manage.py seed_data
ok "Roles + seed data loaded"

warn "Default seed users:"
echo "      admin       / admin123     (superuser)"
echo "      john.doe    / manager123"
echo "      jane.smith  / staff123"

step "Setting up frontend"
cd "$REPO_ROOT/frontend"
npm install
ok "Node deps installed"
[ -f .env ] || { cp .env.example .env; ok "Created frontend/.env"; }

cd "$REPO_ROOT"
step "MinIO bucket"
warn "Open http://localhost:9001 (dfc_minio_admin / dfc_minio_password_2025)"
warn "and create bucket 'dfc-documents' if it does not already exist."

step "Setup complete - run scripts/start.sh to launch dev servers"
