$Root = Split-Path -Parent $PSScriptRoot
$Logs = Join-Path $Root "logs"
foreach ($name in @("backend", "frontend")) {
  $pidFile = Join-Path $Logs "$name.pid"
  if (Test-Path $pidFile) {
    $processId = Get-Content $pidFile
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
    Write-Host "Stopped $name ($processId)"
  }
}
