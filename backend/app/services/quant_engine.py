from __future__ import annotations

from datetime import datetime, timedelta, timezone
from math import sqrt
from statistics import mean, median, pstdev

from sqlalchemy import and_, asc, or_
from sqlalchemy.orm import Session

from app import models, schemas


def _now_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _price(row: models.PriceRecord, include_visible: bool) -> float | None:
    if row.verification_status == "VERIFIED_CHECKOUT" and row.checkout_price is not None:
        return float(row.checkout_price)
    if include_visible and row.verification_status == "VISIBLE_PRICE":
        value = row.promotion_price if row.promotion_price is not None else row.list_price
        return float(value) if value is not None else None
    return None


def load_series(
    db: Session,
    product_id: int,
    *,
    window_days: int,
    currency: str,
    include_visible: bool = False,
) -> list[tuple[datetime, float, str]]:
    start = _now_naive() - timedelta(days=window_days)
    statuses = ["VERIFIED_CHECKOUT"] + (["VISIBLE_PRICE"] if include_visible else [])
    trusted_verified = and_(
        models.PriceRecord.verification_status == "VERIFIED_CHECKOUT",
        db.query(models.PriceEvidence.id).filter(
            models.PriceEvidence.price_record_id == models.PriceRecord.id,
            models.PriceEvidence.trusted_for_strategy.is_(True),
        ).exists(),
    )
    trust_filter = or_(trusted_verified, models.PriceRecord.verification_status == "VISIBLE_PRICE") if include_visible else trusted_verified
    rows = (
        db.query(models.PriceRecord)
        .filter(
            models.PriceRecord.product_id == product_id,
            models.PriceRecord.verification_status.in_(statuses),
            trust_filter,
            models.PriceRecord.captured_at >= start,
        )
        .order_by(asc(models.PriceRecord.captured_at), asc(models.PriceRecord.id))
        .all()
    )
    result: list[tuple[datetime, float, str]] = []
    for row in rows:
        if row.currency and row.currency.upper() != currency.upper():
            continue
        value = _price(row, include_visible)
        if value is None or value <= 0:
            continue
        result.append((row.captured_at, value, row.verification_status))
    return result


def _sma(values: list[float], period: int) -> float | None:
    return round(mean(values[-period:]), 4) if len(values) >= period else None


def _ema(values: list[float], period: int) -> float | None:
    if len(values) < period:
        return None
    alpha = 2 / (period + 1)
    current = mean(values[:period])
    for value in values[period:]:
        current = alpha * value + (1 - alpha) * current
    return round(current, 4)


def _rsi(values: list[float], period: int = 14) -> float | None:
    if len(values) <= period:
        return None
    changes = [values[i] - values[i - 1] for i in range(1, len(values))]
    recent = changes[-period:]
    gains = mean([max(change, 0) for change in recent])
    losses = mean([max(-change, 0) for change in recent])
    if losses == 0:
        return 100.0
    rs = gains / losses
    return round(100 - (100 / (1 + rs)), 2)


def _max_drawdown(values: list[float]) -> float | None:
    if not values:
        return None
    peak = values[0]
    worst = 0.0
    for value in values:
        peak = max(peak, value)
        drawdown = (value - peak) / peak * 100 if peak else 0
        worst = min(worst, drawdown)
    return round(abs(worst), 2)


def _returns(values: list[float]) -> list[float]:
    return [(values[i] / values[i - 1] - 1) * 100 for i in range(1, len(values)) if values[i - 1] != 0]


def quant_indicators(
    db: Session,
    product_id: int,
    *,
    window_days: int = 180,
    currency: str = "CNY",
    include_visible: bool = False,
) -> schemas.QuantIndicatorsOut:
    series = load_series(db, product_id, window_days=window_days, currency=currency, include_visible=include_visible)
    values = [point[1] for point in series]
    series_type = "MIXED" if include_visible else "VERIFIED_CHECKOUT"
    if not values:
        return schemas.QuantIndicatorsOut(
            product_id=product_id,
            window_days=window_days,
            currency=currency,
            series_type=series_type,
            sample_count=0,
        )

    mid = _sma(values, min(20, len(values)))
    if len(values) >= 2:
        sd = pstdev(values[-min(20, len(values)):])
    else:
        sd = 0.0
    upper = mid + 2 * sd if mid is not None else None
    lower = mid - 2 * sd if mid is not None else None
    z = (values[-1] - mid) / sd if mid is not None and sd else 0.0
    returns = _returns(values)
    downside = [value for value in returns if value < 0]
    downside_dev = sqrt(mean([value * value for value in downside])) if downside else 0.0
    percentile = sum(1 for value in values if value <= values[-1]) / len(values) * 100
    sma_short = _sma(values, min(7, len(values)))
    sma_long = _sma(values, min(30, len(values)))
    if len(values) < 3:
        regime = "INSUFFICIENT_DATA"
    elif z <= -1:
        regime = "DISCOUNT_REGIME"
    elif z >= 1:
        regime = "PREMIUM_REGIME"
    elif sma_short is not None and sma_long is not None and sma_short < sma_long:
        regime = "DOWNTREND"
    elif sma_short is not None and sma_long is not None and sma_short > sma_long:
        regime = "UPTREND"
    else:
        regime = "RANGE"
    risk = "HIGH" if downside_dev >= 8 or (_max_drawdown(values) or 0) >= 20 else "MEDIUM" if downside_dev >= 3 else "LOW"
    return schemas.QuantIndicatorsOut(
        product_id=product_id,
        window_days=window_days,
        currency=currency.upper(),
        series_type=series_type,
        sample_count=len(values),
        latest_price=round(values[-1], 2),
        sma_short=round(sma_short, 2) if sma_short is not None else None,
        sma_long=round(sma_long, 2) if sma_long is not None else None,
        ema_short=_ema(values, min(7, len(values))),
        ema_long=_ema(values, min(30, len(values))),
        rsi_14=_rsi(values),
        bollinger_mid=round(mid, 2) if mid is not None else None,
        bollinger_upper=round(upper, 2) if upper is not None else None,
        bollinger_lower=round(lower, 2) if lower is not None else None,
        z_score=round(z, 3),
        max_drawdown_pct=_max_drawdown(values),
        downside_deviation_pct=round(downside_dev, 2),
        price_percentile=round(percentile, 2),
        market_regime=regime,
        risk_level=risk,
    )


def backtest_strategy(db: Session, payload: schemas.BacktestRequest) -> schemas.BacktestOut:
    strategy = db.get(models.Strategy, payload.strategy_id) if payload.strategy_id else None
    trigger = payload.trigger_price if payload.trigger_price is not None else (float(strategy.trigger_price) if strategy and strategy.trigger_price is not None else None)
    strong = payload.strong_buy_price if payload.strong_buy_price is not None else (float(strategy.strong_buy_price) if strategy and strategy.strong_buy_price is not None else None)
    if trigger is None:
        raise ValueError("Backtest requires trigger_price or a strategy with trigger_price")
    series = load_series(
        db,
        payload.product_id,
        window_days=payload.window_days,
        currency=payload.currency,
        include_visible=payload.include_visible_prices,
    )
    values = [point[1] for point in series]
    events: list[dict] = []
    for captured_at, price, status in series:
        if strong is not None and price <= strong:
            events.append({"captured_at": captured_at.isoformat(), "price": price, "signal": "STRONG_BUY", "status": status})
        elif price <= trigger:
            events.append({"captured_at": captured_at.isoformat(), "price": price, "signal": "BUY_TRIGGERED", "status": status})
    trigger_values = [event["price"] for event in events]
    med = median(values) if values else None
    low = min(values) if values else None
    avg_trigger = mean(trigger_values) if trigger_values else None
    savings = ((med - avg_trigger) / med * 100) if med and avg_trigger is not None else None
    missed = ((avg_trigger - low) / low * 100) if low and avg_trigger is not None else None
    returns = _returns(values)
    volatility = pstdev(returns) if len(returns) >= 2 else 0.0
    trigger_rate = len(events) / len(values) * 100 if values else 0.0
    if not values:
        verdict = "NO_DATA"
    elif not events:
        verdict = "NEVER_TRIGGERED"
    elif savings is not None and savings >= 10:
        verdict = "EFFECTIVE"
    elif savings is not None and savings >= 3:
        verdict = "MODERATE"
    else:
        verdict = "TOO_LOOSE"
    result = schemas.BacktestOut(
        product_id=payload.product_id,
        strategy_id=strategy.id if strategy else payload.strategy_id,
        window_days=payload.window_days,
        series_type="MIXED" if payload.include_visible_prices else "VERIFIED_CHECKOUT",
        observation_count=len(values),
        trigger_count=len(events),
        strong_trigger_count=sum(1 for event in events if event["signal"] == "STRONG_BUY"),
        first_trigger_at=datetime.fromisoformat(events[0]["captured_at"]) if events else None,
        latest_trigger_at=datetime.fromisoformat(events[-1]["captured_at"]) if events else None,
        lowest_price=round(low, 2) if low is not None else None,
        median_price=round(med, 2) if med is not None else None,
        average_trigger_price=round(avg_trigger, 2) if avg_trigger is not None else None,
        savings_vs_median_pct=round(savings, 2) if savings is not None else None,
        missed_low_gap_pct=round(missed, 2) if missed is not None else None,
        max_drawdown_pct=_max_drawdown(values),
        volatility_pct=round(volatility, 2),
        trigger_rate_pct=round(trigger_rate, 2),
        verdict=verdict,
        events=events[-100:],
    )
    db.add(models.StrategyBacktest(
        strategy_id=result.strategy_id,
        product_id=payload.product_id,
        window_days=payload.window_days,
        series_type=result.series_type,
        metrics_json=result.model_dump_json(),
    ))
    db.commit()
    return result
