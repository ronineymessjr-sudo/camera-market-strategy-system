from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.integrations.registry import provider_statuses
from app.services.integration_service import latest_integration_runs
from app.services.selection_engine import build_selection_candidates


router = APIRouter(prefix="/api/frontend", tags=["frontend-contract"])


@router.get("/bootstrap", response_model=schemas.FrontendBootstrapOut)
def bootstrap(
    user_name: str = "ronin",
    product_limit: int = Query(default=50, ge=1, le=500),
    candidate_limit: int = Query(default=20, ge=1, le=200),
    db: Session = Depends(get_db),
):
    products = (
        db.query(models.Product)
        .filter(models.Product.is_active.is_(True))
        .order_by(desc(models.Product.priority), models.Product.id)
        .limit(product_limit)
        .all()
    )
    product_overviews: list[schemas.ProductOverviewOut] = []
    # Keep bootstrap inexpensive: summary records only; detailed trends use dedicated endpoints.
    for product in products:
        latest = (
            db.query(models.PriceRecord)
            .filter(models.PriceRecord.product_id == product.id)
            .order_by(desc(models.PriceRecord.captured_at), desc(models.PriceRecord.id))
            .first()
        )
        verified = (
            db.query(models.PriceRecord)
            .filter(
                models.PriceRecord.product_id == product.id,
                models.PriceRecord.verification_status == "VERIFIED_CHECKOUT",
            )
            .order_by(desc(models.PriceRecord.captured_at), desc(models.PriceRecord.id))
            .first()
        )
        clue = (
            db.query(models.PriceRecord)
            .filter(
                models.PriceRecord.product_id == product.id,
                models.PriceRecord.verification_status.in_(["VISIBLE_PRICE", "UNVERIFIED"]),
            )
            .order_by(desc(models.PriceRecord.captured_at), desc(models.PriceRecord.id))
            .first()
        )
        signal = (
            db.query(models.Signal)
            .filter(models.Signal.product_id == product.id, models.Signal.is_current.is_(True))
            .order_by(desc(models.Signal.created_at), desc(models.Signal.id))
            .first()
        )
        listing_count = db.query(func.count(models.PlatformListing.id)).filter(
            models.PlatformListing.product_id == product.id,
            models.PlatformListing.is_active.is_(True),
        ).scalar() or 0
        product_overviews.append(schemas.ProductOverviewOut(
            product=product,
            latest_any=latest,
            latest_verified=verified,
            latest_fresh_verified=None,
            latest_clue=clue,
            latest_signal=signal,
            recent_prices=[],
            active_listing_count=listing_count,
            analytics=None,
        ))

    counts = dict(
        db.query(models.PriceRecord.verification_status, func.count(models.PriceRecord.id))
        .group_by(models.PriceRecord.verification_status)
        .all()
    )
    stats = schemas.PriceStatsOut(
        total=sum(counts.values()),
        verified_checkout=counts.get("VERIFIED_CHECKOUT", 0),
        visible_price=counts.get("VISIBLE_PRICE", 0),
        unverified=counts.get("UNVERIFIED", 0),
        invalid=counts.get("INVALID", 0),
        needs_review=db.query(models.PriceRecord).filter(models.PriceRecord.needs_review.is_(True)).count(),
    )
    latest_run = db.query(models.FlowRun).order_by(desc(models.FlowRun.started_at), desc(models.FlowRun.id)).first()
    return schemas.FrontendBootstrapOut(
        generated_at=datetime.now(timezone.utc),
        providers=provider_statuses(),
        price_stats=stats,
        latest_run=latest_run,
        integration_runs=latest_integration_runs(db, limit=10),
        selection_candidates=build_selection_candidates(db, user_name=user_name, limit=candidate_limit),
        products=product_overviews,
    )
