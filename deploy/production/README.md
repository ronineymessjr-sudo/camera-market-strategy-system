# Production Deployment

This package runs the private V0.15 operator application on a persistent Linux host. Cloudflare Tunnel is the only HTTP ingress; the host does not expose application ports 80, 443, 3000, or 8000 publicly.

## Services

- `frontend`: Next.js operator UI
- `backend`: FastAPI API
- `worker`: PostgreSQL background-job processor
- `scheduler`: recurring daily-flow enqueuer
- `caddy`: internal same-origin router
- `cloudflared`: remotely managed Cloudflare Tunnel connector
- `database`: external Supabase/Postgres through `DATABASE_URL`
- `evidence`: private Supabase Storage bucket

## Required Setup

1. Create a Linux VM with Docker Engine and the Compose plugin.
2. Create a remotely managed Cloudflare Tunnel and route `app.<domain>` to `http://caddy:80`.
3. Create a Cloudflare Access self-hosted application for the private hostname and allow only the operator email.
4. Create an Access service token for GitHub smoke tests.
5. Fill GitHub secrets and variables from `docs/V015_PRODUCTION_READINESS.md`.
6. Confirm a current Supabase backup before setting `DATABASE_BACKUP_CONFIRMED=true`.

## Deployment

Use `.github/workflows/cloud-deploy.yml`. It builds immutable GHCR images, uploads only deployment manifests and migrations, applies tracked migrations, verifies trust invariants, deploys the stack, and runs HTTPS checks through Cloudflare Access.

For a manual configuration check only:

```bash
docker compose -f deploy/production/docker-compose.yml --env-file .env.cloud config
```

For a manual rollout after images already exist:

```bash
docker compose -f deploy/production/docker-compose.yml --env-file .env.cloud pull
docker compose -f deploy/production/docker-compose.yml --env-file .env.cloud up -d --no-build --remove-orphans
```

## Verification

```powershell
$env:CLOUDFLARE_ACCESS_CLIENT_ID="service-token-id"
$env:CLOUDFLARE_ACCESS_CLIENT_SECRET="service-token-secret"
./scripts/verify-cloud.ps1 -BaseUrl https://app.example.com
```

Production is not complete until readiness, evidence upload, checkout verification, strategy evaluation, notification creation, report generation, and background jobs all work against the real HTTPS URL.
