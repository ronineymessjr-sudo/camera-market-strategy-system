# V0.12 Changelog

- Added V0.10 navigation and interaction layer: route progress, breadcrumbs, loading state, not-found page, and clickable card affordances.
- Added V0.11 product intelligence detail UI and connected it to existing API data.
- Added V0.12 Supabase production schema, RLS read policies, storage buckets, audit triggers, and verified-signal database protection.
- Added local SQLite to Supabase seed exporter and generated seed SQL from the current real local database.
- Added JSON seed export and imported the current real local dataset into Supabase production.
- Added and deployed 7 JWT-protected Supabase Edge Functions.
- Removed the accidental no-op Supabase migration history row.
- Upgraded frontend dependencies to clear npm audit.
- Verified frontend production build and backend test suite.
