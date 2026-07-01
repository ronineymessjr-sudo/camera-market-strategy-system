# Cloud Cutover Plan

Date: 2026-07-01

## Goal

Move the full Camera Market Strategy System off localhost:

- Cloudflare is the public entry/DNS layer.
- The full app runtime runs on a cloud server/container stack.
- Supabase/Postgres is the production database.
- Local scripts remain only for development and tests.

## Repository Changes Already Enforced

1. Root `docker-compose.yml` now points to the cloud production stack and refuses to run without a Supabase/Postgres `DATABASE_URL`.
2. `deploy/production/docker-compose.yml` also requires cloud `DATABASE_URL`, `PUBLIC_BASE_URL`, and `FRONTEND_ORIGINS`.
3. `frontend/next.config.mjs` requires `INTERNAL_API_BASE_URL`; it no longer falls back to `127.0.0.1`.
4. Cloudflare Worker no longer hardcodes `loca.lt`; it uses Worker var `APP_URL`.
5. `scripts/check-cloud-runtime.py` is in CI to prevent production config from falling back to local runtime.
6. `scripts/deploy-cloud.ps1` refuses SQLite, localhost, and temporary tunnel URLs.
7. `scripts/verify-cloud.ps1` refuses localhost and temporary tunnel URLs.

## Required Cloud Inputs

Fill `.env.cloud` from `deploy/production/.env.example`:

- `SITE_HOST`
- `PUBLIC_BASE_URL`
- `FRONTEND_ORIGINS`
- `DATABASE_URL` for Supabase/Postgres
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- marketplace API keys when ready

## Cloud Commands

```powershell
Copy-Item deploy\production\.env.example .env.cloud
powershell -ExecutionPolicy Bypass -File scripts\deploy-cloud.ps1 -EnvFile .env.cloud
powershell -ExecutionPolicy Bypass -File scripts\verify-cloud.ps1 -BaseUrl https://your-domain.example
```

Cloudflare Worker:

```bash
cd deploy/cloudflare-public
npx wrangler deploy
npx wrangler secret put APP_URL
```

Supabase:

```bash
psql "<SUPABASE_DATABASE_URL>" -f supabase/seeds/local_v012_seed.sql
supabase functions deploy verify-price invalidate-price evaluate-strategy refresh-product send-notification generate-daily-report record-source-health --project-ref woywgfoqurumrkyoznnb
```

## GitHub Actions Cloud Deploy

Workflow: `.github/workflows/cloud-deploy.yml`

Repository variables:

- `CLOUDFLARE_DEPLOY_ENABLED=true`
- `CLOUD_APP_DEPLOY_ENABLED=true`
- `APP_URL=https://your-domain.example`
- `CLOUD_APP_PATH=/opt/camera-market-strategy-system`
- `SITE_HOST=your-domain.example`
- `PUBLIC_BASE_URL=https://your-domain.example`
- `FRONTEND_ORIGINS=https://your-domain.example`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<anon-or-publishable-key>`

Repository secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUD_HOST`
- `CLOUD_SSH_USER`
- `CLOUD_SSH_KEY`
- `SUPABASE_DATABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

The deploy workflow runs `scripts/check-cloud-runtime.py` first, then deploys the Cloudflare Worker and the cloud Docker Compose app. It does not deploy when the enable variables are not set to `true`.

## Current Blocker In This Codex Environment

The local environment timed out when checking:

- `npx wrangler whoami`
- `npx supabase --version`

So the repository is now guarded for cloud runtime, but live remote deployment still requires working Cloudflare/Supabase CLI authentication or equivalent CI secrets.
