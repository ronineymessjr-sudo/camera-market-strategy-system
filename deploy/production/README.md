# Production Migration

This folder is the real cloud deployment path for the full application. It is meant for a persistent Linux host or VM, not a local tunnel.

## What this deploys

- `frontend`: Next.js 16 production server
- `backend`: FastAPI application
- `caddy`: HTTPS reverse proxy for one public domain
- `database`: persistent SQLite by default, with optional future Postgres migration

## Why this is the correct migration target

- The current Cloudflare Worker is only a landing page.
- The temporary `loca.lt` URL is not a deployment target.
- Supabase already holds the real migrated V0.12 data, so the missing piece is a persistent app runtime.

## Required inputs

1. A Linux server with Docker and Docker Compose plugin installed
2. A domain that points to the server
3. The current SQLite database file if you want to preserve the exact local history immediately

## One-time server setup

```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-plugin
sudo systemctl enable --now docker
```

## Deploy

1. Copy this repository to the server.
2. Copy `.env.example` to `.env` inside this folder and fill the domain values.
3. If you want to keep the current local history immediately, copy `backend/camera_market.db` from this workspace to the server and place it at the backend volume path as `/data/camera_market.db` after the first `docker compose up`.
4. Start the stack:

```bash
cd deploy/production
docker compose --env-file .env up -d --build
```

5. Verify:

```bash
curl -I https://your-domain.example/
curl https://your-domain.example/api/system/health
```

## Notes

- This path is the fastest way to stop depending on local tunnels while preserving the current application behavior.
- The runtime still uses the existing FastAPI APIs. Supabase Edge Functions remain useful for asynchronous or admin workflows, but they are not yet a full API replacement.
- A direct runtime switch to the current Supabase Postgres database is not zero-risk yet because the backend ORM still expects `platform_listings` while the V0.12 cloud schema uses `product_listings`.
- If you want Cloudflare in front of this server, point your DNS record through Cloudflare after the server is up.
