from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import desc
from sqlalchemy.orm import Session

from app import models, schemas
from app.services.price_analytics import calculate_product_analytics
from app.services.signal_service import is_price_fresh, latest_verified_price


def _utcnow_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _latest_clue(db: Session, product_id: int, max_age_hours: int = 72) -> models.PriceRecord | None:
    threshold = _utcnow_naive() - timedelta(hours=max_age_hours)
    return (
        db.query(models.PriceRecord)
        .filter(
            models.PriceRecord.product_id == product_id,
            models.PriceRecord.verification_status.in_(["VISIBLE_PRICE", "UNVERIFIED"]),
            models.PriceRecord.captured_at >= threshold,
        )
        .order_by(desc(models.PriceRecord.confidence_score), desc(models.PriceRecord.captured_at), desc(models.PriceRecord.id))
        .first()
    )


def _active_strategy(db: Session, product_id: int, user_name: str) -> models.Strategy | None:
    return (
        db.query(models.Strategy)
        .filter(
            models.Strategy.product_id == product_id,
            models.Strategy.user_name == user_name,
            models.Strategy.is_active.is_(True),
        )
        .order_by(desc(models.Strategy.id))
        .first()
    )


def build_selection_candidates(
    db: Session,
    *,
    user_name: str = "ronin",
    window_days: int = 30,
    limit: int = 100,
) -> list[schemas.SelectionCandidateOut]:
    products = (
        db.query(models.Product)
        .filter(models.Product.is_active.is_(True))
        .order_by(desc(models.Product.priority), models.Product.id)
        .limit(limit)
        .all()
    )
    candidates: list[schemas.SelectionCandidateOut] = []

    for product in products:
        strategy = _active_strategy(db, product.id, user_name)
        currency = strategy.currency if strategy else "CNY"
        latest_verified = latest_verified_price(db, product.id, currency=currency)
        fresh_verified = latest_verified if strategy and latest_verified and is_price_fresh(latest_verified, strategy) else None
        latest_clue = _latest_clue(db, product.id)
        analytics = calculate_product_analytics(db, product.id, window_days=window_days, preferred_currency=currency)

        score = float(min(max(product.priority, 0), 100)) * 0.1
        status = "NO_DATA"
        is_buy_signal = False
        reasons: list[str] = []

        if strategy and fresh_verified and fresh_verified.checkout_price is not None:
            price = float(fresh_verified.checkout_price)
            if strategy.strong_buy_price is not None and price <= float(strategy.strong_buy_price):
                score += 85
                status = "STRATEGY_TRIGGERED_STRONG"
                is_buy_signal = True
                reasons.append("新鲜已核验到手价进入用户强买线")
            elif strategy.trigger_price is not None and price <= float(strategy.trigger_price):
                score += 75
                status = "STRATEGY_TRIGGERED"
                is_buy_signal = True
                reasons.append("新鲜已核验到手价进入用户触发线")
            elif strategy.trigger_price is not None:
                gap_pct = (price - float(strategy.trigger_price)) / float(strategy.trigger_price) * 100
                if gap_pct <= float(strategy.near_target_pct or 5):
                    score += 55
                    status = "NEAR_TARGET"
                    reasons.append(f"已核验价格距离用户触发线仅 {gap_pct:.1f}%")
                else:
                    score += 25
                    status = "ABOVE_TARGET"
                    reasons.append("已核验价格仍高于用户触发线")
            else:
                score += 30
                status = "WATCH_ONLY"
                reasons.append("有新鲜已核验价格，但用户未设置触发线")
        elif strategy and latest_verified:
            score += 18
            status = "STALE_VERIFIED"
            reasons.append("存在已核验价格，但已超过策略有效期")
        elif latest_clue:
            score += 20 + float(latest_clue.confidence_score or 0) * 20
            status = "NEEDS_REVIEW"
            reasons.append("发现新的网页价格线索，尚未核验结算价")
        else:
            reasons.append("当前没有新鲜价格数据")

        if analytics.is_sufficient:
            if analytics.latest_percentile is not None and analytics.latest_percentile <= 25:
                score += 10
                reasons.append("当前价格处于近窗低位")
            if analytics.volatility_pct is not None and analytics.volatility_pct >= 5:
                score += 5
                reasons.append("近期价格波动较大，值得提高监控频率")
                if status in {"NO_DATA", "ABOVE_TARGET", "WATCH_ONLY"}:
                    status = "VOLATILE"
        else:
            reasons.append("历史样本不足，暂不做稳定趋势判断")

        score = round(min(score, 100), 2)
        candidates.append(schemas.SelectionCandidateOut(
            product=product,
            strategy=strategy,
            latest_verified=latest_verified,
            latest_clue=latest_clue,
            analytics=analytics,
            score=score,
            status=status,
            is_buy_signal=is_buy_signal,
            reasons=reasons,
        ))

    candidates.sort(key=lambda item: (not item.is_buy_signal, -item.score, -item.product.priority, item.product.id))
    return candidates
