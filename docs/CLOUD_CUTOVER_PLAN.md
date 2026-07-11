# Cloud Cutover Plan

Updated: 2026-07-11

## Target

- The public marketing entry runs as a Cloudflare Worker.
- The private operator app runs on a Linux Docker host behind Cloudflare Access and a remotely managed Tunnel.
- Caddy, Next.js, FastAPI, worker, and scheduler are reachable only on the Docker network.
- Supabase/Postgres is the only production database and private Supabase Storage holds trusted evidence.
- SQLite, localhost, and temporary tunnels remain development-only.

## Automated Release

Use `.github/workflows/cloud-deploy.yml`. The workflow:

1. Runs cloud guardrails and Worker tests.
2. Builds immutable backend and frontend GHCR images tagged with the commit SHA.
3. Requires explicit backup confirmation.
4. Uploads only deployment manifests and SQL migrations.
5. Applies tracked migrations and verifies signal trust invariants.
6. Starts the app, worker, scheduler, Caddy, and Tunnel without building source on the server.
7. Verifies the real HTTPS app through a Cloudflare Access service token.
8. Restores the previous application image references when remote smoke tests fail.

Required secrets and variables are listed in `docs/V015_PRODUCTION_READINESS.md`.

## Supabase Boundary

FastAPI is the sole production mutation and strategy engine. The historical Supabase Edge Functions are not deployed in V0.15 because their older request-body trust model does not satisfy the current evidence and identity rules. Supabase provides PostgreSQL, private object storage, backups, and optional read access through RLS.

## Cutover Gate

The release is complete only after the real domain passes `scripts/verify-cloud.ps1`, `/api/system/ready` reports no missing tables, one real evidence-to-signal flow succeeds, the background daily flow completes, and the trust verification reports zero invalid triggered signals.

Current repository secrets and variables are still empty, so this repository is cloud-ready but not currently verified as live.
