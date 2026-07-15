from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import desc, text
from sqlalchemy.orm import Session

from app import models, schemas
from app.config import settings
from app.database import get_db
from app.integrations.registry import provider_statuses
from app.version import APP_VERSION


router = APIRouter(prefix="/api/system", tags=["system"])


@router.get("/health")
def health():
    return {"status": "ok", "version": APP_VERSION}


@router.get("/ready")
def ready(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    tables = {"products", "price_records", "price_evidence", "background_jobs"}
    existing = set(db.get_bind().dialect.get_table_names(db.connection()))
    missing = sorted(tables - existing)
    return {
        "status": "ready" if not missing else "degraded",
        "version": APP_VERSION,
        "database": "ok",
        "missing_tables": missing,
    }


@router.get("/status")
def status(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    database_url = settings.database_url.lower()
    cloudflare_access_configured = bool(
        settings.cloudflare_access_team_domain
        and settings.cloudflare_access_audience
        and settings.operator_email
    )
    last_flow = db.query(models.FlowRun).order_by(desc(models.FlowRun.started_at), desc(models.FlowRun.id)).first()
    return {
        "version": APP_VERSION,
        "runtime_mode": "local" if database_url.startswith("sqlite") else "cloud",
        "checks": {
            "database_ready": True,
            "production_database": not database_url.startswith("sqlite"),
            "operator_auth_configured": bool(
                settings.operator_api_token
                or cloudflare_access_configured
                or (settings.local_dev_auth_bypass and database_url.startswith("sqlite"))
            ),
            "cloudflare_access_configured": cloudflare_access_configured,
            "evidence_storage_configured": bool(settings.supabase_url and settings.supabase_service_role_key),
            "public_https": settings.public_base_url.lower().startswith("https://"),
            "scheduler_enabled": settings.scheduler_enabled,
        },
        "counts": {
            "active_products": db.query(models.Product).filter(models.Product.is_active.is_(True)).count(),
            "active_listings": db.query(models.PlatformListing).filter(models.PlatformListing.is_active.is_(True)).count(),
            "price_records": db.query(models.PriceRecord).count(),
            "pending_reviews": db.query(models.PriceRecord).filter(models.PriceRecord.needs_review.is_(True)).count(),
            "queued_jobs": db.query(models.BackgroundJob).filter(models.BackgroundJob.status == "QUEUED").count(),
            "failed_jobs": db.query(models.BackgroundJob).filter(models.BackgroundJob.status == "FAILED").count(),
        },
        "providers": provider_statuses(),
        "last_flow": schemas.FlowRunOut.model_validate(last_flow).model_dump(mode="json") if last_flow else None,
    }


@router.get("/last-flow", response_model=schemas.FlowRunOut | None)
def last_flow(db: Session = Depends(get_db)):
    return db.query(models.FlowRun).order_by(desc(models.FlowRun.started_at), desc(models.FlowRun.id)).first()
