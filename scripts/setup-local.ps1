$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Backend = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"

if (-not (Test-Path (Join-Path $Backend ".venv"))) {
  python -m venv (Join-Path $Backend ".venv")
}
$Python = Join-Path $Backend ".venv\Scripts\python.exe"
& $Python -m pip install --upgrade pip
& $Python -m pip install -r (Join-Path $Backend "requirements.txt")
& $Python -m playwright install chromium
Push-Location $Frontend
npm install
Pop-Location
Push-Location $Backend
& $Python -X utf8 scripts\migrate_local.py
& $Python -X utf8 scripts\seed_real_sources.py --bootstrap
Pop-Location
Write-Host "Setup complete. Run scripts\start-local.ps1 next."
