from __future__ import annotations

import time

from app.config import settings
from app.database import SessionLocal, init_db
from app.services.job_queue import daily_idempotency_key, enqueue_job


def run() -> None:
    init_db()
    interval_seconds = max(settings.scheduler_interval_minutes, 1) * 60
    while True:
        if not settings.scheduler_enabled:
            time.sleep(60)
            continue
        db = SessionLocal()
        try:
            enqueue_job(db, "DAILY_FLOW", {"force": False}, idempotency_key=daily_idempotency_key())
        finally:
            db.close()
        time.sleep(interval_seconds)


if __name__ == "__main__":
    run()
