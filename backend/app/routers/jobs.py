from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import require_operator
from app.database import get_db
from app.services.job_queue import daily_idempotency_key, enqueue_job


router = APIRouter(prefix="/api/jobs", tags=["jobs"], dependencies=[Depends(require_operator)])


@router.post("/daily-flow", response_model=schemas.BackgroundJobOut, status_code=status.HTTP_202_ACCEPTED)
def enqueue_daily_flow(force: bool = False, db: Session = Depends(get_db)):
    return enqueue_job(
        db,
        "DAILY_FLOW",
        {"force": force},
        idempotency_key=daily_idempotency_key(force),
    )


@router.post("/crawls", response_model=schemas.BackgroundJobOut, status_code=status.HTTP_202_ACCEPTED)
def enqueue_crawl(
    product_id: int | None = None,
    platform: str | None = None,
    force: bool = False,
    concurrency: int | None = Query(default=None, ge=1, le=8),
    db: Session = Depends(get_db),
):
    payload = {"product_id": product_id, "platform": platform, "force": force, "concurrency": concurrency}
    payload = {key: value for key, value in payload.items() if value is not None}
    window = datetime.now(timezone.utc).strftime("%Y%m%d%H%M")
    key = f"crawl:{product_id or 'all'}:{platform or 'all'}:{force}:{window}"
    return enqueue_job(db, "CRAWL_ALL", payload, idempotency_key=key)


@router.post("/reports", response_model=schemas.BackgroundJobOut, status_code=status.HTTP_202_ACCEPTED)
def enqueue_report(force: bool = True, db: Session = Depends(get_db)):
    key = None if force else f"report:{datetime.now(timezone.utc).date()}"
    return enqueue_job(db, "REPORT", {}, idempotency_key=key)


@router.post("/integrations/{provider}", response_model=schemas.BackgroundJobOut, status_code=status.HTTP_202_ACCEPTED)
def enqueue_integration(provider: str, payload: schemas.IntegrationSearchRequest, db: Session = Depends(get_db)):
    body = payload.model_dump()
    body["provider"] = provider.lower()
    return enqueue_job(db, "INTEGRATION_SYNC", body)


@router.get("/{job_id}", response_model=schemas.BackgroundJobOut)
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.get(models.BackgroundJob, job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return job
