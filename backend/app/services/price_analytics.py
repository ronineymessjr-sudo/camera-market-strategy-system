from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from math import isfinite
from statistics import mean, median

from sqlalchemy import asc
from sqlalchemy.orm import Session

from app import models, schemas


@dataclass(slots=True)
class PricePoint:
    price: float
    captured_at: datetime
    currency: str | None
    status: str


def _utcnow_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _as_naive(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is not None:
        return value.astimezone(timezone.utc).replace(tzinfo=None)
    return value


def _record_price(row: models.PriceRecord, series_type: str) -> float | None:
    if series_type == "VERIFIED_CHECKOUT":
        return float(row.checkout_price) if row.checkout_price is not None else None
    if row.promotion_price is not None:
        return float(row.promotion_price)
    if row.list_price is not None:
        return float(row.list_price)
    return None


def _percentile_rank(values: list[float], current: float) -> float:
    if not values:
        return 0.0
    below_or_equal = sum(1 for value in values if value <= current)
    return round((below_or_equal / len(values)) * 100, 2)


def _median_absolute_deviation(values: list[float], center: float) -> float:
    return median([abs(value - center) for value in values]) if values else 0.0


def calculate_product_analytics(
    db: Session,
    product_id: int,
    *,
    window_days: int = 30,
    preferred_currency: str = "CNY",
    min_samples: int = 3,
) -> schemas.PriceAnalyticsOut:
    start = _utcnow_naive() - timedelta(days=window_days)

    verified_rows = (
        db.query(models.PriceRecord)
        .filter(
            models.PriceRecord.product_id == product_id,
            models.PriceRecord.verification_status == "VERIFIED_CHECKOUT",
            models.PriceRecord.checkout_price.isnot(None),
            db.query(models.PriceEvidence.id).filter(
                models.PriceEvidence.price_record_id == models.PriceRecord.id,
                models.PriceEvidence.trusted_for_strategy.is_(True),
            ).exists(),
            models.PriceRecord.captured_at >= start,
        )
        .order_by(asc(models.PriceRecord.captured_at), asc(models.PriceRecord.id))
        .all()
    )
    visible_rows = (
        db.query(models.PriceRecord)
        .filter(
            models.PriceRecord.product_id == product_id,
            models.PriceRecord.verification_status == "VISIBLE_PRICE",
            models.PriceRecord.captured_at >= start,
        )
        .order_by(asc(models.PriceRecord.captured_at), asc(models.PriceRecord.id))
        .all()
    )

    verified_filtered = [row for row in verified_rows if not row.currency or row.currency.upper() == preferred_currency.upper()]
    visible_filtered = [row for row in visible_rows if not row.currency or row.currency.upper() == preferred_currency.upper()]

    if len(verified_filtered) >= min_samples:
        rows = verified_filtered
        series_type = "VERIFIED_CHECKOUT"
    elif len(visible_filtered) >= min_samples:
        rows = visible_filtered
        series_type = "VISIBLE_PRICE"
    elif verified_filtered:
        rows = verified_filtered
        series_type = "VERIFIED_CHECKOUT"
    else:
        rows = visible_filtered
        series_type = "VISIBLE_PRICE" if visible_filtered else "NO_DATA"

    points: list[PricePoint] = []
    for row in rows:
        value = _record_price(row, series_type)
        if value is None or not isfinite(value) or value <= 0:
            continue
        points.append(
            PricePoint(
                price=value,
                captured_at=_as_naive(row.captured_at) or _utcnow_naive(),
                currency=(row.currency or preferred_currency).upper(),
                status=row.verification_status,
            )
        )

    if not points:
        return schemas.PriceAnalyticsOut(
            product_id=product_id,
            window_days=window_days,
            series_type="NO_DATA",
            currency=preferred_currency.upper(),
            sample_count=0,
            is_sufficient=False,
            trend="INSUFFICIENT_DATA",
        )

    values = [point.price for point in points]
    current = values[-1]
    min_price = min(values)
    max_price = max(values)
    median_price = median(values)
    mean_price = mean(values)
    mad = _median_absolute_deviation(values, median_price)
    range_pct = ((max_price - min_price) / median_price * 100) if median_price else None
    volatility_pct = ((mad / median_price) * 100) if median_price else None
    change_pct = ((current - values[0]) / values[0] * 100) if values[0] else None
    anomaly_score = ((current - median_price) / (1.4826 * mad)) if mad else 0.0
    latest_percentile = _percentile_rank(values, current)

    sufficient = len(values) >= min_samples
    if not sufficient:
        trend = "INSUFFICIENT_DATA"
    elif change_pct is not None and change_pct <= -5:
        trend = "DOWN"
    elif change_pct is not None and change_pct >= 5:
        trend = "UP"
    else:
        trend = "STABLE"

    return schemas.PriceAnalyticsOut(
        product_id=product_id,
        window_days=window_days,
        series_type=series_type,
        currency=points[-1].currency,
        sample_count=len(values),
        is_sufficient=sufficient,
        latest_price=round(current, 2),
        min_price=round(min_price, 2),
        max_price=round(max_price, 2),
        median_price=round(median_price, 2),
        mean_price=round(mean_price, 2),
        range_pct=round(range_pct, 2) if range_pct is not None else None,
        volatility_pct=round(volatility_pct, 2) if volatility_pct is not None else None,
        change_pct=round(change_pct, 2) if change_pct is not None else None,
        latest_percentile=latest_percentile,
        anomaly_score=round(anomaly_score, 2),
        trend=trend,
        updated_at=points[-1].captured_at,
    )
