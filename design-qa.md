# Product Design QA — Public Motion Polish

## Scope

- Target: public Camera Market Intelligence landing page
- State: Chinese desktop landing view and Chinese mobile landing view
- Reference: current deployed design, captured locally from `HEAD`
- Change: motion and interaction polish only; layout, palette, content, and core flows preserved

## Comparison evidence

- Reference: `.runlogs/product-design-motion-source-1280x844.png`
- Implementation: `.runlogs/product-design-motion-implementation-1280x844.png`
- Same-state comparison: `.runlogs/product-design-motion-comparison.png`
- Mobile implementation: `.runlogs/product-design-motion-mobile-390x844.png`

## Checks

- Desktop 1280 × 844: hero composition, type scale, spacing, CTA placement, lens geometry, and principle cards match the reference.
- Mobile 390 × 844: no horizontal overflow (`scrollWidth === clientWidth`); hero, CTA row, and lens remain intact.
- Motion: intro sequence loads, pointer parallax updates lens variables, and scroll reveal advances from 3 above-fold items to 9 items after scrolling.
- Accessibility: `prefers-reduced-motion` disables animations and restores all content immediately.
- Runtime: no browser console errors.

## Findings

- P0: none
- P1: none
- P2: none
- P3: none

## Prior V0.6 QA snapshot

- Date: 2026-06-29
- Visual targets: `docs/ui-reference/overview-dark.png` and `docs/ui-reference/overview-alt.png`
- Implementation evidence: `docs/design-qa/home-desktop-final.png` and `docs/design-qa/products-mobile.png`
- The merged UI preserved the deep navy product direction, dashboard hierarchy, truthful API state, motion layer, and reduced-motion behavior.
- The prior pass fixed capture timing for metric-card reveals and added a horizontal-scroll hint for mobile tables.
- Public hosting credentials and domain configuration were still pending at that checkpoint.

## Iteration history

1. Initial comparison showed the principle cards waiting for the first scroll event.
2. Updated the reveal trigger so near-viewport cards enter during initial load while below-fold sections remain scroll-driven.
3. Re-captured the same viewport and confirmed visual parity.

final result: passed
