# V0.12 Rollback Notes

This rollout is additive. It does not delete existing local SQLite data or legacy frontend pages.

If the Supabase seed import fails:

1. Stop and read the first database error.
2. Do not rerun blindly if the error is a trust-rule error around triggered signals.
3. Fix the source row or seed export, then regenerate `supabase/seeds/local_v012_seed.sql`.
4. Re-run the seed. Inserts use `on conflict (id) do update`, so successful rows are safe to replay.

If the V0.12 schema must be rolled back in a fresh project, drop only V0.12 objects after exporting any data you need:

```sql
drop table if exists public.notification_deliveries cascade;
drop table if exists public.notifications cascade;
drop table if exists public.source_health_history cascade;
drop table if exists public.product_events cascade;
drop table if exists public.verification_audits cascade;
drop table if exists public.opportunities cascade;
drop table if exists public.strategy_evaluations cascade;
drop table if exists public.strategy_backtests cascade;
drop table if exists public.integration_runs cascade;
drop table if exists public.external_offers cascade;
drop table if exists public.watchlist_command_logs cascade;
drop table if exists public.crawl_runs cascade;
drop table if exists public.flow_runs cascade;
drop table if exists public.daily_reports cascade;
drop table if exists public.signals cascade;
drop table if exists public.strategies cascade;
drop table if exists public.price_records cascade;
drop table if exists public.product_listings cascade;
drop table if exists public.products cascade;
drop table if exists public.profiles cascade;
```

Do not run rollback SQL against production unless you have a current backup and have confirmed that no real user data should be retained.
