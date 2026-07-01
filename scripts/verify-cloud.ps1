$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

param(
    [Parameter(Mandatory = $true)]
    [string]$BaseUrl
)

if ($BaseUrl -notmatch "^https://") {
    throw "BaseUrl must be a cloud HTTPS URL."
}
if ($BaseUrl -match "127\.0\.0\.1|localhost|loca\.lt|trycloudflare\.com") {
    throw "BaseUrl must not be localhost or a temporary tunnel."
}

$BaseUrl = $BaseUrl.TrimEnd("/")
$checks = @(
    "/api/system/health",
    "/api/prices/stats",
    "/api/frontend/bootstrap?product_limit=1&candidate_limit=1",
    "/api/products"
)

foreach ($path in $checks) {
    $url = "$BaseUrl$path"
    $response = Invoke-RestMethod -Uri $url -TimeoutSec 20
    Write-Host "OK $path"
}

Write-Host "Cloud runtime verified: $BaseUrl"
