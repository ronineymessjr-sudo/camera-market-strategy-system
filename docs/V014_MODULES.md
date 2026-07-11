# V0.14 Backend Modules

Date: 2026-07-02

V0.14 turns the V0.13 security baseline into a more useful trust system. The focus is backend capability, not frontend redesign.

## Added Modules

### Structured Evidence Chain

- Added `price_evidence`.
- Added `price_adjustments`.
- `POST /api/prices/{price_id}/verify-checkout` now requires at least one `CHECKOUT`, `CART`, or `ORDER` evidence item.
- Evidence and adjustments are stored when a price is verified.
- Added read APIs:
  - `GET /api/prices/{price_id}/evidence`
  - `GET /api/prices/{price_id}/adjustments`

### Notification Inbox

- Added `notifications`.
- Added `notification_deliveries` model for future webhook/email delivery tracking.
- Triggered strategy signals create an unread `SIGNAL_TRIGGERED` notification.
- Added APIs:
  - `GET /api/notifications`
  - `GET /api/notifications?unread_only=true`
  - `POST /api/notifications/{notification_id}/read`

### Real Source Health

- Added backend ORM support for `source_health_history`.
- Official API sync writes source-health success/failure records.
- Crawler batch runs write per-platform source-health records.
- Added `GET /api/source-health`.
- Bootstrap now includes:
  - `source_health`
  - latest unread `notifications`

## Supabase Migration

New migration:

```text
supabase/migrations/20260702090000_v014_trust_modules.sql
```

It adds:

- `price_evidence`
- `price_adjustments`
- indexes for evidence/adjustment lookup
- RLS read policies for authenticated users
- backfilled checkout evidence for existing `VERIFIED_CHECKOUT` rows
- unique current signal index per strategy
- stricter triggered-signal trigger checks for verified status, product match, strategy match, currency match, expiry, and checkout evidence

## Trust Rules After V0.14

- Clients still cannot create `VERIFIED_CHECKOUT` directly through `POST /api/prices`.
- `VERIFY_CHECKOUT` now requires structured checkout/cart/order evidence.
- Unknown currency cannot trigger a strategy.
- Triggered signals create notifications for operator follow-up.
- Source Health is based on recent runtime records, not only provider configuration status.

## Verification

Historical V0.14 verification before the V0.15 production-readiness work:

```text
backend tests: 37 passed
compileall: passed
cloud runtime check: passed
docker compose production config: passed
cloudflare worker tests: 7 passed
```

## Still Open

- Replace shared `OPERATOR_API_TOKEN` with owner/operator/viewer auth.
- Add remote Supabase migration execution and verification once credentials are available.
- Add Edge Function tests for the stricter evidence and signal rules.
- V0.15 now provides evidence upload, a real notification inbox, review pagination, and runtime source-health display.
- Add external delivery channels for notifications.
