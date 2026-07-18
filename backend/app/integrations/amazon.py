from __future__ import annotations

import time

import httpx

from app.config import settings

from .base import MarketplaceProvider, ProviderOffer, ProviderSearchRequest, ProviderSyncResult


_TOKEN_ENDPOINTS = {
    "2.1": "https://creatorsapi.auth.us-east-1.amazoncognito.com/oauth2/token",
    "2.2": "https://creatorsapi.auth.eu-south-2.amazoncognito.com/oauth2/token",
    "2.3": "https://creatorsapi.auth.us-west-2.amazoncognito.com/oauth2/token",
    "3.1": "https://api.amazon.com/auth/o2/token",
    "3.2": "https://api.amazon.co.uk/auth/o2/token",
    "3.3": "https://api.amazon.co.jp/auth/o2/token",
}


class AmazonProductProvider(MarketplaceProvider):
    code = "amazon"
    display_name = "Amazon Creators API"

    def __init__(self) -> None:
        self._access_token: str | None = None
        self._access_token_expires_at = 0.0

    def is_configured(self) -> bool:
        return bool(
            settings.amazon_credential_id
            and settings.amazon_credential_secret
            and settings.amazon_credential_version in _TOKEN_ENDPOINTS
            and settings.amazon_partner_tag
        )

    async def search(self, request: ProviderSearchRequest) -> ProviderSyncResult:
        if not self.is_configured():
            raise RuntimeError("Amazon Creators API provider is not configured")

        payload = {
            "keywords": request.keyword,
            "itemCount": min(max(request.page_size, 1), 100),
            "itemPage": min(max(request.page, 1), 10),
            "partnerTag": settings.amazon_partner_tag,
            "resources": [
                "images.primary.medium",
                "itemInfo.title",
                "offersV2.listings.availability",
                "offersV2.listings.merchantInfo",
                "offersV2.listings.price",
            ],
        }
        if request.min_price is not None:
            payload["minPrice"] = request.min_price
        if request.max_price is not None:
            payload["maxPrice"] = request.max_price

        async with httpx.AsyncClient(
            timeout=settings.integration_timeout_seconds,
            follow_redirects=True,
        ) as client:
            access_token = await self._get_access_token(client)
            response = await client.post(
                f"{settings.amazon_creators_api_url.rstrip('/')}/catalog/v1/searchItems",
                json=payload,
                headers={
                    "Authorization": _authorization_header(access_token, settings.amazon_credential_version),
                    "x-marketplace": settings.amazon_marketplace,
                },
            )
            response.raise_for_status()
            raw = response.json()

        items = (raw.get("searchResult") or {}).get("items") or []
        offers = [self._normalize(item) for item in items]
        request_id = response.headers.get("x-amzn-requestid") or response.headers.get("x-amz-request-id")
        return ProviderSyncResult(self.code, request, offers, raw, request_id)

    async def _get_access_token(self, client: httpx.AsyncClient) -> str:
        if self._access_token and time.monotonic() < self._access_token_expires_at:
            return self._access_token

        version = settings.amazon_credential_version
        token_payload = {
            "grant_type": "client_credentials",
            "client_id": settings.amazon_credential_id,
            "client_secret": settings.amazon_credential_secret,
            "scope": "creatorsapi::default" if version.startswith("3.") else "creatorsapi/default",
        }
        request_kwargs = {"json": token_payload} if version.startswith("3.") else {"data": token_payload}
        response = await client.post(_token_endpoint(version), **request_kwargs)
        response.raise_for_status()
        raw = response.json()
        access_token = raw.get("access_token")
        if not access_token:
            raise RuntimeError("Amazon Creators API token response did not include access_token")

        expires_in = max(int(raw.get("expires_in") or 3600) - 30, 0)
        self._access_token = str(access_token)
        self._access_token_expires_at = time.monotonic() + expires_in
        return self._access_token

    def _normalize(self, item: dict) -> ProviderOffer:
        listing = (((item.get("offersV2") or {}).get("listings") or []) + [{}])[0]
        price = listing.get("price") or {}
        money = price.get("money") or {}
        saving_basis = (price.get("savingBasis") or {}).get("money") or {}
        title = (((item.get("itemInfo") or {}).get("title") or {}).get("displayValue"))
        merchant = listing.get("merchantInfo") or {}
        availability = listing.get("availability") or {}
        return ProviderOffer(
            provider=self.code,
            external_id=str(item.get("asin") or ""),
            title=str(title or item.get("asin") or ""),
            product_url=item.get("detailPageURL"),
            seller_name=str(merchant.get("name") or "Amazon"),
            list_price=_float(saving_basis.get("amount")) or _float(money.get("amount")),
            promotion_price=_float(money.get("amount")),
            currency=money.get("currency") or saving_basis.get("currency") or "USD",
            stock_status=availability.get("type") or availability.get("message"),
            raw_payload=item,
        )


def _token_endpoint(version: str) -> str:
    try:
        return _TOKEN_ENDPOINTS[version]
    except KeyError as exc:
        raise RuntimeError(f"Unsupported Amazon Creators API credential version: {version}") from exc


def _authorization_header(access_token: str, version: str) -> str:
    if version.startswith("3."):
        return f"Bearer {access_token}"
    return f"Bearer {access_token}, Version {version}"


def _float(value: object) -> float | None:
    try:
        return float(value) if value is not None and value != "" else None
    except (TypeError, ValueError):
        return None
