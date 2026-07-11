# Cloud Runtime Guardrails

Date: 2026-07-01

## Target Runtime

Production should run from cloud infrastructure:

- Public entry: Cloudflare Worker or Cloudflare DNS route.
- Full app runtime: cloud server/container stack in `deploy/production`.
- Database: Supabase/Postgres through `DATABASE_URL`.
- Supabase async/admin workflows: Supabase Edge Functions in `supabase/functions`.

Localhost, local tunnels, and SQLite are only for explicit local development or tests.

## Enforced In This Repo

- `deploy/production/docker-compose.yml` now fails if `DATABASE_URL`, `PUBLIC_BASE_URL`, or `FRONTEND_ORIGINS` are missing.
- `deploy/production/.env.example` now points `DATABASE_URL` to Supabase/Postgres instead of SQLite.
- `frontend/next.config.mjs` should receive `INTERNAL_API_BASE_URL` for container/cloud builds; local builds fall back to the public/local API base when that variable is absent.
- `deploy/cloudflare-public/worker.js` no longer hardcodes `loca.lt`; it reads `APP_URL` from Worker vars.
- `scripts/check-cloud-runtime.py` fails CI if production config reintroduces local tunnel URLs, SQLite production defaults, or localhost API fallback.

## Local-Only Files Still Expected

These are intentionally local and should not be interpreted as cloud production:

- `scripts/start-local.ps1`
- `scripts/run-real-flow.ps1`
- `scripts/audit-local.py`
- backend unit tests using in-memory SQLite
- `backend/app/config.py` default SQLite value for no-env local development

## Remote Verification Still Needed

This environment could not complete live Cloudflare/Supabase CLI checks because `npx wrangler whoami` and `npx supabase --version` timed out.

Before claiming production is live, verify with real credentials:

```bash
cd deploy/cloudflare-public
npx wrangler deploy
npx wrangler secret put APP_URL
curl https://<worker-domain>/health

cd ../../
supabase functions list --project-ref woywgfoqurumrkyoznnb
psql "<SUPABASE_DATABASE_URL>" -c "select count(*) from public.products;"
```

Then verify the full app URL:

```bash
curl https://<app-domain>/api/system/health
curl "https://<app-domain>/api/frontend/bootstrap?product_limit=1"
python scripts/check-cloud-runtime.py
```
