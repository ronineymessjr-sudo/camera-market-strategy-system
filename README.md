# Camera Market Strategy System

V0.15 is a single-operator camera-market price intelligence platform. It collects public price clues, requires uploaded checkout evidence before a price becomes actionable, evaluates operator-defined strategies, and produces reports and notifications without placing orders.

## Current Status

- Active implementation branch: `codex/v0.14-production-readiness`
- Backend: FastAPI, SQLAlchemy, PostgreSQL/Supabase
- Frontend: Next.js 16
- Cloud runtime: immutable GHCR images on a Linux Docker host
- Public edge: Cloudflare Worker
- Private app ingress: Cloudflare Access and a remotely managed Cloudflare Tunnel
- Production data: Supabase/Postgres only; SQLite is development and migration-source data only

The V0.15 code path is locally verified, but production is not considered live until the required GitHub secrets, domain, Access application, Tunnel, cloud host, and remote smoke tests are complete.

## Trust Rule

```text
VISIBLE_PRICE / UNVERIFIED / LEGACY_IMPORT = clue only
VERIFIED_CHECKOUT + OPERATOR_UPLOAD + trusted evidence + fresh currency match = strategy eligible
```

Historical `VERIFIED_CHECKOUT` rows without server-recorded evidence are downgraded for re-verification. Marketplace API imports and crawlers can only create `VISIBLE_PRICE` or `UNVERIFIED` records.

## V0.15 Capabilities

- Cloudflare Access JWT validation with an automation-token fallback for CI and workers.
- Private Supabase Storage uploads for JPEG, PNG, WebP, and PDF checkout evidence.
- SHA-256 evidence hashes, upload provenance, single-use upload records, and strict signal checks.
- PostgreSQL-backed asynchronous jobs for daily flow, crawling, reports, and provider sync.
- Dedicated worker and scheduler containers with `FOR UPDATE SKIP LOCKED` job claiming.
- Server-side review pagination and filters, real notification inbox, source-health history, and webhook retry delivery.
- Batched bootstrap and product-overview queries to reduce database round trips.
- Request IDs, JSON request logs, heavy-operation rate limits, liveness, and readiness endpoints.
- GHCR image deployment, migration tracking, trust verification, Cloudflare Tunnel, and application rollback workflow.

## Main APIs

- `GET /api/system/health`
- `GET /api/system/ready`
- `POST /api/evidence/upload`
- `GET /api/reviews`
- `POST /api/jobs/daily-flow`
- `POST /api/jobs/crawls`
- `POST /api/jobs/reports`
- `GET /api/jobs/{job_id}`
- `POST /api/notifications/read-all`
- `GET /api/source-health/history`

Existing synchronous mutation routes remain available for one compatibility release, but the V0.15 frontend uses the asynchronous job APIs.

## Local Verification

Local development is not the production runtime.

```powershell
backend\.venv\Scripts\python.exe -m pytest backend\tests -q
npm --prefix frontend run build
backend\.venv\Scripts\python.exe scripts\check-cloud-runtime.py
node --test deploy\cloudflare-public\worker.test.mjs
```

Latest verified baseline:

- Backend: 43 tests passed
- Frontend: production build passed with Next.js 16.2.9
- Frontend dependency audit: 0 vulnerabilities
- Cloud runtime guard: passed

## Cloud Deployment

Production requires the values documented in [V0.15 Production Readiness](docs/V015_PRODUCTION_READINESS.md). GitHub Actions builds immutable backend and frontend images, confirms backup state, applies tracked PostgreSQL migrations, verifies trust invariants, deploys the Docker stack, then checks the private HTTPS application through a Cloudflare Access service token.

The deployment must not be called complete until `scripts/verify-cloud.ps1` passes against the real HTTPS app URL and the SQL trust check reports zero invalid triggered signals.

## Repository Layout

```text
backend/                 FastAPI API, worker, scheduler, models, services, tests
frontend/                Next.js operator application
supabase/                PostgreSQL migrations, storage setup, archived Edge Functions
deploy/production/       Cloudflare Tunnel and Docker Compose runtime
deploy/cloudflare-public Public Worker entry page
scripts/                 Verification, guardrail, export, and deployment helpers
docs/                    Architecture, release, security, and operating documentation
```

## Documentation

- [V0.15 Production Readiness](docs/V015_PRODUCTION_READINESS.md)
- [Website Launch TODO](docs/WEBSITE_LAUNCH_TODO.md)
- [Cloud Cutover Plan](docs/CLOUD_CUTOVER_PLAN.md)
- [V0.14 Trust Modules](docs/V014_MODULES.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Production Runbook](docs/PRODUCTION_RUNBOOK.md)
- [Security Policy](SECURITY.md)
- [Contributing](CONTRIBUTING.md)

## Safety Boundary

The system does not buy automatically, pay, bypass authentication, bypass captchas, or treat a visible promotion as a verified checkout price. Operator and marketplace credentials must remain in Cloudflare, GitHub, or server secret stores and must never be bundled into the frontend.

## License

Licensed under the Apache License 2.0. See [LICENSE](LICENSE).
