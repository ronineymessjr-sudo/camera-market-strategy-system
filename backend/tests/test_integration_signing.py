from app.integrations.signing import secret_wrapped_md5


def test_secret_wrapped_md5_is_order_independent():
    left = secret_wrapped_md5({"b": 2, "a": 1}, "secret")
    right = secret_wrapped_md5({"a": 1, "b": 2}, "secret")
    assert left == right
    assert len(left) == 32
    assert left == left.upper()
