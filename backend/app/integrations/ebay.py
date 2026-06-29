from __future__ import annotations

import base64
from typing import Any

import httpx

from app.config import settings

from .base import MarketplaceProvider, ProviderOffer, ProviderSearchRequest, ProviderSyncResult


class EbayBrowseProvider(MarketplaceProvider):
    code = "ebay"
    display_name = "eBay Browse API"

    def is_configured(self) -> bool:
        return bool(settings.ebay_client_id and settings.ebay_client_secret)

    async def search(self, request: ProviderSearchRequest) -> ProviderSyncResult:
        if not self.is_configured():
            raise RuntimeError("eBay provider is not configured")
        token = await self._access_token()
        params: dict[str, Any] = {
            "q": request.keyword,
            "limit": min(request.page_size, 200),
            "offset": max(request.page - 1, 0) * request.page_size,
        }
        filters = []
        if request.min_price is not None or request.max_price is not None:
            lower = "" if request.min_price is None else str(request.min_price)
            upper = "" if request.max_price is None else str(request.max_price)
            filters.append(f"price:[{lower}..{upper}]")
            filters.append("priceCurrency:USD")
        if filters:
            params["filter"] = ",".join(filters)

        async with httpx.AsyncClient(timeout=settings.integration_timeout_seconds, follow_redirects=True) as client:
            response = await client.get(
                f"{settings.ebay_api_url.rstrip('/')}/buy/browse/v1/item_summary/search",
                params=params,
                headers={
                    "Authorization": f"Bearer {token}",
                    "X-EBAY-C-MARKETPLACE-ID": settings.ebay_marketplace_id,
                },
            )
            response.raise_for_status()
            raw = response.json()
        items = raw.get("itemSummaries") or []
        offers = [self._normalize(item) for item in items]
        return ProviderSyncResult(self.code, request, offers, raw, raw.get("href"))

    async def _access_token(self) -> str:
        credentials = f"{settings.ebay_client_id}:{settings.ebay_client_secret}".encode()
        basic = base64.b64encode(credentials).decode()
        async with httpx.AsyncClient(timeout=settings.integration_timeout_seconds) as client:
            response = await client.post(
                f"{settings.ebay_api_url.rstrip('/')}/identity/v1/oauth2/token",
                data={
                    "grant_type": "client_credentials",
                    "scope": "https://api.ebay.com/oauth/api_scope",
                },
                headers={
                    "Authorization": f"Basic {basic}",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            )
            response.raise_for_status()
            data = response.json()
        return str(data["access_token"])

    def _normalize(self, item: dict) -> ProviderOffer:
        price = item.get("price") or {}
        seller = item.get("seller") or {}
        return ProviderOffer(
            provider=self.code,
            external_id=str(item.get("itemId") or ""),
            title=str(item.get("title") or item.get("itemId") or ""),
            product_url=item.get("itemWebUrl"),
            seller_name=seller.get("username"),
            list_price=_float(price.get("value")),
            promotion_price=_float(price.get("value")),
            currency=price.get("currency") or "USD",
            stock_status=item.get("itemAvailabilityStatus") or item.get("buyingOptions", [None])[0],
            raw_payload=item,
        )


def _float(value: object) -> float | None:
    try:
        return float(value) if value is not None and value != "" else None
    except (TypeError, ValueError):
        return None
