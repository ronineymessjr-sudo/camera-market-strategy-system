# Cloud Migration Status

## Current truth

- A Supabase project reference and historical seed package exist, but current production data and V0.15 migrations have not been remotely verified from this environment.
- The Cloudflare Worker is only a public entry page.
- The full application runtime is still the self-hosted Next.js + FastAPI stack.

## What was missing

- A production deployment package for the real full stack
- A server-oriented environment template
- A reverse-proxy configuration for one public domain

## What is now ready

- `deploy/production/docker-compose.yml`
- `deploy/production/Caddyfile`
- `deploy/production/.env.example`
- `deploy/production/README.md`

## What still blocks a real cloud cutover

- A persistent server or VM with Docker
- A real public domain, Cloudflare Access application, and remotely managed Tunnel
- GitHub deployment secrets and variables listed in `docs/V015_PRODUCTION_READINESS.md`
- A verified Supabase/Postgres `DATABASE_URL`, backup confirmation, and service-role key

## Important schema note

- The FastAPI runtime now auto-selects the listing table name from `DATABASE_URL`.
- Local SQLite uses `platform_listings`.
- Supabase/Postgres uses `product_listings`, which matches the V0.12 cloud schema.

## Recommended cutover order

1. Configure Cloudflare Access, Tunnel, and the private app hostname.
2. Fill GitHub secrets and confirm a Supabase backup.
3. Run the deployment workflow so V0.15 migrations and trust checks execute before the app rollout.
4. Verify `/api/system/health`, `/api/system/ready`, the complete evidence flow, and the daily background job.
5. Keep the Cloudflare Worker as the separate public entry page.
