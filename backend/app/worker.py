from __future__ import annotations

import os
import socket
import time

from app.config import settings
from app.database import SessionLocal, init_db
from app.services.job_queue import claim_next_job, execute_job
from app.services.notification_service import deliver_next_webhook


def run() -> None:
    init_db()
    worker_id = os.getenv("WORKER_ID") or f"{socket.gethostname()}:{os.getpid()}"
    while True:
        db = SessionLocal()
        try:
            delivered = deliver_next_webhook(db)
            job = claim_next_job(db, worker_id)
            if job:
                execute_job(db, job)
        finally:
            db.close()
        if not job and not delivered:
            time.sleep(settings.job_poll_interval_seconds)


if __name__ == "__main__":
    run()
