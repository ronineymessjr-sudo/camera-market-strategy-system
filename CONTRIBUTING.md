# Contributing

Open an issue before making a large behavioral or schema change. Preserve the separation between market clues, manual checkout verification, and strategy signals.

## Development

1. Create a focused branch.
2. Keep secrets in ignored environment files.
3. Add tests for trust, authorization, migration, and failure behavior.
4. Run the backend tests, frontend production build, Worker tests, dependency audit, and cloud runtime guard.
5. Submit a pull request describing user impact, data migrations, rollout, and rollback.

Never make `VISIBLE_PRICE` or `UNVERIFIED` records strategy actionable. Do not weaken evidence, freshness, currency, Access JWT, or operator-token checks to make a test pass.
