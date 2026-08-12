# V0.15 Complete Change Document

Date: 2026-07-11

## Purpose

This document explains what was changed in the current V0.15 upgrade, what was verified, what is still not finished, and what should happen next. It is written as a handoff document for future GPT or engineering continuation work.

## Executive Summary

The project was upgraded from a mixed local-first prototype into a production-oriented single-operator system with stricter trust rules, asynchronous backend processing, cloud deployment packaging, and clearer operating documentation.

The biggest change is not visual. The real upgrade is that the system now separates:

- public price clues
- operator-uploaded trusted checkout evidence
- strategy-triggerable verified prices
- cloud deployment readiness

In practical terms:

- visible marketplace prices are no longer treated as enough evidence for strategy execution
- historical records without trusted proof are downgraded for re-verification
- long-running operations are moved out of synchronous API requests into background jobs
- the runtime is prepared for Cloudflare plus Linux Docker plus Supabase/Postgres
- production now has explicit guardrails so localhost and SQLite cannot silently act like the real cloud system

## What Changed

## 1. Trust Model Was Rebuilt

The old project could store and use price data, but the production-grade trust boundary was not strict enough. V0.15 hardened this area heavily.

Implemented:

- added trusted evidence upload flow through `POST /api/evidence/upload`
- evidence is stored in private Supabase Storage instead of being treated as a loose client-side artifact
- backend records evidence metadata, uploader provenance, upload time, object path, and file type
- backend computes and stores SHA-256 hashes for uploaded evidence
- only `VERIFIED_CHECKOUT` prices with trusted uploaded evidence are allowed to trigger strategy signals
- historical `VERIFIED_CHECKOUT` records that lacked server-recorded evidence are downgraded and require re-verification
- signal trust rules are enforced in both application logic and PostgreSQL-side constraints/verification logic

Effect:

- the system now distinguishes between clue data and trusted decision data
- false confidence from imported or manually edited historical rows is reduced
- future strategy signals have a traceable evidence chain

Relevant files:

- `backend/app/auth.py`
- `backend/app/...` trust and verification services
- `supabase/migrations/20260711090000_v015_production_readiness.sql`
- `scripts/validate-v012-seed.py`
- `scripts/export-sqlite-to-supabase-v012.py`

## 2. Operator Write Security Was Hardened

The project now treats write access as protected infrastructure, not as an open local convenience.

Implemented:

- Cloudflare Access JWT validation for private operator access
- single-operator email restriction
- `OPERATOR_API_TOKEN` retained as an automation boundary for CI, schedulers, workers, and operations
- fail-closed behavior when required write credentials are missing
- production environment examples now require write-protection variables and secrets

Effect:

- mutation and control APIs are no longer assumed public
- the system can support a private operator console behind Cloudflare Access
- deployment cannot quietly run in an unprotected mode

Relevant files:

- `backend/app/auth.py`
- `backend/.env.example`
- `deploy/production/.env.example`
- `deploy/production/docker-compose.yml`
- `docs/V013_SECURITY_HARDENING.md`

## 3. Long Operations Were Moved to Asynchronous Jobs

One of the main usability and runtime problems before was that crawl/report/sync style operations could block requests and make the system feel slow.

Implemented:

- daily flow, crawls, reports, and integration-style tasks now use asynchronous job APIs
- API returns quickly with job identifiers instead of waiting for long tasks to finish
- PostgreSQL-backed job queue uses row locking and `FOR UPDATE SKIP LOCKED`
- separate worker and scheduler runtime roles were introduced
- idempotency and non-blocking claims were added to reduce duplicate processing

Effect:

- API response time is better protected
- background work can run independently from the API container
- deployment architecture is cleaner and closer to production standards

Relevant APIs:

- `POST /api/jobs/daily-flow`
- `POST /api/jobs/crawls`
- `POST /api/jobs/reports`
- `GET /api/jobs/{job_id}`

Relevant files:

- `backend/` job queue, worker, scheduler, and service code
- `deploy/production/docker-compose.yml`
- `docs/CONCURRENCY_HARDENING.md`

## 4. Backend Data Access Was Optimized

The system previously had areas where data loading could cause unnecessary query multiplication.

Implemented:

- batched bootstrap queries
- batched product overview logic
- server-side pagination and filtering for review workflows
- server-side source health history access
- notification inbox backed by real API data

Effect:

- fewer wasteful round trips
- less N+1 style behavior in high-traffic operator pages
- more scalable review and operations flow

Relevant APIs:

- `GET /api/reviews`
- `GET /api/source-health/history`
- `POST /api/notifications/read-all`
- `GET /api/system/ready`

## 5. Observability and Runtime Guardrails Were Added

The project now has stronger runtime self-checks and clearer production boundaries.

Implemented:

- lightweight liveness endpoint
- deeper readiness endpoint
- JSON request logging
- request ID propagation
- duration logging for requests
- cloud runtime guardrail checks
- explicit production prohibition against pretending localhost or SQLite is the final cloud runtime

Effect:

- easier debugging
- clearer production verification
- fewer chances of mislabeling a local demo as deployed production

Relevant files:

- `scripts/check-cloud-runtime.py`
- `scripts/verify-cloud.ps1`
- `scripts/e2e-cloud.py`
- `docs/CLOUD_RUNTIME_GUARDRAILS.md`
- `docs/CLOUD_MIGRATION_STATUS.md`

## 6. Cloud Deployment Path Was Fully Packaged

The repository now contains a real deployment shape instead of only local dev wiring.

Implemented:

- production Docker Compose stack
- internal Caddy reverse proxy config
- Cloudflare Tunnel based ingress model
- Cloudflare Worker public entry page remains separate from the private app runtime
- GHCR immutable image workflow
- migration tracking in deployment flow
- trust verification in deployment flow
- rollback-aware deployment documentation and process

Effect:

- the repo is deployable in a production-style architecture
- the public page and private operator app are clearly separated
- deployment is safer and more repeatable

Relevant files:

- `deploy/production/docker-compose.yml`
- `deploy/production/Caddyfile`
- `deploy/production/README.md`
- `.github/workflows/cloud-deploy.yml`
- `docs/CLOUD_CUTOVER_PLAN.md`
- `docs/PRODUCTION_RUNBOOK.md`

## 7. GitHub Actions and CI Were Modernized

The release work also included CI cleanup so the project is less likely to drift or break due to old action runtimes.

Implemented:

- updated GitHub Actions dependencies to current supported Node 24 runtime family
- kept CI passing on main after the update

Merged commits:

- `33df1ff` Implement V0.15 trust and async backend
- `4d276c8` Complete trusted operator workflows
- `4396b1d` Ship V0.15 cloud deployment and operations
- `7693768` Update GitHub Actions to Node 24 runtimes

Merged PRs:

- PR `#2` V0.15 production readiness and backend/cloud upgrade
- PR `#3` GitHub Actions runtime upgrade

## 8. Documentation and Open Source Governance Were Improved

Implemented:

- README rewritten to reflect V0.15 reality
- architecture doc added and aligned with cloud runtime
- production readiness doc added
- runbook and cutover docs added
- Apache-2.0 license included
- `SECURITY.md` added
- `CONTRIBUTING.md` added

Effect:

- future agents and developers have clearer instructions
- open-source repository hygiene is much better
- deployment and recovery expectations are explicit

## Verification Completed

The following was verified in the current V0.15 baseline:

- backend test suite passed
- frontend production build passed
- frontend dependency audit reported 0 vulnerabilities
- Cloudflare public worker tests passed
- cloud runtime guardrail checks passed
- GitHub Actions CI passed on `main`

Important boundary:

This means the codebase is production-ready in structure, but not yet confirmed as live production.

## What Is Not Finished Yet

These items are still external blockers or follow-up work, not codebase omissions in the narrow sense.

Cloud deployment blockers:

- GitHub repository secrets are not fully populated
- GitHub repository variables for deployment are not fully populated
- no confirmed cloud host or server SSH path has been supplied in this environment
- no verified production domain has been cut over
- no live Cloudflare Access application and Tunnel were verified end to end from this environment
- no real remote Supabase migration run was confirmed from this environment with full secrets

Operational blockers:

- no confirmed remote staging or production E2E run with real credentials
- no real traffic, SEO, GEO, or analytics results can be claimed yet
- official marketplace provider credentials are still missing for JD, Taobao, PDD, eBay, and Amazon

Product follow-up gaps:

- browser-level end-to-end tests for the full operator flow can still be expanded
- public SEO/GEO content is still limited because the current focus was backend trust and deployment readiness
- multi-user auth is still not the target; current model is single-operator plus automation token boundary
- some older docs still need cleanup for wording consistency and historical version references

## What Was Deliberately Not Done

The following was intentionally not pushed further yet:

- no fake claim that the app is live in cloud when secrets and remote verification are missing
- no unsafe weakening of trust rules just to keep old historical data triggering signals
- no forced dependency upgrades that could break the stable passing build without a functional reason
- no conversion of the system into auto-buying or auto-payment behavior
- no exposure of private operator actions directly to the public internet

## Current Runtime Truth

As of this document:

- the full stack is designed for Cloudflare plus Linux Docker plus Supabase/Postgres
- the public Worker is only the entry page layer
- the real application runtime is still the self-hosted Next.js plus FastAPI stack
- localhost can still be used for development and verification, but must not be confused with production
- production is not considered complete until remote deployment, remote smoke checks, trust checks, and one real evidence-to-signal flow succeed

## Recommended Next Steps

Priority 1:

- fill GitHub secrets and variables listed in `docs/V015_PRODUCTION_READINESS.md`
- provision the Linux host and Cloudflare Access plus Tunnel
- run the cloud deploy workflow on `main`
- verify `/api/system/health` and `/api/system/ready` remotely
- run `scripts/e2e-cloud.py` against the real staging or production-like URL with real credentials

Priority 2:

- import validated seed data into staging Supabase
- confirm downgraded historical verification records behave correctly
- enable provider integrations one by one only after each API credential is ready

Priority 3:

- extend browser E2E coverage
- add public SEO and GEO assets
- add real analytics and uptime monitoring
- refine operator onboarding and empty states

## Suggested Reading Order For Next Agent

1. `README.md`
2. `docs/V015_PRODUCTION_READINESS.md`
3. `docs/ARCHITECTURE.md`
4. `docs/CLOUD_CUTOVER_PLAN.md`
5. `docs/PRODUCTION_RUNBOOK.md`
6. `docs/WEBSITE_LAUNCH_TODO.md`
7. `docs/V014_MODULES.md`

## One-Sentence Conclusion

V0.15 is a substantial backend and production-readiness upgrade: the trust model is now much stricter, long-running operations are moved into proper background jobs, cloud deployment is packaged, CI is modernized, and documentation is far more complete, but the system still requires real cloud secrets, real remote deployment, and real external verification before it can honestly be called live.
