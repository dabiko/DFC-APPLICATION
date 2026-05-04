# =============================================================================
# DFC Application - Update After git pull (Windows / PowerShell)
# =============================================================================
# Purpose: Sync a working copy with new changes from GitHub. Handles new deps,
#          new migrations, new seed data, search re-index, and infra changes.
# Run from project root:
#     pwsh -ExecutionPolicy Bypass -File scripts/update.ps1
#
# Flags:
#     -SkipPull        Do not run "git pull"
#     -Reseed          Wipe + re-run seed data (DESTRUCTIVE for seed tables)
#     -RebuildIndex    Drop and rebuild Elasticsearch indices
# =============================================================================

param(
    [switch]$SkipPull,
    [switch]$Reseed,
    [switch]$RebuildIndex
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "    OK  $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "    !!  $msg" -ForegroundColor Yellow }
function Fail($msg)       { Write-Host "    XX  $msg" -ForegroundColor Red; exit 1 }

# ---- 1. Pull latest code ----------------------------------------------------
if (-not $SkipPull) {
    Write-Step "Pulling latest from origin"
    $dirty = git status --porcelain
    if ($dirty) {
        Write-Warn "Working tree has uncommitted changes:"
        Write-Host $dirty
        $resp = Read-Host "Continue with 'git pull --rebase --autostash'? (y/N)"
        if ($resp -ne "y") { Fail "Aborted by user" }
        git pull --rebase --autostash
    } else {
        git pull --rebase
    }
    if ($LASTEXITCODE -ne 0) { Fail "git pull failed - resolve conflicts then re-run" }
}

# ---- 2. Rebuild infrastructure if compose file changed ----------------------
Write-Step "Refreshing Docker infrastructure"
docker compose pull
docker compose up -d
if ($LASTEXITCODE -ne 0) { Fail "docker compose up failed" }
Start-Sleep -Seconds 5

# ---- 3. Backend update ------------------------------------------------------
Write-Step "Updating backend"
Set-Location "$RepoRoot\backend"
if (-not (Test-Path "venv")) { Fail "backend\venv missing - run scripts\setup.ps1 first" }
& ".\venv\Scripts\Activate.ps1"

# Re-install in case requirements.txt changed (pip is fast when nothing changed)
pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) { Fail "pip install failed" }
Write-Ok "Python dependencies in sync"

# Show + apply any new migrations
$pending = python manage.py showmigrations --plan | Select-String "\[ \]"
if ($pending) {
    Write-Warn "Pending migrations detected:"
    $pending | ForEach-Object { Write-Host "      $_" }
} else {
    Write-Ok "No pending migrations"
}
python manage.py migrate
if ($LASTEXITCODE -ne 0) { Fail "Migrations failed" }
Write-Ok "Migrations applied"

# Roles are idempotent - safe to re-run
python manage.py init_roles 2>$null

# Seed data
if ($Reseed) {
    Write-Warn "Reseed requested - clearing + repopulating seed tables"
    python manage.py seed_data --clear
} else {
    Write-Ok "Skipping seed (use -Reseed to refresh demo data)"
}

# Collect static (only relevant if STATIC paths change)
python manage.py collectstatic --noinput 2>$null | Out-Null

# Elasticsearch index
if ($RebuildIndex) {
    Write-Step "Rebuilding Elasticsearch index"
    python manage.py rebuild_index --noinput 2>$null
    if ($LASTEXITCODE -ne 0) {
        # Fallback to django-elasticsearch-dsl command
        python manage.py search_index --rebuild -f
    }
    Write-Ok "Search index rebuilt"
}

# ---- 4. Frontend update -----------------------------------------------------
Write-Step "Updating frontend"
Set-Location "$RepoRoot\frontend"

# npm ci is faster + reproducible when package-lock.json is current
if (Test-Path "package-lock.json") {
    npm ci
} else {
    npm install
}
if ($LASTEXITCODE -ne 0) { Fail "npm install/ci failed" }
Write-Ok "Node dependencies in sync"

Set-Location $RepoRoot
Write-Step "Update complete"
Write-Host "Restart your dev servers (or run scripts\start.ps1)." -ForegroundColor Green
