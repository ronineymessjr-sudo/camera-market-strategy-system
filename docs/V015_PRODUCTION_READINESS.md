# V0.15 Production Readiness

Date: 2026-07-11

## Implemented

- Cloudflare Access JWT validation and single-operator email restriction.
- Supabase Storage evidence uploads with server-side hashes and upload provenance.
- Strict application and PostgreSQL signal trust checks.
- Legacy unproven checkout-price downgrade and signal revocation.
- PostgreSQL background jobs, worker, scheduler, idempotency, and non-blocking claims.
- Async frontend flow for crawls, reports, daily jobs, and integrations.
- Real notification inbox, mark-all-read, signed webhook delivery, and retry tracking.
- Server-side review filters and pagination plus runtime source-health history.
- Batched summary queries, readiness checks, request IDs, JSON logs, and rate limits.
- GHCR immutable images, migration tracking, Cloudflare Tunnel, remote smoke tests, and app rollback.
- PostgreSQL 17 migration CI, Apache-2.0, security policy, and contribution guide.

## External Inputs Still Required

GitHub secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_TUNNEL_TOKEN`
- `CLOUDFLARE_ACCESS_CLIENT_ID`
- `CLOUDFLARE_ACCESS_CLIENT_SECRET`
- `SUPABASE_DATABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPERATOR_API_TOKEN`
- `CLOUD_HOST`, `CLOUD_SSH_USER`, `CLOUD_SSH_KEY`

GitHub variables:

- `CLOUDFLARE_DEPLOY_ENABLED=true`
- `CLOUD_APP_DEPLOY_ENABLED=true`
- `DATABASE_BACKUP_CONFIRMED=true`
- `APP_URL`, `PUBLIC_BASE_URL`, `FRONTEND_ORIGINS`
- `CLOUD_APP_PATH`
- `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `CLOUDFLARE_ACCESS_TEAM_DOMAIN`, `CLOUDFLARE_ACCESS_AUDIENCE`, `OPERATOR_EMAIL`

## Cloudflare Setup

Create a remotely managed Tunnel and map the private app hostname to `http://caddy:80`. Create a self-hosted Access application for that hostname, allow only `OPERATOR_EMAIL`, and create a service token for GitHub smoke tests. The public Worker uses a separate public hostname and stores `APP_URL` as a Worker secret.

## Release Gate

Do not mark production live until the deploy workflow succeeds, `/api/system/ready` reports `ready`, a real clue can be uploaded and verified, a trusted strategy signal creates a notification, the daily job completes in the worker, and the remote trust query reports zero invalid triggered signals.

Official JD, Taobao, PDD, eBay, and Amazon adapters remain disabled until their real credentials and API permissions are supplied and tested with small imports.

## Staging Browser Flow

`scripts/e2e-cloud.py` performs the real staging flow with Cloudflare Access, an operator automation token, and an operator-supplied checkout evidence file. It creates an isolated test product and strategy, uploads evidence through the browser, verifies the resulting signal and notification, and archives the test product. It intentionally refuses localhost and temporary tunnel URLs.
