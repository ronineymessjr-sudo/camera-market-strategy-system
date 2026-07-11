# Security Policy

## Supported Version

Security fixes target the latest code on `main`. Historical V0.6-V0.14 UI and handoff artifacts are retained for reference but are not independently supported runtimes.

## Reporting

Do not publish secrets, database URLs, screenshots containing credentials, or exploitable findings in a public issue. Report a vulnerability through GitHub private vulnerability reporting for this repository.

Include the affected route or component, reproduction steps, impact, and a minimal proof of concept. Do not access data that is not yours and do not perform denial-of-service testing.

## Production Boundary

- The operator app must be protected by Cloudflare Access.
- Mutation APIs must validate Access JWTs or the automation token.
- Supabase service-role credentials must never reach browser code.
- Only trusted uploaded checkout evidence can trigger strategies.
- Production must use Supabase/Postgres, not SQLite or a temporary tunnel.
