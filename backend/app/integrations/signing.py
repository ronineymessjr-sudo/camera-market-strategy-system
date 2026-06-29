from __future__ import annotations

import hashlib
import hmac
from urllib.parse import urlencode


def md5_upper(value: str) -> str:
    return hashlib.md5(value.encode("utf-8")).hexdigest().upper()  # noqa: S324 - required by provider protocols


def secret_wrapped_md5(params: dict[str, object], secret: str) -> str:
    body = "".join(f"{key}{params[key]}" for key in sorted(params) if params[key] is not None)
    return md5_upper(f"{secret}{body}{secret}")


def hmac_sha256_upper(params: dict[str, object], secret: str) -> str:
    body = "&".join(f"{key}={params[key]}" for key in sorted(params) if params[key] is not None)
    return hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest().upper()


def canonical_query(params: dict[str, object]) -> str:
    return urlencode([(key, str(params[key])) for key in sorted(params) if params[key] is not None])
