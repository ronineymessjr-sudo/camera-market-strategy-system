$Root = Split-Path -Parent $PSScriptRoot
$Logs = Join-Path $Root "logs"

function Get-DescendantProcessIds([int]$ParentId) {
  $children = Get-CimInstance Win32_Process -Filter "ParentProcessId = $ParentId" -ErrorAction SilentlyContinue
  foreach ($child in $children) {
    Get-DescendantProcessIds -ParentId $child.ProcessId
    $child.ProcessId
  }
}

foreach ($name in @("backend", "frontend")) {
  $pidFile = Join-Path $Logs "$name.pid"
  if (Test-Path $pidFile) {
    $processId = [int](Get-Content $pidFile)
    $descendantIds = @(Get-DescendantProcessIds -ParentId $processId)
    foreach ($descendantId in $descendantIds) {
      Stop-Process -Id $descendantId -Force -ErrorAction SilentlyContinue
    }
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
    Write-Host "Stopped $name process tree ($processId)"
  }
}
