from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class SignalResult:
    signal_type: str
    triggered: bool
    message: str
    reason_code: str


class SignalEngine:
    """Pure user-strategy evaluator.

    A buy signal requires a fresh VERIFIED_CHECKOUT record in the same currency.
    Old prices, visible page prices and inferred prices may inform review/ranking,
    but they never become executable strategy signals.
    """

    def evaluate(
        self,
        checkout_price: float | None,
        trigger_price: float | None,
        strong_buy_price: float | None,
        verification_status: str | None = None,
        *,
        is_fresh: bool = True,
        currency_matches: bool = True,
    ) -> SignalResult:
        if verification_status != "VERIFIED_CHECKOUT" or checkout_price is None:
            return SignalResult("UNVERIFIED", False, "缺少可核验结算价，不能触发策略。", "NO_VERIFIED_PRICE")
        if not currency_matches:
            return SignalResult("CURRENCY_MISMATCH", False, "已核验价格币种与策略币种不一致。", "CURRENCY_MISMATCH")
        if not is_fresh:
            return SignalResult("STALE", False, "最近已核验价格已过期，需要重新核验当前结算价。", "STALE_PRICE")
        if strong_buy_price is not None and checkout_price <= strong_buy_price:
            return SignalResult("STRONG_BUY", True, f"到手价 ¥{checkout_price:.2f} 已进入用户设置的强买/神价区。", "STRONG_THRESHOLD")
        if trigger_price is not None and checkout_price <= trigger_price:
            return SignalResult("BUY_TRIGGERED", True, f"到手价 ¥{checkout_price:.2f} 已低于用户触发线 ¥{trigger_price:.2f}。", "TRIGGER_THRESHOLD")
        if trigger_price is None:
            return SignalResult("WATCH_ONLY", False, f"已记录可核验到手价 ¥{checkout_price:.2f}，但用户尚未设置触发线。", "NO_THRESHOLD")
        gap = checkout_price - trigger_price
        return SignalResult("WAIT", False, f"未触发；当前到手价距离用户触发线还差 ¥{gap:.2f}。", "ABOVE_THRESHOLD")
