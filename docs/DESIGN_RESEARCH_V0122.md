# V0.12.2 Product Design Research Notes

Date: 2026-07-01

## Scope

Reviewed the current V0.12 command-center homepage across desktop and mobile using local screenshots:

- Desktop: `.runlogs/design-audit-20260701/desktop-home.png`
- Mobile: `.runlogs/design-audit-20260701/mobile-home.png`

The review focused on self-use speed: can the owner quickly see trusted evidence, decide what to verify, and navigate to the next action?

## Findings

1. The restored hero has strong brand presence on desktop, but the mobile flow spent too much vertical space before the working desk.
2. The duplicated metrics after the hero created a 400px+ perceived blank zone on mobile.
3. Mobile had no persistent primary navigation after the sidebar disappeared.
4. Evidence ladder labels such as `VERIFIED_CHECKOUT` were too long for narrow cards and looked broken.
5. Some detail separators rendered poorly in screenshots, so ASCII separators are safer for mixed Chinese/English data.

## Implemented

1. Added a mobile bottom navigation for the four highest-frequency self-use routes: Command, Deals, Verify, Sources.
2. Compressed mobile metric cards into a three-column status rail.
3. Reduced mobile hero height and visual spacing while preserving the black/silver lens visual.
4. Shortened evidence ladder labels to plain-language steps: Visible price, Checkout review, Verified checkout, Strategy signal.
5. Improved small-card readability with stronger text sizing and clearer secondary text.
6. Replaced fragile separators in experience modules with `/`.

## Measured Impact

Before:

- `.opening-hero` mobile height: `922px`
- `.metrics` mobile height: `409px`
- `.command-center` start: `y=1438`

After:

- `.opening-hero` mobile height: `723px`
- `.metrics` mobile height: `95px`
- `.command-center` start: `y=903`

The mobile user reaches the actionable command center roughly `535px` earlier.

## Next Design Opportunities

1. Add a true command palette behind `Ctrl K` for product search and quick actions.
2. Make the hero lens react to real data state: verified, review pressure, source health.
3. Add an opportunity severity scale so “WATCH” rows do not all look equal.
4. Add a compact “today checklist” that tracks run flow, verify flow, report flow.
5. Create a dedicated mobile verification mode optimized for one-handed review.
