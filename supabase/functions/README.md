# Edge Function Status

The V0.12 Edge Functions are retained as historical implementation references and are not part of the V0.15 production deployment.

Do not deploy `verify-price`, `invalidate-price`, `evaluate-strategy`, `refresh-product`, `send-notification`, `generate-daily-report`, or `record-source-health` as independent mutation paths. Their original request-body contracts predate the V0.15 Cloudflare Access identity, server-recorded evidence upload, trusted-evidence flag, asynchronous job queue, and strict PostgreSQL trigger.

FastAPI is the sole production mutation and strategy engine. A future Edge Function may be reintroduced only as a thin authenticated proxy to FastAPI with contract tests proving parity; it must not write strategy, verification, notification, or source-health facts directly.
