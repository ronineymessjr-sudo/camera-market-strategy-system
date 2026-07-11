from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db


router = APIRouter(prefix="/api/reviews", tags=["reviews"])


@router.get("", response_model=schemas.ReviewPageOut)
def list_reviews(
    status: str | None = None,
    platform: str | None = None,
    product_id: int | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    base_query = db.query(models.PriceRecord).filter(
        models.PriceRecord.needs_review.is_(True),
        models.PriceRecord.verification_status.in_(["VISIBLE_PRICE", "UNVERIFIED"]),
    )
    status_counts = dict(
        db.query(models.PriceRecord.verification_status, func.count(models.PriceRecord.id))
        .filter(
            models.PriceRecord.needs_review.is_(True),
            models.PriceRecord.verification_status.in_(["VISIBLE_PRICE", "UNVERIFIED"]),
        )
        .group_by(models.PriceRecord.verification_status)
        .all()
    )
    platforms = [row[0] for row in (
        db.query(models.PriceRecord.platform)
        .filter(models.PriceRecord.needs_review.is_(True), models.PriceRecord.platform.isnot(None))
        .distinct()
        .order_by(models.PriceRecord.platform)
        .all()
    )]
    query = base_query
    if status:
        query = query.filter(models.PriceRecord.verification_status == status.upper())
    if platform:
        query = query.filter(models.PriceRecord.platform == platform)
    if product_id is not None:
        query = query.filter(models.PriceRecord.product_id == product_id)
    total = query.count()
    items = (
        query.order_by(
            desc(models.PriceRecord.confidence_score),
            desc(models.PriceRecord.captured_at),
            desc(models.PriceRecord.id),
        )
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return schemas.ReviewPageOut(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        status_counts=status_counts,
        platforms=platforms,
    )
