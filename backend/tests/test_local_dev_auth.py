from starlette.requests import Request

from app.auth import require_operator
from app.config import settings


def test_local_dev_auth_bypass_is_limited_to_loopback_sqlite():
    previous = (
        settings.local_dev_auth_bypass,
        settings.database_url,
        settings.public_base_url,
        settings.operator_api_token,
        settings.cloudflare_access_audience,
    )
    settings.local_dev_auth_bypass = True
    settings.database_url = "sqlite:///./camera_market.db"
    settings.public_base_url = "http://127.0.0.1:8000"
    settings.operator_api_token = None
    settings.cloudflare_access_audience = None
    request = Request({
        "type": "http",
        "http_version": "1.1",
        "method": "POST",
        "scheme": "http",
        "path": "/api/products",
        "raw_path": b"/api/products",
        "query_string": b"",
        "headers": [],
        "client": ("127.0.0.1", 54321),
        "server": ("127.0.0.1", 8000),
    })
    try:
        identity = require_operator(
            request,
            authorization=None,
            x_operator_token=None,
            cf_access_jwt_assertion=None,
        )
        assert identity.auth_method == "local-dev"
    finally:
        (
            settings.local_dev_auth_bypass,
            settings.database_url,
            settings.public_base_url,
            settings.operator_api_token,
            settings.cloudflare_access_audience,
        ) = previous
