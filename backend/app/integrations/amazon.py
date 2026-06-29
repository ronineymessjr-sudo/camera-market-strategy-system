from __future__ import annotations

import datetime as dt
import hashlib
import hmac
import json
from typing import Any

import httpx

from app.config import settings

from .base import MarketplaceProvider, ProviderOffer, ProviderSearchRequest, ProviderSyncResult


class AmazonProductProvider(MarketplaceProvider):
    code = "amazon"
    display_name = "Amazon Product API"

    def is_configured(self) -> bool:
        return bool(settings.amazon_access_key and settings.amazon_secret_key and settings.amazon_partner_tag)

    async def search(self, request: ProviderSearchRequest) -> ProviderSyncResult:
        if not self.is_configured():
            raise RuntimeError("Amazon provider is not configured")
        payload = {
            "Keywords": request.keyword,
            "ItemCount": min(request.page_size, 10),
            "ItemPage": request.page,
            "PartnerTag": settings.amazon_partner_tag,
            "PartnerType": settings.amazon_partner_type,
            "Resources": [
                "Images.Primary.Medium",
                "ItemInfo.Title",
                "Offers.Listings.Price",
                "Offers.Listings.SavingBasis",
            ],
        }
        raw_body = json.dumps(payload, separators=(",", ":"), ensure_ascii=False)
        headers = _signed_headers(raw_body)
        async with httpx.AsyncClient(timeout=settings.integration_timeout_seconds, follow_redirects=True) as client:
            response = await client.post(
                f"https://{settings.amazon_paapi_host}/paapi5/searchitems",
                content=raw_body.encode("utf-8"),
                headers=headers,
            )
            response.raise_for_status()
            raw = response.json()
        items = (raw.get("SearchResult") or {}).get("Items") or []
        offers = [self._normalize(item) for item in items]
        return ProviderSyncResult(self.code, request, offers, raw, raw.get("RequestId"))

    def _normalize(self, item: dict) -> ProviderOffer:
        listing = (((item.get("Offers") or {}).get("Listings") or []) + [{}])[0]
        price = listing.get("Price") or {}
        saving_basis = listing.get("SavingBasis") or {}
        title = (((item.get("ItemInfo") or {}).get("Title") or {}).get("DisplayValue"))
        return ProviderOffer(
            provider=self.code,
            external_id=str(item.get("ASIN") or ""),
            title=str(title or item.get("ASIN") or ""),
            product_url=item.get("DetailPageURL"),
            seller_name="Amazon",
            list_price=_float(saving_basis.get("Amount")) or _float(price.get("Amount")),
            promotion_price=_float(price.get("Amount")),
            currency=price.get("Currency") or "USD",
            stock_status=(listing.get("Availability") or {}).get("Type"),
            raw_payload=item,
        )


def _signed_headers(raw_body: str) -> dict[str, str]:
    now = dt.datetime.now(dt.timezone.utc)
    amz_date = now.strftime("%Y%m%dT%H%M%SZ")
    date_stamp = now.strftime("%Y%m%d")
    host = settings.amazon_paapi_host
    target = "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems"
    content_type = "application/json; charset=utf-8"

    canonical_headers = (
        f"content-encoding:amz-1.0\n"
        f"content-type:{content_type}\n"
        f"host:{host}\n"
        f"x-amz-date:{amz_date}\n"
        f"x-amz-target:{target}\n"
    )
    signed_headers = "content-encoding;content-type;host;x-amz-date;x-amz-target"
    payload_hash = hashlib.sha256(raw_body.encode("utf-8")).hexdigest()
    canonical_request = "\n".join([
        "POST",
        "/paapi5/searchitems",
        "",
        canonical_headers,
        signed_headers,
        payload_hash,
    ])
    credential_scope = f"{date_stamp}/{settings.amazon_paapi_region}/ProductAdvertisingAPI/aws4_request"
    string_to_sign = "\n".join([
        "AWS4-HMAC-SHA256",
        amz_date,
        credential_scope,
        hashlib.sha256(canonical_request.encode("utf-8")).hexdigest(),
    ])
    signing_key = _signature_key(settings.amazon_secret_key or "", date_stamp, settings.amazon_paapi_region, "ProductAdvertisingAPI")
    signature = hmac.new(signing_key, string_to_sign.encode("utf-8"), hashlib.sha256).hexdigest()
    authorization = (
        f"AWS4-HMAC-SHA256 Credential={settings.amazon_access_key}/{credential_scope}, "
        f"SignedHeaders={signed_headers}, Signature={signature}"
    )
    return {
        "Content-Encoding": "amz-1.0",
        "Content-Type": content_type,
        "Host": host,
        "X-Amz-Date": amz_date,
        "X-Amz-Target": target,
        "Authorization": authorization,
    }


def _signature_key(key: str, date_stamp: str, region_name: str, service_name: str) -> bytes:
    k_date = hmac.new(("AWS4" + key).encode("utf-8"), date_stamp.encode("utf-8"), hashlib.sha256).digest()
    k_region = hmac.new(k_date, region_name.encode("utf-8"), hashlib.sha256).digest()
    k_service = hmac.new(k_region, service_name.encode("utf-8"), hashlib.sha256).digest()
    return hmac.new(k_service, b"aws4_request", hashlib.sha256).digest()


def _float(value: object) -> float | None:
    try:
        return float(value) if value is not None and value != "" else None
    except (TypeError, ValueError):
        return None
