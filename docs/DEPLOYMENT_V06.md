# V0.6 Deployment Notes

Date: 2026-06-29

## Current Verified State

- Backend API runs on `http://127.0.0.1:8000`.
- Frontend V0.6 production proxy build runs locally on `http://127.0.0.1:3003`.
- Temporary public test URL: `https://camera-market-test-r9.loca.lt`.
- Stable Cloudflare public entry: `https://camera-market-test-entry.photomagic.workers.dev`.
- Cloudflare Worker version: `c36faf33-140c-4d07-af6c-ed7f432bd53b`.
- Public URL verified:
  - `/`: `200`
  - `/api/system/health`: `200`
  - `/api/integrations/providers`: `200`
  - `/sources`: `200`
- Cloudflare entry deployed:
  - `/`: deployed successfully by `wrangler deploy`
  - `/health`: deployed successfully by `wrangler deploy`
  - Current workstation access to `workers.dev` timed out during `curl`, so visual QA used local `wrangler dev` with the same Worker source.
- Worker local render verification:
  - Local Worker `/`: `200`, TTFB about `0.028s`
  - Local Worker `/health`: `200`
  - Frontend local production `/`: `200`, TTFB about `0.161s`
  - Temporary localtunnel public URL returned `408` during the latest check.
- V0.9 motion-system verification:
  - Frontend production build passed.
  - Backend test suite passed: `19 passed`.
  - Local V0.9 frontend production `/`: `200`, about `0.226s` total after restart.
  - Cloudflare Worker deployed successfully as version `c36faf33-140c-4d07-af6c-ed7f432bd53b`.
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

The entry page was upgraded on 2026-06-29 to a monochrome particle-collision cover page with a lens-style visual core, animated Canvas background, status cards, GitHub link, data-source link, and a short latency explanation. The implementation is dependency-free and keeps the Worker bundle small:

```text
Total Worker upload: 23.68 KiB
Gzip size: 6.80 KiB
```

Design QA screenshots:

```text
docs/design-qa/cloudflare-worker-cover-v2.png
docs/design-qa/cloudflare-worker-cover-v2-mobile.png
docs/design-qa/v09-dashboard-desktop.png
docs/design-qa/v09-dashboard-mobile.png
```

### Latest Latency Diagnosis

The platform itself is not the main latency source in the latest local checks. Local production frontend and backend respond quickly. The slow or failed public experience is currently caused by temporary networking layers:

- `http://127.0.0.1:3003/`: about `0.161s` total in the latest local check.
- `http://127.0.0.1:8787/`: about `0.028s` total for the local Worker render.
- `https://camera-market-test-r9.loca.lt/`: returned `408` in the latest public tunnel check.
- `https://camera-market-test-entry.photomagic.workers.dev/`: deployed successfully, but this workstation's direct `curl` to `workers.dev` timed out during verification.

Recommended next fix: replace localtunnel with Cloudflare Named Tunnel or a persistent backend server, then bind a real Cloudflare Zone/domain. That removes the first-visit tunnel warning page, free relay instability, and most cross-network delay.

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
