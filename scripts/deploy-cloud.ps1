$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

param(
    [string]$EnvFile = ".env.cloud"
)

$Root = Split-Path -Parent $PSScriptRoot
$EnvPath = Join-Path $Root $EnvFile

if (-not (Test-Path $EnvPath)) {
    throw "Missing cloud env file: $EnvPath. Copy deploy\production\.env.example to $EnvFile and fill real cloud values."
}

$envText = Get-Content $EnvPath -Raw
if ($envText -match "DATABASE_URL\s*=\s*sqlite:") {
    throw "Cloud deploy refused: DATABASE_URL must be Supabase/Postgres, not SQLite."
}
if ($envText -match "PUBLIC_BASE_URL\s*=\s*http://(127\.0\.0\.1|localhost)" -or $envText -match "FRONTEND_ORIGINS\s*=\s*http://(127\.0\.0\.1|localhost)") {
    throw "Cloud deploy refused: PUBLIC_BASE_URL and FRONTEND_ORIGINS must be cloud HTTPS URLs."
}
if ($envText -match "loca\.lt|trycloudflare\.com") {
    throw "Cloud deploy refused: local tunnel URLs are not production cloud runtime."
}

Push-Location $Root
try {
    & docker compose -p camera-market --env-file $EnvPath config | Out-Null
    & docker compose -p camera-market --env-file $EnvPath up -d --build
}
finally {
    Pop-Location
}
