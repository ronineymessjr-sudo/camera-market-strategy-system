from __future__ import annotations

import asyncio
from threading import Lock

try:
    from apscheduler.schedulers.background import BackgroundScheduler
except ModuleNotFoundError:  # Keeps tests/imports usable before optional deps are installed.
    BackgroundScheduler = None  # type: ignore[assignment]

from app.config import settings
from app.database import SessionLocal
from app.services.crawler_runner import run_crawl_batch
from app.services.report_generator import ReportGenerator


_scheduler = BackgroundScheduler(timezone="Asia/Shanghai") if BackgroundScheduler else None
_lock = Lock()


def _run_flow() -> None:
    db = SessionLocal()
    try:
        asyncio.run(run_crawl_batch(db, force=False))
        ReportGenerator(db).generate()
    finally:
        db.close()


def start_scheduler() -> bool:
    if _scheduler is None:
        raise RuntimeError("APScheduler is not installed. Run pip install -r requirements.txt")
    with _lock:
        if _scheduler.running:
            return False
        _scheduler.add_job(
            _run_flow,
            "interval",
            minutes=settings.scheduler_interval_minutes,
            id="camera_market_flow",
            replace_existing=True,
            max_instances=1,
            coalesce=True,
        )
        _scheduler.start()
        return True


def stop_scheduler() -> bool:
    if _scheduler is None:
        return False
    with _lock:
        if not _scheduler.running:
            return False
        _scheduler.shutdown(wait=False)
        return True


def scheduler_status() -> dict:
    if _scheduler is None:
        return {"running": False, "available": False, "jobs": [], "interval_minutes": settings.scheduler_interval_minutes}
    jobs = [
        {"id": job.id, "next_run_time": job.next_run_time.isoformat() if job.next_run_time else None}
        for job in _scheduler.get_jobs()
    ] if _scheduler.running else []
    return {"running": _scheduler.running, "available": True, "jobs": jobs, "interval_minutes": settings.scheduler_interval_minutes}
