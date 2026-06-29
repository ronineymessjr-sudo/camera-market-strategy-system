$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Backend = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"
$Logs = Join-Path $Root "logs"
New-Item -ItemType Directory -Force -Path $Logs | Out-Null
$Python = Join-Path $Backend ".venv\Scripts\python.exe"
if (-not (Test-Path $Python)) { throw "Run scripts\setup-local.ps1 first." }

$backendProc = Start-Process -FilePath $Python -ArgumentList @("-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000") -WorkingDirectory $Backend -RedirectStandardOutput (Join-Path $Logs "backend.out.log") -RedirectStandardError (Join-Path $Logs "backend.err.log") -PassThru
$frontendProc = Start-Process -FilePath "npm.cmd" -ArgumentList @("run", "dev") -WorkingDirectory $Frontend -RedirectStandardOutput (Join-Path $Logs "frontend.out.log") -RedirectStandardError (Join-Path $Logs "frontend.err.log") -PassThru
$backendProc.Id | Set-Content (Join-Path $Logs "backend.pid")
$frontendProc.Id | Set-Content (Join-Path $Logs "frontend.pid")
Write-Host "Backend PID $($backendProc.Id), Frontend PID $($frontendProc.Id)"
Write-Host "Frontend: http://127.0.0.1:3000"
Write-Host "Backend docs: http://127.0.0.1:8000/docs"
