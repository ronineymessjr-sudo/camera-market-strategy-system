# Cloud Migration Status

## Current truth

- Supabase is already cloud-hosted and contains the real V0.12 dataset.
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

- A persistent server or VM
- A real public domain bound to that server
- If you want immediate data continuity on the full runtime, a copy of the current `backend/camera_market.db`

## Important schema note

- The current FastAPI runtime still uses the ORM table name `platform_listings`.
- The V0.12 Supabase cloud schema uses `product_listings`.
- That means the app can migrate to a real cloud server immediately, but a direct runtime cutover from SQLite to the current Supabase Postgres database still needs one schema compatibility pass first.

## Recommended cutover order

1. Bring up the production Docker stack on a server
2. Point the domain to the server
3. Verify `/api/system/health`, `/products`, and `/products/1`
4. Retire the unstable `loca.lt` link
5. Keep the Cloudflare Worker only as a marketing/entry page or remove it
