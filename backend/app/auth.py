from __future__ import annotations

import hmac
from dataclasses import dataclass
from functools import lru_cache

from fastapi import Header, HTTPException
import jwt
from jwt import PyJWKClient

from app.config import settings


@dataclass(frozen=True, slots=True)
class OperatorIdentity:
    subject: str
    email: str | None
    auth_method: str


@lru_cache(maxsize=4)
def _jwk_client(team_domain: str) -> PyJWKClient:
    return PyJWKClient(f"{team_domain.rstrip('/')}/cdn-cgi/access/certs")


def _cloudflare_identity(token: str) -> OperatorIdentity:
    team_domain = settings.cloudflare_access_team_domain
    audience = settings.cloudflare_access_audience
    if not team_domain or not audience:
        raise HTTPException(503, "Cloudflare Access validation is not configured")
    try:
        signing_key = _jwk_client(team_domain).get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=audience,
            issuer=team_domain.rstrip("/"),
        )
    except Exception as exc:
        raise HTTPException(401, "Invalid Cloudflare Access credentials") from exc

    email = payload.get("email")
    allowed_email = settings.operator_email
    if allowed_email and (not email or email.casefold() != allowed_email.casefold()):
        raise HTTPException(403, "Cloudflare Access identity is not the configured operator")
    subject = str(payload.get("sub") or email or payload.get("common_name") or "cloudflare-access")
    return OperatorIdentity(subject=subject, email=email, auth_method="cloudflare-access")


def require_operator(
    authorization: str | None = Header(default=None),
    x_operator_token: str | None = Header(default=None),
    cf_access_jwt_assertion: str | None = Header(default=None),
) -> OperatorIdentity:
    """Accept a validated Cloudflare Access identity or an automation token."""
    expected = settings.operator_api_token
    token = x_operator_token
    if not token and authorization:
        scheme, _, value = authorization.partition(" ")
        if scheme.lower() == "bearer" and value:
            token = value

    if token and expected and hmac.compare_digest(token, expected):
        return OperatorIdentity(subject="operator-token", email=None, auth_method="operator-token")
    if cf_access_jwt_assertion:
        return _cloudflare_identity(cf_access_jwt_assertion)
    if not expected and not settings.cloudflare_access_audience:
        raise HTTPException(503, "Operator authentication is not configured")
    raise HTTPException(401, "Operator credentials required")
