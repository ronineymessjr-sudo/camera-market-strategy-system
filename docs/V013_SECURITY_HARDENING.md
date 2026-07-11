# V0.13 Security Hardening Notes

Date: 2026-07-02

Source review: `Camera_Market_Strategy_System_V012_Review.docx`

## Completed In This Pass

- Added `OPERATOR_API_TOKEN` protection for backend mutation and control APIs.
- Protected product, listing, price, strategy, report generation, integration sync, quant backtest, crawler, scheduler, and watchlist command write routes.
- Kept public GET routes readable.
- Changed `POST /api/prices` so clients cannot directly create `VERIFIED_CHECKOUT` records.
- Kept checkout verification on the dedicated `POST /api/prices/{price_id}/verify-checkout` route.
- Changed strategy signal currency logic so missing/unknown currency cannot match a strategy currency.
- Added `CURRENCY_UNKNOWN` as a non-triggering signal state.
- Made production Docker Compose require `OPERATOR_API_TOKEN`.
- Added GitHub Actions cloud deploy wiring for `OPERATOR_API_TOKEN`.
- Extended `scripts/check-cloud-runtime.py` to guard production operator-token requirements.
- Added tests for anonymous write rejection, direct verified-price bypass rejection, and unknown-currency non-triggering behavior.

## Operator API Usage

Mutation/control requests must include one of:

```http
Authorization: Bearer <OPERATOR_API_TOKEN>
```

or:

```http
X-Operator-Token: <OPERATOR_API_TOKEN>
```

If `OPERATOR_API_TOKEN` is missing, mutation/control APIs return `503` so production cannot silently run without write protection.

## Still Open From The Review

- Replace the shared operator token with real owner/operator auth.
  - Candidate paths: Supabase Auth JWT roles, Cloudflare Access, or server-side sessions.
- Harden Supabase Edge Functions:
  - `verify-price` must derive reviewer identity from JWT.
  - `verify-price` should require structured evidence and bounded validity.
  - `evaluate-strategy` should read database facts instead of trusting request bodies.
- Expand Supabase database trigger checks:
  - product/strategy/price product link
  - strict currency
  - price freshness
  - evidence reference
- Add PostgreSQL/Supabase CI:
  - migration tests
  - RLS tests
  - trigger tests
  - Edge Function tests
- Add structured evidence tables:
  - `price_evidence`
  - `price_adjustments`
- Add distributed locking for multi-worker production crawls.

## Verification

Latest local verification:

```text
backend tests: 35 passed
compileall: passed
cloud runtime check: passed
docker compose production config: passed
cloudflare worker tests: 7 passed
```
