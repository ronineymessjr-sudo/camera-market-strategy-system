from app.services.signal_engine import SignalEngine


def test_unverified_price_never_triggers():
    result = SignalEngine().evaluate(4200, 4500, 4300, "VISIBLE_PRICE")
    assert result.signal_type == "UNVERIFIED"
    assert result.triggered is False


def test_strong_buy_requires_verified_checkout():
    result = SignalEngine().evaluate(4299, 4500, 4300, "VERIFIED_CHECKOUT")
    assert result.signal_type == "STRONG_BUY"
    assert result.triggered is True


def test_wait_gap():
    result = SignalEngine().evaluate(4700, 4500, 4300, "VERIFIED_CHECKOUT")
    assert result.signal_type == "WAIT"
    assert "200" in result.message
