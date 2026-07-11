# Production Runbook

## Deploy

1. Confirm the Supabase backup is current.
2. Set `DATABASE_BACKUP_CONFIRMED=true` in GitHub repository variables.
3. Run the `Cloud Deploy` workflow on `main`.
4. Confirm image build, migration, trust verification, deployment, and Access-aware HTTPS smoke tests pass.
5. Complete one real evidence-to-notification flow before announcing the release.

## Rollback

The workflow stores the previous `.env.cloud` image references. A failed remote smoke test runs the rollback job and restores those images. V0.15 migrations are additive so the previous application remains schema-compatible.

For manual application rollback:

```bash
cd /opt/camera-market-strategy-system
cp .env.cloud.previous .env.cloud
docker compose -f deploy/production/docker-compose.yml --env-file .env.cloud up -d --no-build --remove-orphans
```

Do not manually reverse a database migration until a backup and a tested rollback SQL file exist.

## Rotate Secrets

1. Create the replacement secret in Cloudflare, Supabase, or the marketplace provider.
2. Update the matching GitHub repository secret.
3. Redeploy and verify the new credential.
4. Revoke the old credential only after verification succeeds.
5. For `OPERATOR_API_TOKEN`, update GitHub first, redeploy all backend-derived containers, then revoke the old value.

Never put a service-role key, database password, Access service-token secret, or Tunnel token in repository variables or committed environment files.

## Pause Automation

Set `SCHEDULER_ENABLED=false` in the cloud environment and redeploy. Existing queued jobs remain visible; stop the `worker` service if jobs must not continue:

```bash
docker compose -f deploy/production/docker-compose.yml --env-file .env.cloud stop worker scheduler
```

## Restore Database

Use the Supabase dashboard restore/PITR process appropriate to the project plan. Restore into staging first, run `python -m app.migrate /migrations --verify`, compare entity counts and trust queries, then schedule the production restore. Keep the application worker and scheduler stopped throughout the restore.

## Required Incident Checks

- `/api/system/health` responds quickly.
- `/api/system/ready` reports no missing tables.
- `background_jobs` has no long-running orphaned jobs.
- `source_health_history` identifies the failing provider.
- No triggered signal lacks trusted evidence or uses an expired price.
- Cloudflare Access and Tunnel audit logs show expected identities and routes.
