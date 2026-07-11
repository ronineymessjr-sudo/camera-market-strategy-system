from __future__ import annotations

import asyncio
import json
from datetime import date, datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import models, schemas
from app.services.crawler_runner import run_crawl_batch
from app.services.integration_service import sync_provider
from app.services.report_generator import ReportGenerator


def enqueue_job(
    db: Session,
    job_type: str,
    payload: dict | None = None,
    *,
    idempotency_key: str | None = None,
) -> models.BackgroundJob:
    if idempotency_key:
        existing = db.query(models.BackgroundJob).filter(
            models.BackgroundJob.idempotency_key == idempotency_key,
        ).first()
        if existing:
            return existing
    job = models.BackgroundJob(
        job_type=job_type.upper(),
        status="QUEUED",
        idempotency_key=idempotency_key,
        payload_json=json.dumps(payload or {}, ensure_ascii=False),
    )
    db.add(job)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        if idempotency_key:
            existing = db.query(models.BackgroundJob).filter(
                models.BackgroundJob.idempotency_key == idempotency_key,
            ).first()
            if existing:
                return existing
        raise
    db.refresh(job)
    return job


def daily_idempotency_key(force: bool = False) -> str:
    suffix = uuid4().hex if force else date.today().isoformat()
    return f"daily-flow:{suffix}"


def claim_next_job(db: Session, worker_id: str) -> models.BackgroundJob | None:
    stale_before = datetime.now(timezone.utc) - timedelta(hours=1)
    stale_jobs = db.query(models.BackgroundJob).filter(
        models.BackgroundJob.status == "RUNNING",
        models.BackgroundJob.started_at < stale_before,
    ).all()
    for stale in stale_jobs:
        if (stale.attempts or 0) >= 3:
            stale.status = "FAILED"
            stale.error_message = "Job abandoned after three worker attempts"
            stale.finished_at = datetime.now(timezone.utc)
        else:
            stale.status = "QUEUED"
            stale.worker_id = None
            stale.started_at = None
    if stale_jobs:
        db.commit()

    statement = (
        select(models.BackgroundJob)
        .where(models.BackgroundJob.status == "QUEUED")
        .order_by(models.BackgroundJob.created_at, models.BackgroundJob.id)
        .limit(1)
    )
    if db.get_bind().dialect.name == "postgresql":
        statement = statement.with_for_update(skip_locked=True)
    job = db.execute(statement).scalar_one_or_none()
    if job is None:
        db.rollback()
        return None
    job.status = "RUNNING"
    job.worker_id = worker_id
    job.attempts = (job.attempts or 0) + 1
    job.started_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(job)
    return job


def execute_job(db: Session, job: models.BackgroundJob) -> None:
    payload = json.loads(job.payload_json or "{}")
    try:
        result = _execute_job_payload(db, job.job_type, payload)
        job = db.get(models.BackgroundJob, job.id)
        job.status = "SUCCESS"
        job.result_json = json.dumps(result, ensure_ascii=False, default=str)
        job.finished_at = datetime.now(timezone.utc)
        db.commit()
    except Exception as exc:
        db.rollback()
        job = db.get(models.BackgroundJob, job.id)
        job.status = "FAILED"
        job.error_message = str(exc)[:4000]
        job.finished_at = datetime.now(timezone.utc)
        db.commit()


def _execute_job_payload(db: Session, job_type: str, payload: dict) -> dict:
    if job_type == "CRAWL_ALL":
        crawl = asyncio.run(run_crawl_batch(db, **payload))
        return _crawl_result(crawl)
    if job_type == "DAILY_FLOW":
        crawl = asyncio.run(run_crawl_batch(db, **payload))
        report = ReportGenerator(db).generate()
        return {"crawl": _crawl_result(crawl), "report_id": report.id, "report_date": report.report_date}
    if job_type == "REPORT":
        report = ReportGenerator(db).generate()
        return {"report_id": report.id, "report_date": report.report_date}
    if job_type == "INTEGRATION_SYNC":
        provider = payload.pop("provider")
        run, offers, price_ids = asyncio.run(sync_provider(db, provider, schemas.IntegrationSearchRequest(**payload)))
        return {"run_id": run.id, "offer_count": len(offers), "price_record_ids": price_ids}
    raise ValueError(f"Unsupported job type: {job_type}")


def _crawl_result(crawl) -> dict:
    return {
        "run_id": crawl.run.id,
        "status": crawl.run.status,
        "success_count": crawl.run.success_count,
        "failure_count": crawl.run.failure_count,
        "skipped_count": crawl.run.skipped_count,
    }
