from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import desc, text
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
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


@router.get("/last-flow", response_model=schemas.FlowRunOut | None)
def last_flow(db: Session = Depends(get_db)):
    return db.query(models.FlowRun).order_by(desc(models.FlowRun.started_at), desc(models.FlowRun.id)).first()
