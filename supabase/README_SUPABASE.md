# Supabase V0.12

Production project:

- Project ref: `woywgfoqurumrkyoznnb`
- Region: `ap-southeast-2`
- Status verified by Codex: `ACTIVE_HEALTHY`
- Database: PostgreSQL 17

What is included:

- `migrations/20260629123000_v012_initial_schema.sql` creates the V0.12 schema, RLS read policies, storage buckets, verification audit trigger, and triggered-signal trust trigger.
- `seeds/local_v012_seed.sql` and `seeds/local_v012_seed.json` are generated from `backend/camera_market.db` by `scripts/export-sqlite-to-supabase-v012.py`.
- `functions/*` contains deployed Edge Functions for price verification, price invalidation, strategy evaluation, product refresh events, notifications, daily reports, and source health records.

Verified remotely:

- All 20 V0.12 public tables exist.
- Storage buckets exist: `price-evidence`, `product-images`, `report-exports`.
- Rollback transaction test created one temporary verification update and confirmed `verification_audits` receives a row.
- Rollback transaction test confirmed triggered signals require a `VERIFIED_CHECKOUT` price record.
- 7 Edge Functions are deployed with `verify_jwt=true`.
- The temporary `import-v012-seed` function was used once, then redeployed as JWT-protected and disabled.
- Supabase migration history contains only `v012_initial_schema`; the accidental `v012_verify_noop` history row was removed.

Data seed status:

- Local SQLite source was exported and imported successfully: 20 products, 23 product listings, 102 price records, 20 strategies, 23 signals, 7 flow runs, 4 daily reports, and 5 strategy backtests.
- Cloud verification confirmed `bad_triggered_signals = 0`.
- The SQL seed remains available for replay if credentials are available:

```powershell
psql "<SUPABASE_DATABASE_URL>" -f supabase/seeds/local_v012_seed.sql
```

Regenerate the seed:

```powershell
python scripts/export-sqlite-to-supabase-v012.py --summary
python scripts/export-sqlite-to-supabase-v012.py --out supabase/seeds/local_v012_seed.sql
python scripts/export-sqlite-to-supabase-v012.py --json-out supabase/seeds/local_v012_seed.json
```
