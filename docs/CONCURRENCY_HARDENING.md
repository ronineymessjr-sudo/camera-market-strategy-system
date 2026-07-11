# V0.12 Concurrency hardening

## Threat model

The system can receive overlapping requests from the UI, cron, retries, multiple browser tabs, multiple API workers, and Supabase Edge Functions. The main risks are duplicate collection runs, duplicate signals, duplicate notifications, stale overwrites, and exhausting external platforms with uncontrolled concurrency.

## Required controls

1. **Single process:** use `KeyedLockPool` for operations such as `daily-run`, `collect:{product_id}`, and `verify:{listing_id}`.
2. **Request coalescing:** use `SingleFlight` for identical read-through refreshes so 20 callers produce one upstream request.
3. **Multiple workers:** process-local locks are not sufficient. Use PostgreSQL advisory locks or a database job row claimed with `FOR UPDATE SKIP LOCKED`.
4. **Idempotency:** every externally retried write should carry a stable key and have a unique constraint.
5. **Bounded concurrency:** use a semaphore around platform/network calls; never launch one task per record without a limit.
6. **Optimistic concurrency:** updates to strategies and verification records should include an expected version or `updated_at` predicate.
7. **Outbox delivery:** write notifications to an outbox in the same transaction as the signal; deliver asynchronously and mark attempts.

## Recommended database constraints

Adapt names to the real schema before applying:

```sql
create unique index if not exists uq_signal_idempotency
  on signals (idempotency_key)
  where idempotency_key is not null;

create unique index if not exists uq_price_record_source_observation
  on price_records (listing_id, observed_at, evidence_level);

create unique index if not exists uq_notification_delivery
  on notification_deliveries (signal_id, channel, recipient);
```

## PostgreSQL advisory lock example

```python
from sqlalchemy import text

lock_id = 81712012
with session.begin():
    acquired = session.execute(
        text("select pg_try_advisory_xact_lock(:id)"), {"id": lock_id}
    ).scalar_one()
    if not acquired:
        raise BusyError("daily run already active")
    # execute the full run in this transaction or claim a durable job row
```

## Bounded async fan-out

```python
sem = asyncio.Semaphore(6)

async def limited(item):
    async with sem:
        return await fetch_one(item)

results = await asyncio.gather(*(limited(item) for item in items))
```

Use per-platform limits because Taobao, JD, Pinduoduo, and third-party APIs may require different rates.

## Integration points

- Daily run endpoint: lock key `daily-run` and return HTTP 409 when already active.
- Listing collection: single-flight key `collect:{listing_id}`.
- Verification submission: idempotency key from listing, price, evidence level, and evidence timestamp.
- Signal creation: database unique key from strategy, price record, and rule version.
- Notification sender: outbox claim using `FOR UPDATE SKIP LOCKED`, attempt count, next retry time, and dead-letter state.
