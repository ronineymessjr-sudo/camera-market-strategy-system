from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.services.source_health_service import build_source_health


router = APIRouter(prefix="/api/source-health", tags=["source-health"])


@router.get("", response_model=list[schemas.SourceHealthOut])
def source_health(
    window_hours: int = Query(default=24, ge=1, le=720),
    db: Session = Depends(get_db),
):
    return build_source_health(db, window_hours=window_hours)


@router.get("/history", response_model=schemas.SourceHealthHistoryPageOut)
def source_health_history(
    provider: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(models.SourceHealthHistory)
    if provider:
        query = query.filter(models.SourceHealthHistory.provider == provider.lower())
    total = query.count()
    items = (
        query.order_by(desc(models.SourceHealthHistory.checked_at), desc(models.SourceHealthHistory.id))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return schemas.SourceHealthHistoryPageOut(items=items, total=total, page=page, page_size=page_size)
