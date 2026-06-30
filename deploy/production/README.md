# Production Deployment

This folder is the recommended path for running the full Camera Market Strategy System in the cloud. It deploys the real application runtime, not just the public Cloudflare landing page.

## What This Deploys

- `frontend`: Next.js 16 production server
- `backend`: FastAPI API server
- `caddy`: HTTPS reverse proxy for one public domain
- `database`: persistent SQLite by default, with optional Supabase/Postgres runtime

## When To Use This

Use this package when you want the whole platform to be available from a stable public URL.

Do not treat temporary tunnel URLs such as `loca.lt` as production. They are useful for demos, but they disappear when the local tunnel process stops.

## Required Inputs

1. A persistent Linux server or VM.
2. Docker and the Docker Compose plugin.
3. A domain pointed to the server.
4. A completed `.env` file based on `.env.example`.
5. Optional: the current `backend/camera_market.db` if you want immediate continuity from local SQLite.

## One-Time Server Setup

```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-plugin
sudo systemctl enable --now docker
```

## Configure Environment

```bash
cd deploy/production
cp .env.example .env
```

Then fill in:

- `PUBLIC_DOMAIN`
- `NEXT_PUBLIC_API_BASE_URL`
- `INTERNAL_API_BASE_URL`
- `FRONTEND_ORIGINS`
- `DATABASE_URL`

## Database Choices

### Option A: Persistent SQLite

This is the fastest production cutover and preserves current FastAPI behavior.

Use a value like:

```env
DATABASE_URL=sqlite:////data/camera_market.db
```

If you already have local history, copy `backend/camera_market.db` into the backend volume as `/data/camera_market.db` after the first container run creates the volume.

### Option B: Supabase/Postgres

The backend runtime now auto-selects:

- `platform_listings` for SQLite
- `product_listings` for Postgres/Supabase

That means a Supabase/Postgres `DATABASE_URL` can use the V0.12 schema naming without a backend fork. Before switching production traffic to Supabase, verify all API paths you rely on with the same test commands below.

## Deploy

```bash
cd deploy/production
docker compose --env-file .env up -d --build
```

## Verify

```bash
curl -I https://your-domain.example/
curl https://your-domain.example/api/system/health
curl https://your-domain.example/api/frontend/bootstrap?product_limit=1
```

You should also open these routes in a browser:

- `/`
- `/products`
- `/products/1`
- `/opportunities`
- `/verification`
- `/strategies`
- `/sources`

## Cloudflare DNS

If Cloudflare manages the domain:

1. Point the DNS record to the server.
2. Enable proxying only after the server is serving HTTPS correctly.
3. Keep the Cloudflare Worker as a landing page only if you still want a separate marketing entry.
4. Route the real app traffic to this Caddy-backed server.

## Operational Checks

```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f caddy
```

Useful health URLs:

- `https://your-domain.example/api/system/health`
- `https://your-domain.example/api/frontend/bootstrap?product_limit=1`

## Updating The Deployment

```bash
git pull
cd deploy/production
docker compose --env-file .env up -d --build
```

## Rollback

If a deploy fails:

1. Keep the previous database volume.
2. Check `docker compose logs`.
3. Revert to the previous git commit.
4. Rebuild the stack.

```bash
git checkout <previous-good-commit>
docker compose --env-file .env up -d --build
```

## Notes

- Secrets must stay in `.env` or platform secret stores.
- The application does not place orders or bypass login/captcha walls.
- Only fresh `VERIFIED_CHECKOUT` records should trigger strategy action.
- Supabase Edge Functions remain useful for admin and async workflows, but they are not a full replacement for the FastAPI API layer yet.
