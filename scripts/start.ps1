# =============================================================================
# DFC Application - Daily Dev Start (Windows / PowerShell)
# =============================================================================
# Opens 3 PowerShell windows: Docker (status tail), Django backend, Vite frontend.
# Run from project root:
#     pwsh -ExecutionPolicy Bypass -File scripts/start.ps1
# =============================================================================

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

Write-Host "==> Starting Docker infrastructure..." -ForegroundColor Cyan
docker compose up -d
if ($LASTEXITCODE -ne 0) { Write-Host "docker compose up failed" -ForegroundColor Red; exit 1 }
Start-Sleep -Seconds 3
docker compose ps

Write-Host "==> Launching backend window..." -ForegroundColor Cyan
Start-Process pwsh -ArgumentList @(
    "-NoExit","-Command",
    "Set-Location '$RepoRoot\backend'; .\venv\Scripts\Activate.ps1; python manage.py runserver"
)

Write-Host "==> Launching frontend window..." -ForegroundColor Cyan
Start-Process pwsh -ArgumentList @(
    "-NoExit","-Command",
    "Set-Location '$RepoRoot\frontend'; npm run dev"
)

Write-Host ""
Write-Host "Frontend  : http://localhost:5173" -ForegroundColor Green
Write-Host "Backend   : http://localhost:8000" -ForegroundColor Green
Write-Host "API docs  : http://localhost:8000/api/schema/swagger-ui/" -ForegroundColor Green
Write-Host "MinIO     : http://localhost:9001" -ForegroundColor Green
Write-Host "RabbitMQ  : http://localhost:15672" -ForegroundColor Green
Write-Host ""
Write-Host "To also run Celery, open a new terminal and:" -ForegroundColor Yellow
Write-Host "  cd backend; .\venv\Scripts\Activate.ps1; celery -A config worker --loglevel=info -P solo"
