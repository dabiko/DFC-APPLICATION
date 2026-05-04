#!/usr/bin/env bash
# =============================================================================
# DFC Application - Update After git pull (Linux / macOS)
# =============================================================================
# Run from project root:
#     bash scripts/update.sh                  # default
#     bash scripts/update.sh --reseed         # wipe + reload demo data
#     bash scripts/update.sh --rebuild-index  # also rebuild Elasticsearch
#     bash scripts/update.sh --skip-pull      # do not git pull
# =============================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

SKIP_PULL=0; RESEED=0; REBUILD=0
for arg in "$@"; do
    case "$arg" in
        --skip-pull)      SKIP_PULL=1 ;;
        --reseed)         RESEED=1 ;;
        --rebuild-index)  REBUILD=1 ;;
        *) echo "Unknown flag: $arg"; exit 1 ;;
    esac
done

step() { printf "\n\033[36m==> %s\033[0m\n" "$1"; }
ok()   { printf "    \033[32mOK\033[0m  %s\n" "$1"; }
warn() { printf "    \033[33m!!\033[0m  %s\n" "$1"; }
fail() { printf "    \033[31mXX\033[0m  %s\n" "$1"; exit 1; }

if [ $SKIP_PULL -eq 0 ]; then
    step "Pulling latest from origin"
    if [ -n "$(git status --porcelain)" ]; then
        warn "Working tree dirty. Using --autostash."
        git pull --rebase --autostash
    else
        git pull --rebase
    fi
fi

step "Refreshing Docker infrastructure"
docker compose pull
docker compose up -d
sleep 5

step "Updating backend"
cd "$REPO_ROOT/backend"
[ -d venv ] || fail "backend/venv missing - run scripts/setup.sh first"
# shellcheck disable=SC1091
source venv/bin/activate

pip install -r requirements.txt
ok "Python deps in sync"

if python manage.py showmigrations --plan | grep -q "\[ \]"; then
    warn "Pending migrations detected"
fi
python manage.py migrate
ok "Migrations applied"

python manage.py init_roles 2>/dev/null || true

if [ $RESEED -eq 1 ]; then
    warn "Reseed requested - clearing + repopulating seed tables"
    python manage.py seed_data --clear
fi

python manage.py collectstatic --noinput >/dev/null 2>&1 || true

if [ $REBUILD -eq 1 ]; then
    step "Rebuilding Elasticsearch index"
    python manage.py rebuild_index --noinput 2>/dev/null \
      || python manage.py search_index --rebuild -f
    ok "Search index rebuilt"
fi

step "Updating frontend"
cd "$REPO_ROOT/frontend"
if [ -f package-lock.json ]; then
    npm ci
else
    npm install
fi
ok "Node deps in sync"

cd "$REPO_ROOT"
step "Update complete - restart dev servers (or run scripts/start.sh)"
