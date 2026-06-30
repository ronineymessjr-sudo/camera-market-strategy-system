# Product refresh cache

## Purpose

This system is a low-frequency opportunity monitor, not a high-frequency trading engine.
A product should be refreshed on a controlled schedule rather than every time a user opens a page.

## Recommended behavior

1. Each product has a refresh interval, for example 5 minutes.
2. All users requesting the same product during that window receive the same cached snapshot.
3. When the countdown reaches zero:
   - the first request starts one refresh;
   - concurrent requests reuse that same refresh;
   - optionally, the last known value is served while refresh runs.
4. Different products can refresh concurrently, subject to a platform concurrency limit.
5. Add 5-10% random jitter so all products do not refresh at the exact same second.

## Suggested API response

```json
{
  "data": {
    "product_id": 1,
    "price": 4499
  },
  "cache": {
    "source": "cache",
    "stale": false,
    "refreshed_at": 1710000000,
    "next_refresh_at": 1710000300,
    "refresh_in_seconds": 287
  }
}
```

The frontend can show:

- “Last checked 13 seconds ago”
- “Refresh available in 4:47”
- “Refreshing…” when a shared refresh is active

## Interval policy

Suggested starting values:

| Product state | Interval |
|---|---:|
| Normal watchlist | 10-15 minutes |
| Near target price | 3-5 minutes |
| Active promotion | 1-3 minutes |
| No changes for 7 days | 30-60 minutes |
| Platform rate-limited | Back off to 30+ minutes |

Do not use a fixed interval for every product. The scheduler should adapt to urgency and recent change rate.

## Multi-process production note

The included cache is process-local. For multiple Uvicorn workers or containers, store cache metadata and distributed locks in Redis or PostgreSQL.

Recommended shared keys:

- `product:{id}:snapshot`
- `product:{id}:next_refresh_at`
- `product:{id}:refresh_lock`

Use a short distributed lock lease, for example 30-60 seconds, to avoid a dead lock after worker failure.
