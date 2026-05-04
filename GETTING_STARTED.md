# Getting Started — Digital Filing Cabinet (DFC)

A complete guide for developers joining the DFC project. Covers two scenarios:

- **A. First-time setup** — you just cloned the repo and need a working stack.
- **B. Update workflow** — somebody pushed changes to GitHub and you need to sync (new dependencies, new migrations, new seed data, new infra).

Helper scripts under `scripts/` automate both flows on Windows (PowerShell) and Linux/macOS (bash). The manual steps are documented below for transparency and troubleshooting.

> **Sources** — Scripts and commands in this guide are derived directly from:
> `docker-compose.yml`, `backend/.env.example`, `backend/requirements.txt`, `frontend/.env.example`, `backend/apps/*/management/commands/`, and the architecture documented in `CLAUDE.md`.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Clone the Repository](#2-clone-the-repository)
3. [Helper Scripts (TL;DR)](#3-helper-scripts-tldr)
4. [A. First-Time Setup (Manual Walkthrough)](#a-first-time-setup-manual-walkthrough)
   - [A1. Start Infrastructure (Docker)](#a1-start-infrastructure-docker)
   - [A2. Provision PostgreSQL](#a2-provision-postgresql)
   - [A3. Backend (Django)](#a3-backend-django)
   - [A4. Frontend (React + Vite)](#a4-frontend-react--vite)
   - [A5. MinIO Bucket](#a5-minio-bucket)
   - [A6. Verify Everything Works](#a6-verify-everything-works)
5. [B. Updating After git pull (Manual Walkthrough)](#b-updating-after-git-pull-manual-walkthrough)
6. [C. Daily Development Workflow](#c-daily-development-workflow)
7. [Service URLs & Credentials](#service-urls--credentials)
8. [Useful Commands Reference](#useful-commands-reference)
9. [Troubleshooting](#troubleshooting)
10. [Project Structure](#project-structure)

---

## 1. Prerequisites

| Software | Required Version | Where to get it |
|----------|------------------|-----------------|
| Git | 2.30+ | <https://git-scm.com/downloads> |
| Docker Desktop (with Compose v2) | 4.0+ | <https://www.docker.com/products/docker-desktop/> |
| Python | 3.11+ (3.13 recommended — matches CLAUDE.md) | <https://www.python.org/downloads/> |
| Node.js + npm | Node 18 LTS+ | <https://nodejs.org/> |
| PostgreSQL client (`psql`) | 15+ | <https://www.postgresql.org/download/> |
| PowerShell 7 (Windows only) | 7.0+ | `winget install Microsoft.PowerShell` |

A local PostgreSQL **server** is also required because `docker-compose.yml` ships Postgres commented out (the project connects to a host-installed Postgres at `localhost:5432`). See [`docker-compose.yml:3-23`](docker-compose.yml). If you would rather run Postgres in Docker, see [Option C in section A2](#option-c-run-postgresql-in-docker).

### Verify

```bash
git --version
docker --version && docker compose version
python --version
node --version && npm --version
psql --version
```

---

## 2. Clone the Repository

```bash
git clone <repository-url> DFC-APPLICATION
cd DFC-APPLICATION
```

---

## 3. Helper Scripts (TL;DR)

The `scripts/` folder ships four idempotent helpers. They cover 95% of day-to-day setup and update needs.

| Script | Purpose | When to use |
|--------|---------|-------------|
| `scripts/setup.{ps1,sh}` | One-shot first-time setup | After cloning the repo |
| `scripts/update.{ps1,sh}` | `git pull` + reinstall deps + migrate + (optional) reseed / re-index | Whenever the team pushes new code |
| `scripts/start.{ps1,sh}` | Boot Docker, backend, frontend | Beginning of each dev session |
| `scripts/reset-db.{ps1,sh}` | Drop + recreate the database, re-migrate, re-seed | When migrations get tangled in dev |

**Windows:**
```powershell
# First-time setup
pwsh -ExecutionPolicy Bypass -File scripts\setup.ps1

# Pull updates from GitHub and resync everything
pwsh -ExecutionPolicy Bypass -File scripts\update.ps1
# Reload demo data as well:
pwsh -ExecutionPolicy Bypass -File scripts\update.ps1 -Reseed
# Also rebuild the Elasticsearch index (search-related changes):
pwsh -ExecutionPolicy Bypass -File scripts\update.ps1 -RebuildIndex

# Daily start
pwsh -ExecutionPolicy Bypass -File scripts\start.ps1
```

**Linux / macOS:**
```bash
chmod +x scripts/*.sh                # one-time

bash scripts/setup.sh                # first-time setup
bash scripts/update.sh               # sync after git pull
bash scripts/update.sh --reseed      # also reload demo data
bash scripts/update.sh --rebuild-index
bash scripts/start.sh                # daily start
```

If a script fails partway through, scroll to [Troubleshooting](#troubleshooting) — the manual steps below are exactly what each script runs.

---

## A. First-Time Setup (Manual Walkthrough)

### A1. Start Infrastructure (Docker)

```bash
docker compose up -d
docker compose ps      # wait until services are "healthy" (~60s)
```

Reference: [`docker-compose.yml:44-124`](docker-compose.yml). The compose file starts:

| Service | Container | Ports | Source |
|---------|-----------|-------|--------|
| MinIO (S3-compatible storage) | `dfc_minio` | `9000`, `9001` | `docker-compose.yml:44-66` |
| Redis (cache + Celery results) | `dfc_redis` | `6379` | `docker-compose.yml:68-82` |
| Elasticsearch (search) | `dfc_elasticsearch` | `9200`, `9300` | `docker-compose.yml:84-104` |
| RabbitMQ (Celery broker) | `dfc_rabbitmq` | `5672`, `15672` | `docker-compose.yml:106-124` |

### A2. Provision PostgreSQL

The expected connection string (from [`backend/.env.example:9`](backend/.env.example)) is:

```
postgres://postgres:dabiko@localhost:5432/dfc_database
```

#### Option A — `psql` one-liner (fastest)

```bash
# Set the password the project expects
psql -U postgres -c "ALTER USER postgres WITH PASSWORD 'dabiko';"

# Create the database
psql -U postgres -c "CREATE DATABASE dfc_database;"
```

#### Option B — pgAdmin (GUI)

1. Connect to your local Postgres server.
2. Right-click **Databases → Create → Database…**, name it `dfc_database`.
3. Confirm the `postgres` user password is `dabiko` (or update `backend/.env` to your value).

#### Option C — Run PostgreSQL in Docker

If you do not want a host install, uncomment the `postgres` block in [`docker-compose.yml:3-23`](docker-compose.yml) (note: change `POSTGRES_USER` from `progress` → `postgres` to match the existing typo), then `docker compose up -d postgres`.

### A3. Backend (Django)

```bash
cd backend
```

**3.1 Create + activate a virtualenv**

```bash
python -m venv venv

# Windows PowerShell
.\venv\Scripts\Activate.ps1
# Windows cmd
venv\Scripts\activate.bat
# Linux / macOS
source venv/bin/activate
```

**3.2 Install Python dependencies**

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

**3.3 Create `.env`**

```bash
# Windows
copy .env.example .env
# Linux / macOS
cp .env.example .env
```

Defaults match the Docker compose file and the local Postgres conventions (see [`backend/.env.example`](backend/.env.example)). Only edit if your Postgres password differs or you are pointing at remote services.

**3.4 Run migrations**

```bash
python manage.py migrate
```

**3.5 Initialize roles + seed demo data**

```bash
python manage.py init_roles    # source: apps/permissions/management/commands/init_roles.py
python manage.py seed_data     # source: apps/users/management/commands/seed_data.py
```

`seed_data` creates three accounts you can immediately log in with:

| Username | Email | Password | Role |
|----------|-------|----------|------|
| `admin` | `admin@cccplc.net` | `admin123` | superuser |
| `john.doe` | `john.doe@cccplc.net` | `manager123` | manager |
| `jane.smith` | `jane.smith@cccplc.net` | `staff123` | staff |

If you want a custom superuser as well, run `python manage.py createsuperuser`.

**3.6 Start the dev server**

```bash
python manage.py runserver         # http://localhost:8000
```

### A4. Frontend (React + Vite)

In a **second terminal**:

```bash
cd frontend
npm install
cp .env.example .env       # Windows: copy .env.example .env
npm run dev                # http://localhost:5173
```

### A5. MinIO Bucket

Done **once per environment**.

1. Open the MinIO console: <http://localhost:9001>
2. Login: `dfc_minio_admin` / `dfc_minio_password_2025` (from [`docker-compose.yml:50-51`](docker-compose.yml))
3. **Create Bucket** → name `dfc-documents` (matches `MINIO_BUCKET_NAME` in [`backend/.env.example:21`](backend/.env.example))

### A6. Verify Everything Works

| Check | URL / command | Expected |
|-------|---------------|----------|
| Frontend loads | <http://localhost:5173> | Login page |
| Backend health | <http://localhost:8000/api/schema/swagger-ui/> | Swagger UI |
| Django admin | <http://localhost:8000/admin/> | Login → admin |
| MinIO console | <http://localhost:9001> | Bucket list with `dfc-documents` |
| Elasticsearch | <http://localhost:9200> | JSON cluster info |
| RabbitMQ | <http://localhost:15672> | Management UI |
| Login flow | Use `admin` / `admin123` on frontend | Successful login |

---

## B. Updating After `git pull` (Manual Walkthrough)

Whenever a teammate pushes changes you need to:

1. Pull the latest code.
2. Reinstall dependencies (in case `requirements.txt` or `package.json` changed).
3. Apply any new database migrations.
4. Optionally re-run seed data or rebuild the search index.
5. Restart the dev servers.

### One-shot script

```powershell
# Windows — most common
pwsh -ExecutionPolicy Bypass -File scripts\update.ps1

# Pull + reload demo data
pwsh -ExecutionPolicy Bypass -File scripts\update.ps1 -Reseed

# Pull + rebuild search index
pwsh -ExecutionPolicy Bypass -File scripts\update.ps1 -RebuildIndex
```

```bash
# Linux / macOS
bash scripts/update.sh
bash scripts/update.sh --reseed
bash scripts/update.sh --rebuild-index
```

### What the update script does (manual equivalent)

```bash
# 1. Pull
git pull --rebase --autostash

# 2. Refresh containers in case docker-compose.yml changed
docker compose pull
docker compose up -d

# 3. Backend deps + migrations
cd backend
# Activate venv (see A3.1)
pip install -r requirements.txt
python manage.py showmigrations --plan | grep "\[ \]"   # preview pending
python manage.py migrate
python manage.py init_roles                              # idempotent
python manage.py collectstatic --noinput                 # safe no-op in dev

# 4. Frontend deps
cd ../frontend
npm ci          # use `npm install` if package-lock.json changed locally
```

### Optional — reload demo data when seed schemas change

```bash
cd backend && source venv/bin/activate   # adjust for OS
python manage.py seed_data --clear
```

`--clear` wipes the seed tables before repopulating (see `apps/users/management/commands/seed_data.py:18-22`).

### Optional — rebuild Elasticsearch index when search-mapped models change

```bash
python manage.py rebuild_index --noinput        # source: apps/search/management/commands/rebuild_index.py
# Fallback if rebuild_index isn't available:
python manage.py search_index --rebuild -f
```

### Tangled migrations? Nuclear reset

When migrations conflict in dev (e.g. you switched branches and the schema diverged), use:

```powershell
pwsh -ExecutionPolicy Bypass -File scripts\reset-db.ps1
```

```bash
bash scripts/reset-db.sh
```

It drops `dfc_database`, recreates it, re-migrates, and re-seeds. **Destructive — local dev only.**

### Other update scenarios

| Change pushed | What to run | Why |
|---------------|-------------|-----|
| `requirements.txt` updated | `pip install -r requirements.txt` | New Python deps |
| `package.json` updated | `npm ci` (or `npm install`) | New Node deps |
| New migration file in `apps/*/migrations/` | `python manage.py migrate` | Apply schema change |
| New seed records | `python manage.py seed_data --clear` | Refresh demo data |
| Search-mapped model changed | `python manage.py rebuild_index --noinput` | Sync ES mapping |
| New role/permission | `python manage.py init_roles` | Idempotent role bootstrap |
| `docker-compose.yml` changed | `docker compose pull && docker compose up -d` | Rebuild infra services |
| `.env.example` changed | Diff against your `.env` and copy missing keys | New env vars introduced |
| New management commands under `apps/*/management/commands/` | `python manage.py help` to discover them | Run as needed |

---

## C. Daily Development Workflow

### Start a session

```powershell
# Windows — opens 3 windows: Docker, Django, Vite
pwsh -ExecutionPolicy Bypass -File scripts\start.ps1
```

```bash
# Linux / macOS — backend + frontend run interleaved; Ctrl+C stops both
bash scripts/start.sh
```

### Manual three-terminal layout

| Terminal | Command |
|----------|---------|
| 1 (infra) | `docker compose up -d && docker compose logs -f` |
| 2 (backend) | `cd backend && .\venv\Scripts\Activate.ps1 && python manage.py runserver` |
| 3 (frontend) | `cd frontend && npm run dev` |

### Optional Celery workers

```bash
cd backend
# Worker (Windows requires -P solo because of asyncio + Win sockets)
celery -A config worker --loglevel=info -P solo
# Scheduler (separate terminal)
celery -A config beat --loglevel=info
```

### Stop

```bash
# Ctrl+C in each dev-server terminal
docker compose down                  # stop containers, keep data
docker compose down -v               # also delete volumes (DESTRUCTIVE)
```

---

## Service URLs & Credentials

### Application

| Service | URL |
|---------|-----|
| Frontend | <http://localhost:5173> |
| Backend API | <http://localhost:8000> |
| Swagger | <http://localhost:8000/api/schema/swagger-ui/> |
| ReDoc | <http://localhost:8000/api/schema/redoc/> |
| Django Admin | <http://localhost:8000/admin/> |

### Infrastructure

| Service | URL | Username | Password | Source |
|---------|-----|----------|----------|--------|
| MinIO Console | <http://localhost:9001> | `dfc_minio_admin` | `dfc_minio_password_2025` | `docker-compose.yml:50-51` |
| RabbitMQ Mgmt | <http://localhost:15672> | `dfc_rabbit` | `dfc_rabbit_password_2025` | `docker-compose.yml:111-112` |
| Elasticsearch | <http://localhost:9200> | — | — | `docker-compose.yml:84-104` |

### Database (host-installed Postgres)

| Field | Value | Source |
|-------|-------|--------|
| Host | `localhost` | `backend/.env.example:14` |
| Port | `5432` | `backend/.env.example:15` |
| Database | `dfc_database` | `backend/.env.example:11` |
| Username | `postgres` | `backend/.env.example:12` |
| Password | `dabiko` | `backend/.env.example:13` |

### Seed accounts (after `seed_data`)

| Username | Password | Role |
|----------|----------|------|
| `admin` | `admin123` | superuser |
| `john.doe` | `manager123` | manager |
| `jane.smith` | `staff123` | staff |

The login form accepts username **or** email (the `CustomTokenObtainPairSerializer` detects `@` and resolves by email).

---

## Useful Commands Reference

### Backend management commands (project-specific)

Discover all of them with `python manage.py help`. The most useful for daily work:

| Command | Purpose | Source |
|---------|---------|--------|
| `migrate` | Apply schema migrations | Django built-in |
| `makemigrations` | Generate migrations from model changes | Django built-in |
| `createsuperuser` | Create an admin user interactively | Django built-in |
| `seed_data [--clear]` | Populate demo users, departments, folders, tags | `apps/users/management/commands/seed_data.py` |
| `init_roles` | Create default RBAC roles | `apps/permissions/management/commands/init_roles.py` |
| `rebuild_index` | Rebuild Elasticsearch index | `apps/search/management/commands/rebuild_index.py` |
| `search_index --rebuild` | Alternative ES rebuild (django-elasticsearch-dsl) | django-elasticsearch-dsl |
| `make_superuser` | Promote an existing user to superuser | `apps/users/management/commands/make_superuser.py` |
| `create_default_plans` | Seed billing plans | `apps/billing/management/commands/create_default_plans.py` |
| `seed_billing_data` | Seed billing demo data | `apps/billing/management/commands/seed_billing_data.py` |
| `create_demo_procedure` | Create a demo procedure | `apps/procedures/management/commands/create_demo_procedure.py` |
| `generate_procedure_seed_data` | Bulk procedure seed | `apps/procedures/management/commands/generate_procedure_seed_data.py` |
| `setup_rabbitmq` | Declare exchanges/queues for events | `apps/events/management/commands/setup_rabbitmq.py` |
| `run_consumers` | Run event consumers | `apps/events/management/commands/run_consumers.py` |
| `apply_retention_policies` | Walk documents and apply retention | `apps/retention/management/commands/apply_retention_policies.py` |
| `cleanup_audit_logs` | Trim old audit entries | `apps/audit/management/commands/cleanup_audit_logs.py` |
| `verify_storage_integrity` | Re-checksum stored documents | `apps/documents/management/commands/verify_storage_integrity.py` |

### Frontend (`frontend/package.json`)

```bash
npm run dev        # Vite dev server
npm run build      # Production build
npm run lint       # ESLint
npm run lint:fix   # ESLint with auto-fix
npm run format     # Prettier
npm test           # Jest
npm run cypress    # E2E
npm run storybook  # Component library
```

### Docker

```bash
docker compose up -d                   # start all
docker compose ps                      # status
docker compose logs -f elasticsearch   # follow logs of one service
docker compose restart minio
docker compose down                    # stop, keep data
docker compose down -v                 # stop AND delete volumes (DESTRUCTIVE)
```

### Git update workflow

```bash
git fetch origin
git status
git pull --rebase --autostash       # what scripts/update.* uses
```

---

## Troubleshooting

### Docker

**Containers won't start / port already in use**

```bash
docker compose ps
docker compose logs <service>
# Windows: find what owns the port
netstat -ano | findstr :9000
# Linux/macOS
lsof -i :9000
```

**Elasticsearch keeps crashing (OOM)**

Increase its heap in `docker-compose.yml:91`:

```yaml
- "ES_JAVA_OPTS=-Xms1g -Xmx1g"
```

### Backend

**`ModuleNotFoundError`** — venv not active. Re-activate (`A3.1`) then `pip install -r requirements.txt`.

**Database connection refused** — confirm Postgres is up (`pg_isready -h localhost -p 5432`) and the password in `backend/.env` matches your local user.

**Migrations conflict after pulling** — try `python manage.py migrate --fake-initial` first; if that fails, run `scripts/reset-db.ps1` (or `.sh`).

**MinIO connection error** — bucket missing. Visit <http://localhost:9001> and create `dfc-documents`.

**ES kwarg error mentioning `timeout` / `http_auth`** — known incompatibility with `elasticsearch-py 9.x`; pin the client per project conventions.

### Frontend

**`npm install` fails**

```bash
npm cache clean --force
rm -rf node_modules package-lock.json   # PowerShell: Remove-Item -Recurse -Force ...
npm install
```

**API calls fail with CORS** — ensure `backend/.env`'s `CORS_ALLOWED_ORIGINS` includes `http://localhost:5173` (the Vite default).

### Port conflicts

| Service | Default | Where to change |
|---------|---------|-----------------|
| Backend | 8000 | `python manage.py runserver 8080` |
| Frontend | 5173 | `frontend/vite.config.ts` |
| Postgres | 5432 | Local Postgres config or `docker-compose.yml` |
| MinIO | 9000 / 9001 | `docker-compose.yml:54-56` |
| Redis | 6379 | `docker-compose.yml:72-73` |
| Elasticsearch | 9200 / 9300 | `docker-compose.yml:92-94` |
| RabbitMQ | 5672 / 15672 | `docker-compose.yml:113-115` |

### Windows-specific

- **PowerShell execution policy** — scripts ship unsigned. Run with `pwsh -ExecutionPolicy Bypass -File <script>` or set `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once.
- **Celery on Windows** — use `-P solo` (`celery -A config worker -P solo --loglevel=info`); the default prefork pool does not work on Windows.
- **`psql` not found** — add `C:\Program Files\PostgreSQL\<version>\bin` to PATH.

---

## Project Structure

```
DFC-APPLICATION/
├── backend/                       # Django backend (apps, config, requirements)
│   ├── apps/                      # Domain apps (users, documents, search, ...)
│   ├── config/settings/           # base.py, development.py, production.py, testing.py
│   ├── requirements.txt           # Pinned Python deps
│   └── manage.py
├── frontend/                      # React + Vite + TypeScript
│   ├── src/                       # components, pages, services, store
│   └── package.json
├── deployment/                    # Production compose + scripts
├── docker-compose.yml             # Dev infrastructure (MinIO, Redis, ES, RabbitMQ)
├── scripts/                       # setup / update / start / reset (this guide)
│   ├── setup.ps1     setup.sh
│   ├── update.ps1    update.sh
│   ├── start.ps1     start.sh
│   └── reset-db.ps1  reset-db.sh
├── CLAUDE.md                      # Architecture & domain reference
└── GETTING_STARTED.md             # This file
```

---

## Next Steps

1. Log in at <http://localhost:5173> with `admin` / `admin123`.
2. Browse the API at <http://localhost:8000/api/schema/swagger-ui/>.
3. Read [`CLAUDE.md`](CLAUDE.md) for the domain model, RBAC rules, retention/legal-hold semantics, and architectural conventions.
4. Skim [`PROCEDURE_TESTING_GUIDE.md`](PROCEDURE_TESTING_GUIDE.md) for the procedure module flow (referenced by team memory).

---

## Support

- Container logs: `docker compose logs -f`
- Backend logs: terminal where `runserver` runs
- Frontend logs: terminal where `npm run dev` runs
- Service status snapshot: `docker compose ps`

**Happy coding.**
