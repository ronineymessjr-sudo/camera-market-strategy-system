# Website Launch TODO

Date: 2026-07-02

This is the working checklist for turning the Camera Market Strategy System from a local/self-use prototype into a real cloud website.

## Current Baseline

- Backend APIs exist for products, listings, price records, checkout verification, strategies, signals, daily reports, analytics, selection, quant indicators, watchlist commands, marketplace integrations, source health, and frontend bootstrap.
- Tests exist for trust rules, price extraction, strategy signals, reports, quant, provider normalization, API signing, cache invalidation, crawl locking, and database runtime behavior.
- Production config now rejects localhost/SQLite defaults and expects Supabase/Postgres.
- Cloudflare Worker exists as the public entry layer, but the full runtime still needs a real app URL.
- Supabase schema, seed, and Edge Function package exist, but this environment still needs real Supabase credentials to verify/import/deploy remotely.
- GitHub Actions has CI and a gated cloud deploy workflow, but repository secrets and variables are not filled yet.

## P0: Must Finish Before Public Use

- [x] Choose the final production runtime for the full app.
  - Recommended simplest path: persistent Linux VM + Docker Compose + Caddy + Cloudflare DNS.
  - Alternative path: Cloudflare Containers, but this requires more architecture work.
- [ ] Create or confirm a production domain.
- [ ] Point the domain DNS to Cloudflare.
- [ ] Create a production app URL, for example `https://camera-market.example.com`.
- [ ] Fill GitHub repository secrets:
  - [ ] `CLOUDFLARE_API_TOKEN`
  - [ ] `SUPABASE_DATABASE_URL`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `OPERATOR_API_TOKEN`
  - [ ] `CLOUD_HOST`
  - [ ] `CLOUD_SSH_USER`
  - [ ] `CLOUD_SSH_KEY`
- [ ] Fill GitHub repository variables:
  - [ ] `CLOUDFLARE_DEPLOY_ENABLED=true`
  - [ ] `CLOUD_APP_DEPLOY_ENABLED=true`
  - [ ] `APP_URL=https://<production-app-url>`
  - [ ] `PUBLIC_BASE_URL=https://<production-app-url>`
  - [ ] `SITE_HOST=<production-host>`
  - [ ] `FRONTEND_ORIGINS=https://<production-app-url>`
  - [ ] `CLOUD_APP_PATH=/opt/camera-market-strategy-system`
  - [ ] `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- [ ] Import or verify the Supabase production seed.
- [ ] Run the Supabase trust check:

```sql
select count(*) as bad_triggered_signals
from public.signals s
left join public.price_records p on p.id = s.price_record_id
where s.triggered = true
  and coalesce(p.verification_status, '') <> 'VERIFIED_CHECKOUT';
```

- [ ] Expected result: `bad_triggered_signals = 0`.
- [ ] Deploy the cloud app through GitHub Actions or `scripts/deploy-cloud.ps1`.
- [ ] Deploy the Cloudflare Worker with `APP_URL` pointing to the real app URL.
- [ ] Run cloud verification with `scripts/verify-cloud.ps1 -BaseUrl https://<production-app-url>`.
- [ ] Confirm these endpoints work on HTTPS:
  - [ ] `/api/system/health`
  - [ ] `/api/prices/stats`
  - [ ] `/api/frontend/bootstrap`
  - [ ] `/api/products/overview`
  - [ ] `/api/prices/review-queue`
- [x] Add a license file before treating the GitHub repository as a real open-source project.

## P0: Security And Access

- [x] Add a first-pass write-protection layer before public release.
  - Current implementation: `OPERATOR_API_TOKEN` protects mutation/control APIs.
- [ ] Replace the shared operator token with a real authentication layer before broader public release.
  - Current suitable MVP: single-operator login with Supabase Auth, Cloudflare Access, or a reverse-proxy basic-auth gate.
  - Do not leave mutation APIs open on the public internet.
- [x] Protect write endpoints:
  - [x] product create/update/delete
  - [x] listing create/update/delete
  - [x] price verify/invalidate
  - [x] crawl-all
  - [x] report generation
  - [x] integration sync
  - [x] watchlist command parsing
- [x] Add rate limiting for crawler, integration sync, report generation, and job endpoints.
- [ ] Confirm service-role keys and database passwords never appear in frontend bundles, logs, screenshots, Git history, or public docs.
- [x] Use a public Worker entry page and a Cloudflare Access protected private operator app.

## P1: Real Data And Automation

- [ ] Configure production crawler scheduling.
  - The dedicated scheduler container is implemented and production defaults to enabled, but it is not live until cloud deployment succeeds.
- [ ] Decide a crawl interval per source to avoid bans and bad data.
- [x] Store trusted checkout evidence in private Supabase Storage with server-side hashes.
  - Candidate: Supabase Storage `price-evidence`.
- [ ] Add a production evidence retention policy.
- [ ] Add retry/backoff and source-level disable rules for failing sources.
- [x] Add source quality scoring:
  - [x] last success time
  - [x] failure rate
  - [x] parse confidence
  - [x] stale source detection
- [x] Add in-app notification inbox for triggered signals.
- [x] Add generic signed webhook notification delivery with retry tracking.
  - [ ] email
  - [x] generic Telegram/Discord/WeCom-compatible webhook
  - [ ] daily summary
  - [x] urgent verified-checkout trigger alert through the generic webhook
- [ ] Add manual verification workflow audit export.
- [ ] Make daily reports run automatically in cloud, not only by manual API call.

## P1: Marketplace API Applications

- [ ] JD/JOS:
  - [ ] `JD_APP_KEY`
  - [ ] `JD_APP_SECRET`
  - [ ] `JD_UNION_ID`
  - [ ] confirm allowed goods-search API method
- [ ] Taobao/Alibaba:
  - [ ] `TAOBAO_APP_KEY`
  - [ ] `TAOBAO_APP_SECRET`
  - [ ] `TAOBAO_ADZONE_ID`
  - [ ] confirm Taobao/TBK permissions
- [ ] Pinduoduo:
  - [ ] `PDD_CLIENT_ID`
  - [ ] `PDD_CLIENT_SECRET`
  - [ ] `PDD_PID`
- [ ] eBay:
  - [ ] `EBAY_CLIENT_ID`
  - [ ] `EBAY_CLIENT_SECRET`
  - [ ] marketplace ID
- [ ] Amazon:
  - [ ] approved Amazon Associates account and 10 qualifying sales in the last 30 days
  - [ ] `AMAZON_CREDENTIAL_ID`
  - [ ] `AMAZON_CREDENTIAL_SECRET`
  - [ ] `AMAZON_CREDENTIAL_VERSION`
  - [ ] `AMAZON_PARTNER_TAG`
  - [ ] Creators API `SearchItems` access
- [ ] After each provider is configured, run:
  - [ ] `GET /api/integrations/providers`
  - [ ] `POST /api/integrations/{provider}/sync`
  - [ ] `GET /api/integrations/runs`
  - [ ] verify all ingested records remain `VISIBLE_PRICE`, not `VERIFIED_CHECKOUT`.

## P1: SEO, GEO, And Analytics

- [ ] Add production metadata:
  - [ ] title
  - [ ] description
  - [ ] canonical URL
  - [ ] Open Graph image
  - [ ] Twitter/X card metadata
- [ ] Add `robots.txt`.
- [ ] Add `sitemap.xml`.
- [ ] Decide which pages should be indexable.
  - Public marketing/landing pages can be indexed.
  - Operator pages and private price data should usually be noindex or auth-gated.
- [ ] Connect Google Search Console.
- [ ] Connect Bing Webmaster Tools.
- [ ] Connect Cloudflare Web Analytics or GA4.
- [ ] Add structured data where public content exists:
  - [ ] `WebSite`
  - [ ] `SoftwareApplication`
  - [ ] `BreadcrumbList`
  - [ ] optional public product/market article schema if such pages become public
- [ ] Add GEO/AI-search friendly content:
  - [ ] a clear product explanation page
  - [ ] FAQ page
  - [ ] methodology page explaining `VERIFIED_CHECKOUT`
  - [ ] changelog page
  - [ ] public docs page with API/trust model summary
- [ ] Add analytics events:
  - [ ] landing page CTA click
  - [ ] product detail opened
  - [ ] review item verified
  - [ ] strategy trigger viewed
  - [ ] report downloaded

## P1: Production Observability

- [x] Add structured JSON request logs in production.
- [x] Add request ID propagation.
- [ ] Add error tracking.
  - Candidate: Sentry or another hosted error tracker.
- [ ] Add uptime monitoring.
  - Minimum endpoints: `/api/system/health`, homepage, `/api/frontend/bootstrap`.
- [x] Add endpoint duration to structured request logs.
- [ ] Add crawler run metrics:
  - [x] duration
  - [x] listings attempted
  - [x] successful parses
  - [x] failed parses
  - [x] records ingested
- [ ] Add database backup confirmation for Supabase.
- [ ] Add restore drill documentation.

## P1: Website Product Completeness

- [ ] Add onboarding for the first operator:
  - [ ] create first product
  - [ ] add source URL
  - [ ] set target/strong-buy price
  - [ ] run crawl
  - [ ] verify checkout price
  - [ ] read signal/report
- [ ] Add empty states for a fresh production database.
- [ ] Add safe demo data mode that is visually marked as demo.
- [ ] Add import flow for product watchlists.
- [ ] Add export flow for reports and verified evidence.
- [ ] Add account/settings page for provider status and keys checklist.
- [ ] Add clear disclaimers:
  - [ ] the system does not buy automatically
  - [ ] unverified prices are only clues
  - [ ] final action requires human review

## P2: Quality, Docs, And Open Source Polish

- [ ] Fix garbled Chinese docs:
  - [ ] `docs/API_INTEGRATIONS.md`
  - [ ] `docs/FRONTEND_API_CONTRACT.md`
- [ ] Refresh README after the first successful cloud deployment.
- [x] Add `LICENSE`.
- [x] Add `CONTRIBUTING.md`.
- [x] Add `SECURITY.md`.
- [x] Link clearly to production and backend environment examples from README and V0.15 docs.
- [x] Add architecture diagram.
- [ ] Add API examples with curl.
- [x] Add a production runbook:
  - [x] deploy
  - [x] rollback
  - [x] rotate secrets
  - [x] restore database
  - [x] disable crawler
- [ ] Add dependency security triage for the remaining `npm audit` findings.
- [x] Add Access-aware smoke tests that can run against a remote production URL.
- [ ] Add Playwright or browser-level tests for the full operator flow.

## Current Feature Gaps By Area

| Area | Current state | Gap before real website |
| --- | --- | --- |
| Backend API | Broad FastAPI surface exists | Needs auth, rate limits, production smoke tests |
| Database | Supabase schema/seed package exists | Needs live credential verification and backup/restore drill |
| Cloud runtime | Docker/Caddy/Worker path exists | Needs real domain, server/container runtime, GitHub secrets |
| Data collection | Crawlers and provider adapters exist | Needs production scheduler, durable evidence storage, source health automation |
| Trust model | `VERIFIED_CHECKOUT` rule exists and is tested | Needs operator UX discipline and remote trust checks after seed/import |
| Marketplace APIs | Adapter/config structure exists | Needs real platform credentials and per-provider live tests |
| SEO/GEO | Not production-ready yet | Needs sitemap, robots, metadata, public content strategy, analytics |
| Monitoring | Basic health endpoint exists | Needs uptime/error/performance monitoring |
| Documentation | Many handoff docs exist | Some Chinese docs are garbled; launch runbook needs final deployed URLs |
| Open source | GitHub repo is public | Needs license/security/contributing docs and secret hygiene review |

## Suggested Execution Order

1. Finish cloud credentials and domain.
2. Deploy full stack to cloud.
3. Verify Supabase data and trust rule remotely.
4. Add auth/rate limits before opening mutation APIs.
5. Turn on production scheduler and durable evidence storage.
6. Connect SEO/GEO/analytics tools.
7. Fix public docs and add open-source governance files.
8. Add remote smoke tests and browser flow tests.

## Definition Of Done For First Real Website Version

- [ ] Public domain loads over HTTPS.
- [ ] Full Next.js + FastAPI runtime is cloud-hosted, not localhost or tunnel-hosted.
- [ ] Supabase/Postgres is the only production database.
- [ ] Protected mutation endpoints require authentication.
- [ ] Health, bootstrap, products, review queue, reports, and strategy APIs pass remote smoke tests.
- [ ] A real product can be added, crawled, manually verified, evaluated by strategy, and included in a report.
- [ ] Search/analytics tooling is connected.
- [ ] README, launch TODO, deployment docs, and API docs reflect the real production URL.
