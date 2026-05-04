# =============================================================================
# DFC Application - First-Time Setup (Windows / PowerShell)
# =============================================================================
# Purpose: Bootstrap a brand-new clone of the DFC repo on a developer machine.
# Run from project root:
#     pwsh -ExecutionPolicy Bypass -File scripts/setup.ps1
# =============================================================================

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "    OK  $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "    !!  $msg" -ForegroundColor Yellow }
function Fail($msg)       { Write-Host "    XX  $msg" -ForegroundColor Red; exit 1 }

# ---- 1. Verify prerequisites ------------------------------------------------
Write-Step "Verifying prerequisites"
foreach ($cmd in @("git","docker","python","node","npm","psql")) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        Fail "$cmd not found on PATH. Install it before continuing."
    }
    Write-Ok "$cmd available"
}

# ---- 2. Bring up infrastructure (MinIO, Redis, ES, RabbitMQ) ----------------
Write-Step "Starting Docker infrastructure (docker-compose up -d)"
docker compose up -d
if ($LASTEXITCODE -ne 0) { Fail "docker compose failed" }
Write-Ok "Containers requested. Waiting 30s for health checks..."
Start-Sleep -Seconds 30
docker compose ps

# ---- 3. Ensure PostgreSQL database exists -----------------------------------
Write-Step "Ensuring PostgreSQL database 'dfc_database' exists"
$env:PGPASSWORD = "dabiko"
$dbExists = & psql -U postgres -h localhost -tAc "SELECT 1 FROM pg_database WHERE datname='dfc_database'" 2>$null
if ($dbExists -ne "1") {
    & psql -U postgres -h localhost -c "CREATE DATABASE dfc_database;" | Out-Null
    if ($LASTEXITCODE -ne 0) { Fail "Could not create database. Check Postgres is running and password is 'dabiko'." }
    Write-Ok "Created database 'dfc_database'"
} else {
    Write-Ok "Database already present"
}

# ---- 4. Backend: venv + deps + .env + migrate + superuser + seed ------------
Write-Step "Setting up backend (Python venv, deps, migrations, seed)"
Set-Location "$RepoRoot\backend"

if (-not (Test-Path "venv")) {
    python -m venv venv
    Write-Ok "Created venv"
}
& ".\venv\Scripts\Activate.ps1"

python -m pip install --upgrade pip | Out-Null
pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) { Fail "pip install failed" }
Write-Ok "Python dependencies installed"

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Ok "Created backend/.env from .env.example"
} else {
    Write-Warn "backend/.env exists - leaving untouched"
}

python manage.py migrate
if ($LASTEXITCODE -ne 0) { Fail "Migrations failed" }
Write-Ok "Migrations applied"

# Initialize default roles + seed demo data (idempotent)
python manage.py init_roles 2>$null
python manage.py seed_data
Write-Ok "Roles initialized + seed data loaded"

Write-Warn "Default seed users:"
Write-Host "      admin       / admin123     (superuser)"
Write-Host "      john.doe    / manager123"
Write-Host "      jane.smith  / staff123"

# ---- 5. Frontend: deps + .env -----------------------------------------------
Write-Step "Setting up frontend (npm install)"
Set-Location "$RepoRoot\frontend"
npm install
if ($LASTEXITCODE -ne 0) { Fail "npm install failed" }
Write-Ok "Node dependencies installed"

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Ok "Created frontend/.env from .env.example"
} else {
    Write-Warn "frontend/.env exists - leaving untouched"
}

# ---- 6. MinIO bucket reminder (cannot create non-interactively here) --------
Set-Location $RepoRoot
Write-Step "MinIO bucket"
Write-Warn "Open http://localhost:9001 (login: dfc_minio_admin / dfc_minio_password_2025)"
Write-Warn "and create bucket 'dfc-documents' if it does not already exist."

Write-Step "Setup complete"
Write-Host "Next: run    scripts\start.ps1    to launch backend + frontend." -ForegroundColor Green
