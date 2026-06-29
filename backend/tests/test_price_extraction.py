from app.crawler.generic import extract_visible_price


def test_prefers_checkout_keyword():
    text = "官方建议零售价 ¥5999。88VIP 叠券后到手价：¥4299，运费0元。"
    result = extract_visible_price(text)
    assert result.value == 4299
    assert result.currency == "CNY"
    assert result.confidence >= 0.7


def test_model_number_without_price_is_rejected():
    result = extract_visible_price("Sigma 17-40mm F1.8 DC Art Sony E")
    assert result.value is None


def test_usd_currency_is_preserved():
    result = extract_visible_price("Sale price USD 919")
    assert result.value == 919
    assert result.currency == "USD"
