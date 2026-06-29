from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import desc, or_
from sqlalchemy.orm import Session

from app import models
from app.services.signal_engine import SignalEngine


def _utcnow_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _as_naive(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is not None:
        return value.astimezone(timezone.utc).replace(tzinfo=None)
    return value


def latest_verified_price(
    db: Session,
    product_id: int,
    *,
    currency: str | None = None,
    max_age_hours: int | None = None,
    fresh_only: bool = False,
) -> models.PriceRecord | None:
    query = db.query(models.PriceRecord).filter(
        models.PriceRecord.product_id == product_id,
        models.PriceRecord.verification_status == "VERIFIED_CHECKOUT",
        models.PriceRecord.checkout_price.isnot(None),
    )
    if currency:
        query = query.filter(or_(models.PriceRecord.currency == currency.upper(), models.PriceRecord.currency.is_(None)))
    rows = query.order_by(
        desc(models.PriceRecord.verified_at),
        desc(models.PriceRecord.captured_at),
        desc(models.PriceRecord.id),
    ).limit(20).all()

    if not fresh_only:
        return rows[0] if rows else None

    now = _utcnow_naive()
    for row in rows:
        valid_until = _as_naive(row.valid_until)
        base_time = _as_naive(row.verified_at or row.captured_at)
        expiry_candidates: list[datetime] = []
        if valid_until is not None:
            expiry_candidates.append(valid_until)
        if max_age_hours is not None and base_time is not None:
            expiry_candidates.append(base_time + timedelta(hours=max_age_hours))
        is_fresh = now <= min(expiry_candidates) if expiry_candidates else True
        if is_fresh:
            return row
    return None


def is_price_fresh(price_record: models.PriceRecord | None, strategy: models.Strategy) -> bool:
    if price_record is None:
        return False
    now = _utcnow_naive()
    valid_until = _as_naive(price_record.valid_until)
    base_time = _as_naive(price_record.verified_at or price_record.captured_at)
    if base_time is None:
        return False
    strategy_expiry = base_time + timedelta(hours=max(strategy.max_price_age_hours or 24, 1))
    effective_expiry = min(valid_until, strategy_expiry) if valid_until is not None else strategy_expiry
    return effective_expiry >= now


def refresh_signal_for_strategy(
    db: Session,
    strategy: models.Strategy,
    price_record: models.PriceRecord | None = None,
    *,
    commit: bool = True,
) -> models.Signal:
    engine = SignalEngine()
    price_record = price_record or latest_verified_price(db, strategy.product_id, currency=strategy.currency)
    currency_matches = bool(
        price_record is None
        or not price_record.currency
        or price_record.currency.upper() == (strategy.currency or "CNY").upper()
    )
    result = engine.evaluate(
        float(price_record.checkout_price) if price_record and price_record.checkout_price is not None else None,
        float(strategy.trigger_price) if strategy.trigger_price is not None else None,
        float(strategy.strong_buy_price) if strategy.strong_buy_price is not None else None,
        price_record.verification_status if price_record else None,
        is_fresh=is_price_fresh(price_record, strategy),
        currency_matches=currency_matches,
    )

    previous = (
        db.query(models.Signal)
        .filter(models.Signal.strategy_id == strategy.id, models.Signal.is_current.is_(True))
        .order_by(desc(models.Signal.created_at), desc(models.Signal.id))
        .first()
    )
    same_state = (
        previous
        and previous.price_record_id == (price_record.id if price_record else None)
        and previous.signal_type == result.signal_type
        and previous.message == result.message
    )
    if same_state:
        return previous

    db.query(models.Signal).filter(
        models.Signal.strategy_id == strategy.id,
        models.Signal.is_current.is_(True),
    ).update({models.Signal.is_current: False}, synchronize_session=False)

    signal = models.Signal(
        product_id=strategy.product_id,
        strategy_id=strategy.id,
        price_record_id=price_record.id if price_record else None,
        signal_type=result.signal_type,
        reason_code=result.reason_code,
        triggered=result.triggered,
        is_current=True,
        message=result.message,
    )
    db.add(signal)
    if commit:
        db.commit()
        db.refresh(signal)
    return signal


def refresh_signals_for_product(db: Session, product_id: int, price_record: models.PriceRecord | None = None) -> list[models.Signal]:
    strategies = (
        db.query(models.Strategy)
        .filter(models.Strategy.product_id == product_id, models.Strategy.is_active.is_(True))
        .all()
    )
    signals = [refresh_signal_for_strategy(db, strategy, price_record, commit=False) for strategy in strategies]
    db.commit()
    for signal in signals:
        db.refresh(signal)
    return signals


def refresh_all_active_signals(db: Session) -> list[models.Signal]:
    strategies = db.query(models.Strategy).filter(models.Strategy.is_active.is_(True)).all()
    signals = [refresh_signal_for_strategy(db, strategy, commit=False) for strategy in strategies]
    db.commit()
    for signal in signals:
        db.refresh(signal)
    return signals
