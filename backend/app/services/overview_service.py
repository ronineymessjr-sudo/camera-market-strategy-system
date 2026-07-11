from __future__ import annotations

from collections import defaultdict

from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app import models


def latest_prices_by_product(
    db: Session,
    product_ids: list[int],
    statuses: list[str] | None = None,
    *,
    trusted_only: bool = False,
) -> dict[int, models.PriceRecord]:
    if not product_ids:
        return {}
    ranked_query = db.query(
        models.PriceRecord.id.label("price_id"),
        func.row_number().over(
            partition_by=models.PriceRecord.product_id,
            order_by=(desc(models.PriceRecord.captured_at), desc(models.PriceRecord.id)),
        ).label("row_number"),
    ).filter(models.PriceRecord.product_id.in_(product_ids))
    if statuses:
        ranked_query = ranked_query.filter(models.PriceRecord.verification_status.in_(statuses))
    if trusted_only:
        ranked_query = ranked_query.filter(
            db.query(models.PriceEvidence.id).filter(
                models.PriceEvidence.price_record_id == models.PriceRecord.id,
                models.PriceEvidence.trusted_for_strategy.is_(True),
            ).exists()
        )
    ranked = ranked_query.subquery()
    rows = (
        db.query(models.PriceRecord)
        .join(ranked, ranked.c.price_id == models.PriceRecord.id)
        .filter(ranked.c.row_number == 1)
        .all()
    )
    return {row.product_id: row for row in rows}


def latest_signals_by_product(db: Session, product_ids: list[int]) -> dict[int, models.Signal]:
    if not product_ids:
        return {}
    rows = (
        db.query(models.Signal)
        .filter(models.Signal.product_id.in_(product_ids), models.Signal.is_current.is_(True))
        .order_by(desc(models.Signal.created_at), desc(models.Signal.id))
        .all()
    )
    result = {}
    for row in rows:
        result.setdefault(row.product_id, row)
    return result


def active_strategies_by_product(db: Session, product_ids: list[int]) -> dict[int, models.Strategy]:
    if not product_ids:
        return {}
    rows = (
        db.query(models.Strategy)
        .filter(models.Strategy.product_id.in_(product_ids), models.Strategy.is_active.is_(True))
        .order_by(desc(models.Strategy.id))
        .all()
    )
    result = {}
    for row in rows:
        result.setdefault(row.product_id, row)
    return result


def active_listing_counts(db: Session, product_ids: list[int]) -> dict[int, int]:
    if not product_ids:
        return {}
    return dict(
        db.query(models.PlatformListing.product_id, func.count(models.PlatformListing.id))
        .filter(models.PlatformListing.product_id.in_(product_ids), models.PlatformListing.is_active.is_(True))
        .group_by(models.PlatformListing.product_id)
        .all()
    )


def recent_prices_by_product(db: Session, product_ids: list[int], limit: int = 8) -> dict[int, list[models.PriceRecord]]:
    if not product_ids:
        return {}
    ranked = db.query(
        models.PriceRecord.id.label("price_id"),
        func.row_number().over(
            partition_by=models.PriceRecord.product_id,
            order_by=(desc(models.PriceRecord.captured_at), desc(models.PriceRecord.id)),
        ).label("row_number"),
    ).filter(models.PriceRecord.product_id.in_(product_ids)).subquery()
    rows = (
        db.query(models.PriceRecord)
        .join(ranked, ranked.c.price_id == models.PriceRecord.id)
        .filter(ranked.c.row_number <= limit)
        .order_by(models.PriceRecord.product_id, desc(models.PriceRecord.captured_at), desc(models.PriceRecord.id))
        .all()
    )
    grouped: dict[int, list[models.PriceRecord]] = defaultdict(list)
    for row in rows:
        grouped[row.product_id].append(row)
    return dict(grouped)
