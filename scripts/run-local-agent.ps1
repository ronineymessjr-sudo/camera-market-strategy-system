param(
  [int]$BackendPort = 8100,
  [int]$FrontendPort = 3100
)

$ErrorActionPreference = "Stop"
$AgentMutex = [System.Threading.Mutex]::new($false, "Local\CameraMarketPriceAgent")
if (-not $AgentMutex.WaitOne(0)) {
  Write-Output "Another local price agent run is already active; skipping this run."
  exit 0
}

try {
$Root = Split-Path -Parent $PSScriptRoot
$Backend = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"
$Logs = Join-Path $Root "logs"
$Python = Join-Path $Backend ".venv\Scripts\python.exe"
$HealthUrl = "http://127.0.0.1:$BackendPort/api/system/health"
$FrontendUrl = "http://127.0.0.1:$FrontendPort/"

New-Item -ItemType Directory -Force -Path $Logs | Out-Null
if (-not (Test-Path $Python)) { throw "Run scripts\setup-local.ps1 first." }

Push-Location $Backend
try {
  & $Python -X utf8 scripts\migrate_local.py
} finally {
  Pop-Location
}

function Test-BackendHealth {
  try {
    Invoke-RestMethod -Uri $HealthUrl -TimeoutSec 5 | Out-Null
    return $true
  } catch {
    return $false
  }
}

function Test-FrontendHealth {
  try {
    Invoke-WebRequest -Uri $FrontendUrl -UseBasicParsing -TimeoutSec 10 | Out-Null
    return $true
  } catch {
    return $false
  }
}

if (-not (Test-BackendHealth)) {
  if (Get-NetTCPConnection -LocalPort $BackendPort -State Listen -ErrorAction SilentlyContinue) {
    throw "Port $BackendPort is already in use by another backend."
  }
  $previousBypass = $env:LOCAL_DEV_AUTH_BYPASS
  $env:LOCAL_DEV_AUTH_BYPASS = "true"
  try {
    $backendProcess = Start-Process -FilePath $Python -ArgumentList @("-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", $BackendPort) -WorkingDirectory $Backend -RedirectStandardOutput (Join-Path $Logs "agent-backend.out.log") -RedirectStandardError (Join-Path $Logs "agent-backend.err.log") -WindowStyle Hidden -PassThru
    $backendProcess.Id | Set-Content (Join-Path $Logs "agent-backend.pid")
  } finally {
    $env:LOCAL_DEV_AUTH_BYPASS = $previousBypass
  }
  $backendDeadline = (Get-Date).AddMinutes(2)
  while ((Get-Date) -lt $backendDeadline -and -not (Test-BackendHealth)) { Start-Sleep -Seconds 2 }
  if (-not (Test-BackendHealth)) { throw "Local backend did not become healthy within two minutes." }
}

if (-not (Test-FrontendHealth)) {
  if (Get-NetTCPConnection -LocalPort $FrontendPort -State Listen -ErrorAction SilentlyContinue) {
    throw "Port $FrontendPort is already in use by another frontend."
  }
  $previousApiBase = $env:INTERNAL_API_BASE_URL
  $env:INTERNAL_API_BASE_URL = "http://127.0.0.1:$BackendPort"
  try {
    $next = Join-Path $Frontend "node_modules\.bin\next.cmd"
    $frontendProcess = Start-Process -FilePath $next -ArgumentList @("start", "-H", "127.0.0.1", "-p", $FrontendPort) -WorkingDirectory $Frontend -RedirectStandardOutput (Join-Path $Logs "agent-frontend.out.log") -RedirectStandardError (Join-Path $Logs "agent-frontend.err.log") -WindowStyle Hidden -PassThru
    $frontendProcess.Id | Set-Content (Join-Path $Logs "agent-frontend.pid")
  } finally {
    $env:INTERNAL_API_BASE_URL = $previousApiBase
  }
  $frontendDeadline = (Get-Date).AddMinutes(2)
  while ((Get-Date) -lt $frontendDeadline -and -not (Test-FrontendHealth)) { Start-Sleep -Seconds 2 }
  if (-not (Test-FrontendHealth)) { throw "Local frontend did not become healthy within two minutes." }
}

$crawl = Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:$BackendPort/api/prices/crawl-all?force=false" -TimeoutSec 600
Write-Output "Crawl: success=$($crawl.run.success_count), failure=$($crawl.run.failure_count), skipped=$($crawl.run.skipped_count)"
$report = Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:$BackendPort/api/reports/generate" -TimeoutSec 600
Write-Output "Report generated: id=$($report.id), date=$($report.report_date)"
& $Python -X utf8 (Join-Path $Root "scripts\audit-local.py") $BackendPort
} finally {
  $AgentMutex.ReleaseMutex()
  $AgentMutex.Dispose()
}
