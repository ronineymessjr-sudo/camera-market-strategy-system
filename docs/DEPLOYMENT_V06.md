# V0.6 Deployment Notes

Date: 2026-06-29

## Current Verified State

- Backend API runs on `http://127.0.0.1:8000`.
- Frontend V0.6 production proxy build runs locally on `http://127.0.0.1:3003`.
- Temporary public test URL: `https://camera-market-test-r9.loca.lt`.
- Stable Cloudflare public entry: `https://camera-market-test-entry.photomagic.workers.dev`.
- Cloudflare Worker version: `48e1d426-c8d0-46d8-8729-1581ed9b59e0`.
- Public URL verified:
  - `/`: `200`
  - `/api/system/health`: `200`
  - `/api/integrations/providers`: `200`
  - `/sources`: `200`
- Cloudflare entry verified:
  - `/`: `200`
  - `/health`: `200`
- Frontend production build passed with `npm run build`.
- Backend test suite passed: `19 passed`.
- Real local flow passed: crawl success `22`, failure `1`, skipped `0`.
- Current audit after real flow:
  - products: `20`
  - platform_listings: `23`
  - price_records: `79`
  - strategies: `20`
  - signals: `23`
  - daily_reports: `4`
  - flow_runs: `6`
  - screenshots: `60`
  - charts: `4`

## Local Production Run

```powershell
cd D:\AI项目\价格追踪系统\backend
.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

```powershell
cd D:\AI项目\价格追踪系统\frontend
$env:PORT="3003"
$env:INTERNAL_API_BASE_URL="http://127.0.0.1:8000"
$env:NEXT_PUBLIC_SITE_URL="http://127.0.0.1:3003"
npm run build
npm run start
```

## Temporary Public Tunnel

This workspace currently exposes the local production build through localtunnel:

```text
https://camera-market-test-r9.loca.lt
```

The tunnel process is tracked by `logs/localtunnel.pid`. This URL remains available only while this machine and the tunnel process are running.

Localtunnel may show a first-visit safety page. If prompted, enter the IP displayed on that page. For API/programmatic checks, add a `bypass-tunnel-reminder` request header.

## Cloudflare Public Entry

A small Worker landing page has been deployed as a stable test entry:

```text
https://camera-market-test-entry.photomagic.workers.dev
```

Worker source:

```text
deploy/cloudflare-public/worker.js
deploy/cloudflare-public/wrangler.jsonc
```

This Worker is not the full application runtime. It links to the temporary full-system tunnel and exposes `/health`. The full system still needs a persistent backend host or a Cloudflare Zone + Named Tunnel for production-grade public access.

## Public Deployment Blockers

- Cloudflare account is available through `wrangler`, but the account currently has no active Zone/domain attached.
- Cloudflare quick tunnel (`trycloudflare.com`) timed out twice from this machine.
- No production domain or server SSH target is configured.
- Official marketplace API credentials are still missing:
  - `JD_APP_KEY`, `JD_APP_SECRET`, `JD_UNION_ID`
  - `TAOBAO_APP_KEY`, `TAOBAO_APP_SECRET`, `TAOBAO_ADZONE_ID`
  - `PDD_CLIENT_ID`, `PDD_CLIENT_SECRET`, `PDD_PID`
  - `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET`
  - `AMAZON_ACCESS_KEY`, `AMAZON_SECRET_KEY`, `AMAZON_PARTNER_TAG`

## Recommended Public Deployment Shape

- Deploy backend as a persistent Python service with SQLite volume or migrate to Postgres before multi-user use.
- Deploy frontend as a Next.js Node service, not static export, because pages fetch live backend data dynamically.
- Set frontend environment:
  - `INTERNAL_API_BASE_URL=https://your-api-domain.example`
  - Leave `NEXT_PUBLIC_API_BASE_URL` empty when using same-origin `/api` proxy.
- Set backend CORS to include the frontend domain.
- Mount or persist `backend/app/static` so screenshots and charts survive restarts.

## SEO / GEO / LLM Discovery

- Existing routes include `robots.ts`, `sitemap.ts`, and `llms.txt`.
- For public SEO, update canonical site URL in frontend metadata once the production domain is known.
- Keep private price data behind authentication before public indexing. Current self-use build does not implement login by design.
