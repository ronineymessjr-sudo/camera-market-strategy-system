from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from app.config import settings

from .base import MarketplaceProvider, ProviderOffer, ProviderSearchRequest, ProviderSyncResult
from .http import post_form
from .signing import secret_wrapped_md5


class JDUnionProvider(MarketplaceProvider):
    code = "jd"
    display_name = "京东联盟"

    def is_configured(self) -> bool:
        return bool(settings.jd_app_key and settings.jd_app_secret and settings.jd_union_id)

    async def search(self, request: ProviderSearchRequest) -> ProviderSyncResult:
        if not self.is_configured():
            raise RuntimeError("JD provider is not configured")
        payload = {
            "goodsReq": {
                "keyword": request.keyword,
                "pageIndex": request.page,
                "pageSize": request.page_size,
                "pricefrom": request.min_price,
                "priceto": request.max_price,
            }
        }
        params: dict[str, Any] = {
            "method": settings.jd_goods_query_method,
            "app_key": settings.jd_app_key,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "format": "json",
            "v": "1.0",
            "sign_method": "md5",
            "360buy_param_json": json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        }
        params["sign"] = secret_wrapped_md5(params, settings.jd_app_secret)
        raw = await post_form(settings.jd_api_url, params)
        items = self._extract_items(raw)
        offers = [self._normalize(item) for item in items]
        return ProviderSyncResult(self.code, request, offers, raw, self._request_id(raw))

    @staticmethod
    def _request_id(raw: dict) -> str | None:
        return raw.get("request_id") or raw.get("requestId")

    @staticmethod
    def _extract_items(raw: dict) -> list[dict]:
        root = raw
        for key in ("jd_union_open_goods_query_response", "jd_union_open_goods_query_responce"):
            if key in raw:
                root = raw[key]
        data = root.get("result", root.get("data", root))
        if isinstance(data, str):
            try:
                data = json.loads(data)
            except json.JSONDecodeError:
                return []
        if isinstance(data, dict):
            data = data.get("data", data.get("goodsList", data.get("list", [])))
        return data if isinstance(data, list) else []

    def _normalize(self, item: dict) -> ProviderOffer:
        price_info = item.get("priceInfo") or item.get("price_info") or {}
        coupon_info = item.get("couponInfo") or item.get("coupon_info") or {}
        commission_info = item.get("commissionInfo") or item.get("commission_info") or {}
        sku_id = str(item.get("skuId") or item.get("sku_id") or item.get("id") or "")
        list_price = _float(price_info.get("price") or item.get("price"))
        promotion_price = _float(price_info.get("lowestPrice") or item.get("lowestPrice") or list_price)
        coupon_amount = _float(coupon_info.get("discount") or item.get("couponAmount"))
        return ProviderOffer(
            provider=self.code,
            external_id=sku_id,
            title=str(item.get("skuName") or item.get("title") or sku_id),
            product_url=item.get("materialUrl") or item.get("url"),
            seller_name=item.get("shopName") or item.get("owner"),
            list_price=list_price,
            promotion_price=promotion_price,
            coupon_amount=coupon_amount,
            commission_rate=_float(commission_info.get("commissionShare") or item.get("commissionRate")),
            raw_payload=item,
        )


def _float(value: object) -> float | None:
    try:
        return float(value) if value is not None and value != "" else None
    except (TypeError, ValueError):
        return None
