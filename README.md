# Camera Market Strategy System

Verified camera-market price intelligence for a single operator.

This project tracks camera, lens, and creator-device prices, separates raw price clues from verified checkout evidence, evaluates user-defined buying strategies, and produces daily decision reports. The current V0.12 branch also includes a redesigned operator UI with a Command Center, Verification Cockpit, Price Story, Strategy Lab, Source Health Atlas, and mobile-friendly Operator Mode.

## Current Status

- Active branch: `feat/v0.12-supabase-integration`
- Frontend: Next.js 16 production app
- Backend: FastAPI + SQLAlchemy
- Production database: Supabase/Postgres through `DATABASE_URL`
- Local SQLite: development/tests only
- Cloud data layer: Supabase PostgreSQL V0.12 schema and real seed imported
- Deployment path: Docker Compose + Caddy on a persistent Linux server, fronted by Cloudflare DNS/Worker
- GitHub remote: `git@github.com:ronineymessjr-sudo/camera-market-strategy-system.git`

The Cloudflare Worker in this repository is only a public entry page. The full product runtime is the cloud Next.js + FastAPI stack, backed by Supabase/Postgres. Temporary tunnels and localhost are not production targets.

## What The Product Does

- Maintains a dynamic product watchlist for cameras, lenses, drones, tablets, and creator hardware.
- Crawls active public source URLs and stores price records with source metadata.
- Keeps visible page prices as evidence until a human verifies checkout price.
- Allows only fresh `VERIFIED_CHECKOUT` records to trigger buying strategies.
- Evaluates watch, trigger, and strong-buy thresholds.
- Generates daily reports and opportunity ranking.
- Tracks provider/API configuration status for JD, Taobao, PDD, eBay, Amazon, and crawler sources.
- Exports and imports V0.12 data to Supabase.

## Trust Rule

The core safety rule is:

```text
VISIBLE_PRICE / UNVERIFIED / STALE = evidence only
VERIFIED_CHECKOUT = allowed to trigger strategy action
```

The system does not place orders, bypass logins, bypass captchas, auto-pay, or treat MSRP/spec numbers as real checkout prices.

## V0.12 UI Surfaces

- `Command Center`: homepage operator desk for today&apos;s signals, review pressure, and next actions.
- `Verification Cockpit`: manual review flow for turning visible price clues into checkout-verified records.
- `Price Story`: product detail timeline for drops, trusted checkpoints, lowest points, and strategy context.
- `Strategy Lab`: strategy behavior view for active rules, trigger prices, strong-buy prices, and freshness limits.
- `Source Health Atlas`: provider/API/crawler health view.
- `Operator Mode`: compact self-use flow for act, verify, and close-the-loop tasks.

## Repository Layout

```text
backend/                 FastAPI app, SQLAlchemy models, services, tests
frontend/                Next.js app and V0.12 operator UI
scripts/                 Local setup, real-flow, audit, and export scripts
supabase/                V0.12 migrations, seed files, Edge Functions
deploy/production/       Docker Compose + Caddy production deployment package
docs/                    Architecture, handoff, validation, API, and changelog docs
```

## Cloud Deployment

From the repository root:

```powershell
Copy-Item deploy\production\.env.example .env.cloud
# Fill .env.cloud with the real domain, Supabase/Postgres DATABASE_URL, and secrets.
powershell -ExecutionPolicy Bypass -File scripts\deploy-cloud.ps1 -EnvFile .env.cloud
powershell -ExecutionPolicy Bypass -File scripts\verify-cloud.ps1 -BaseUrl https://your-domain.example
```

The root `docker-compose.yml` is now cloud-production oriented and refuses to run without a Supabase/Postgres `DATABASE_URL`.

## Local Development Only

Use this only for local debugging, not production:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\setup-local.ps1
powershell -ExecutionPolicy Bypass -File scripts\start-local.ps1
```

## Real Data Workflow

Use this for the local self-use flow only:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\run-real-flow.ps1
```

That workflow is intended to:

1. Ensure local development services are available.
2. Apply any local database upgrades.
3. Crawl active public product sources.
4. Generate the daily report.
5. Run the local audit.

For a local audit only:

```powershell
python scripts\audit-local.py
```

## Verification And Testing

Backend tests:

```powershell
backend\.venv\Scripts\python.exe -m pytest backend\tests -q
```

Frontend production build:

```powershell
npm --prefix frontend run build
```

Current verified baseline after the V0.12 operator UI work:

- Backend tests: `21 passed`
- Frontend build: passed with Next.js `16.2.9`
- Supabase real seed imported and checked with `bad_triggered_signals = 0`

## Supabase

Supabase V0.12 is documented in [supabase/README_SUPABASE.md](supabase/README_SUPABASE.md).

Important facts:

- Project ref: `woywgfoqurumrkyoznnb`
- Region: `ap-southeast-2`
- Database: PostgreSQL 17
- Real local V0.12 seed was imported successfully.
- The backend can now use `platform_listings` for local SQLite and `product_listings` for Supabase/Postgres based on `DATABASE_URL`.

## Production Deployment

The recommended production package is in [deploy/production](deploy/production).

At a high level:

```bash
cd deploy/production
cp .env.example .env
docker compose --env-file .env up -d --build
```

Use a persistent Linux host or VM plus a real domain. Temporary tunnels such as `loca.lt` are not production deployment targets.

## Important Docs

- [Architecture](docs/ARCHITECTURE.md)
- [Frontend API Contract](docs/FRONTEND_API_CONTRACT.md)
- [Self-use Runbook](docs/SELF_USE_RUNBOOK.md)
- [V0.12 Changelog](docs/CHANGELOG_V012.md)
- [Cloud Migration Status](docs/CLOUD_MIGRATION_STATUS.md)
- [GPT Handoff Board](docs/GPT_HANDOFF_BOARD.md)
- [API Integrations](docs/API_INTEGRATIONS.md)
- [API Key Application Guide](docs/API_KEY_APPLICATION_GUIDE.md)

## Development Notes

- Prefer real source URLs and explicit verification over synthetic price claims.
- Keep secrets out of git. Use `.env` files and platform secrets.
- Do not force dependency upgrades unless the build and tests stay green.
- Do not delete legacy UI routes; `legacy-v06` remains available for comparison.
- When changing strategy logic, add or update backend tests around the `VERIFIED_CHECKOUT` trust rule.

## License

No license file is currently included. Treat the repository as private/internal until a license is added.
