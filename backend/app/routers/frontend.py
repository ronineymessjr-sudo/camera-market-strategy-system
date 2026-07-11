from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.integrations.registry import provider_statuses
from app.services.integration_service import latest_integration_runs
from app.services.overview_service import active_listing_counts, latest_prices_by_product, latest_signals_by_product
from app.services.selection_engine import build_selection_candidates
from app.services.source_health_service import build_source_health


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
    product_ids = [product.id for product in products]
    latest_by_product = latest_prices_by_product(db, product_ids)
    verified_by_product = latest_prices_by_product(db, product_ids, ["VERIFIED_CHECKOUT"], trusted_only=True)
    clues_by_product = latest_prices_by_product(db, product_ids, ["VISIBLE_PRICE", "UNVERIFIED"])
    signals_by_product = latest_signals_by_product(db, product_ids)
    listing_counts = active_listing_counts(db, product_ids)

    for product in products:
        product_overviews.append(schemas.ProductOverviewOut(
            product=product,
            latest_any=latest_by_product.get(product.id),
            latest_verified=verified_by_product.get(product.id),
            latest_fresh_verified=None,
            latest_clue=clues_by_product.get(product.id),
            latest_signal=signals_by_product.get(product.id),
            recent_prices=[],
            active_listing_count=listing_counts.get(product.id, 0),
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
        source_health=build_source_health(db, window_hours=24),
        notifications=(
            db.query(models.Notification)
            .filter(models.Notification.status == "UNREAD")
            .order_by(desc(models.Notification.created_at), desc(models.Notification.id))
            .limit(10)
            .all()
        ),
        price_stats=stats,
        latest_run=latest_run,
        integration_runs=latest_integration_runs(db, limit=10),
        selection_candidates=build_selection_candidates(db, user_name=user_name, limit=candidate_limit),
        products=product_overviews,
    )
