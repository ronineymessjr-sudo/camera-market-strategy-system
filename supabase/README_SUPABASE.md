# Supabase V0.12

This directory contains the Supabase database, seed, and Edge Function package for the V0.12 Camera Market Strategy System.

## Production Project

- Project ref: `woywgfoqurumrkyoznnb`
- Region: `ap-southeast-2`
- Database: PostgreSQL 17
- Verified status: `ACTIVE_HEALTHY`

## Directory Layout

```text
supabase/
  functions/                         Edge Functions
  migrations/                        V0.12 PostgreSQL schema
  seeds/                             SQL and JSON exports from local SQLite
  README_SUPABASE.md                 This guide
  ROLLBACK_V012.md                   Rollback notes
```

## What The Migration Creates

`migrations/20260629123000_v012_initial_schema.sql` creates:

- V0.12 public tables
- read policies for frontend-safe data access
- storage buckets: `price-evidence`, `product-images`, `report-exports`
- verification audit trigger
- triggered-signal trust trigger
- indexes used by product, price, strategy, report, and source-health views

## Important Naming Difference

Local SQLite uses:

```text
platform_listings
```

Supabase/Postgres uses:

```text
product_listings
```

The FastAPI runtime now selects the correct table name from `DATABASE_URL`, so the same backend code can boot against either local SQLite or Supabase/Postgres.

## Real Seed Status

The current real local dataset was exported and imported into Supabase:

- `products`: 20
- `product_listings`: 23
- `price_records`: 102
- `strategies`: 20
- `signals`: 23
- `daily_reports`: 4
- `flow_runs`: 7
- `strategy_backtests`: 5

Cloud verification confirmed:

```text
bad_triggered_signals = 0
```

That means triggered signals are backed by `VERIFIED_CHECKOUT` price records.

## Seed Files

- `seeds/local_v012_seed.sql`
- `seeds/local_v012_seed.json`

These are generated from local SQLite by:

```powershell
python scripts/export-sqlite-to-supabase-v012.py --summary
python scripts/export-sqlite-to-supabase-v012.py --out supabase/seeds/local_v012_seed.sql
python scripts/export-sqlite-to-supabase-v012.py --json-out supabase/seeds/local_v012_seed.json
```

Replay the SQL seed when you have a Supabase database URL:

```powershell
psql "<SUPABASE_DATABASE_URL>" -f supabase/seeds/local_v012_seed.sql
```

## Edge Functions

The deployed V0.12 function set includes:

- `verify-price`
- `invalidate-price`
- `evaluate-strategy`
- `refresh-product`
- `send-notification`
- `generate-daily-report`
- `record-source-health`

The temporary `import-v012-seed` function was used once for seed import, then disabled and protected with JWT.

## Migration History

Supabase migration history should contain:

```text
v012_initial_schema
```

The accidental no-op history row `v012_verify_noop` was removed.

## Trust And Security Rules

- `VERIFIED_CHECKOUT` is the only price status allowed to trigger strategy action.
- `VISIBLE_PRICE`, `UNVERIFIED`, and `STALE` are evidence only.
- `verification_audits` should receive rows when verification status changes.
- Edge Functions should stay JWT-protected unless a function is deliberately designed as public.
- Service-role keys and database passwords must not be committed.

## Basic Remote Checks

When CLI access is available, verify:

```sql
select count(*) from public.products;
select count(*) from public.product_listings;
select count(*) from public.price_records;
select count(*) from public.signals;
```

Trust check:

```sql
select count(*) as bad_triggered_signals
from public.signals s
left join public.price_records p on p.id = s.price_record_id
where s.triggered = true
  and coalesce(p.verification_status, '') <> 'VERIFIED_CHECKOUT';
```

Expected:

```text
bad_triggered_signals = 0
```

## Local Runtime Versus Supabase Runtime

For local self-use, SQLite is still the simplest runtime:

```env
DATABASE_URL=sqlite:///backend/camera_market.db
```

For cloud Postgres/Supabase runtime, use a Postgres URL:

```env
DATABASE_URL=postgresql://...
```

Before switching production traffic to Supabase, run backend tests and browser-smoke the product, opportunity, verification, strategy, and source pages.
