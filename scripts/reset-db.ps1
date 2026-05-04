# =============================================================================
# DFC Application - Nuclear DB Reset (Windows / PowerShell)
# =============================================================================
# Drops and recreates 'dfc_database', re-runs migrations, re-seeds.
# DESTRUCTIVE - use only when migrations get tangled in development.
# Run from project root:
#     pwsh -ExecutionPolicy Bypass -File scripts/reset-db.ps1
# =============================================================================

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

Write-Host "!!  This will DROP database 'dfc_database' and recreate it." -ForegroundColor Red
$confirm = Read-Host "Type 'RESET' to continue"
if ($confirm -ne "RESET") { Write-Host "Aborted."; exit 0 }

$env:PGPASSWORD = "dabiko"

Write-Host "==> Terminating active connections..." -ForegroundColor Cyan
& psql -U postgres -h localhost -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='dfc_database' AND pid <> pg_backend_pid();" | Out-Null

Write-Host "==> Dropping + recreating dfc_database..." -ForegroundColor Cyan
& psql -U postgres -h localhost -c "DROP DATABASE IF EXISTS dfc_database;"
& psql -U postgres -h localhost -c "CREATE DATABASE dfc_database;"
if ($LASTEXITCODE -ne 0) { Write-Host "psql failed" -ForegroundColor Red; exit 1 }

Set-Location "$RepoRoot\backend"
& ".\venv\Scripts\Activate.ps1"

Write-Host "==> Applying migrations..." -ForegroundColor Cyan
python manage.py migrate

Write-Host "==> Initializing roles + seed data..." -ForegroundColor Cyan
python manage.py init_roles 2>$null
python manage.py seed_data

Write-Host "==> Optional: rebuild Elasticsearch index" -ForegroundColor Cyan
python manage.py rebuild_index --noinput 2>$null

Set-Location $RepoRoot
Write-Host "==> Reset complete. Default users restored (admin/admin123 etc)." -ForegroundColor Green
