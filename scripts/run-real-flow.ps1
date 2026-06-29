$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$Root = Split-Path -Parent $PSScriptRoot
$Backend = Join-Path $Root "backend"
$Python = Join-Path $Backend ".venv\Scripts\python.exe"
if (-not (Test-Path $Python)) { throw "Run scripts\setup-local.ps1 first." }

Push-Location $Backend
& $Python -X utf8 scripts\migrate_local.py
Pop-Location

try { Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/system/health" -TimeoutSec 5 | Out-Null }
catch { throw "Backend is not running. Run scripts\start-local.ps1 first." }

$crawl = Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8000/api/prices/crawl-all?force=false"
Write-Host "Crawl: success=$($crawl.run.success_count), failure=$($crawl.run.failure_count), skipped=$($crawl.run.skipped_count)"
$report = Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8000/api/reports/generate"
Write-Host "Report generated: id=$($report.id), date=$($report.report_date), chart=$($report.chart_path)"
& $Python -X utf8 (Join-Path $Root "scripts\audit-local.py")
