# Changelog V0.9 Motion System

Date: 2026-06-29
Branch: `feat/v0.9-motion-system`

## Summary

Merged the V0.9 motion-system overlay into the current app without removing existing pages, APIs, database code, or backend logic.

## Frontend

- Added Motion for React route/page reveal primitives in `frontend/components/motion-system.tsx`.
- Added a low-power Three.js ambient particle field in `frontend/components/ambient-field.tsx`.
- Added `AnimatedNumber` for dashboard metric transitions.
- Upgraded the root dashboard to the V0.9 "today only three things" interface.
- Preserved the previous root dashboard at `/legacy-v06`.
- Enhanced the existing shared dashboard components instead of replacing them, so older pages can still use `MetricCard`, `SectionCard`, `Sparkline`, `PriceChart`, and `StatusPill`.
- Added `TrustBadge` to make verified/visible/unverified evidence states clearer.
- Added V0.9 monochrome motion-system CSS as an overlay on top of the existing styles.

## Dependencies

- Added `motion`.
- Added `three`.
- Added `@types/three`.
- Updated frontend package metadata to `0.9.0`.

## Cloudflare Worker

- Deployed the V0.9 public entry Worker.
- Current deployed Worker version: `c36faf33-140c-4d07-af6c-ed7f432bd53b`.

## Verification

- Frontend production build: passed.
- Backend tests: `19 passed`.
- Local backend health: `200`.
- Local V0.9 frontend production page: `200`, about `0.226s` total after restart.
- Cloudflare Worker deploy: passed.

## Screenshots

- Desktop: `docs/design-qa/v09-dashboard-desktop.png`
- Mobile: `docs/design-qa/v09-dashboard-mobile.png`

## Notes

- The root dashboard now has a larger first-load JS bundle because Three.js is used for the ambient field. The effect respects `prefers-reduced-motion`, and mobile uses fewer particles.
- `npm audit` currently reports 2 dependency issues. I did not run `npm audit fix --force` because it may introduce breaking upgrades.
