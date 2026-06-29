from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from app.config import settings

from .base import MarketplaceProvider, ProviderOffer, ProviderSearchRequest, ProviderSyncResult
from .http import post_form
from .signing import secret_wrapped_md5


class TaobaoAllianceProvider(MarketplaceProvider):
    code = "taobao"
    display_name = "淘宝联盟"

    def is_configured(self) -> bool:
        return bool(settings.taobao_app_key and settings.taobao_app_secret and settings.taobao_adzone_id)

    async def search(self, request: ProviderSearchRequest) -> ProviderSyncResult:
        if not self.is_configured():
            raise RuntimeError("Taobao provider is not configured")
        params: dict[str, Any] = {
            "method": settings.taobao_goods_search_method,
            "app_key": settings.taobao_app_key,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "format": "json",
            "v": "2.0",
            "sign_method": "md5",
            "q": request.keyword,
            "page_no": request.page,
            "page_size": request.page_size,
            "adzone_id": settings.taobao_adzone_id,
            "platform": 2,
            "sort": request.sort,
            "start_price": request.min_price,
            "end_price": request.max_price,
        }
        params["sign"] = secret_wrapped_md5(params, settings.taobao_app_secret)
        raw = await post_form(settings.taobao_api_url, params)
        items = self._extract_items(raw)
        offers = [self._normalize(item) for item in items]
        return ProviderSyncResult(self.code, request, offers, raw, raw.get("request_id"))

    @staticmethod
    def _extract_items(raw: dict) -> list[dict]:
        response = raw.get("tbk_dg_material_optional_response") or raw.get("tbk_dg_item_coupon_get_response") or raw
        result = response.get("result_list") or response.get("results") or {}
        if isinstance(result, dict):
            result = result.get("map_data") or result.get("n_tbk_item") or result.get("items") or []
        return result if isinstance(result, list) else []

    def _normalize(self, item: dict) -> ProviderOffer:
        item_id = str(item.get("item_id") or item.get("num_iid") or item.get("id") or "")
        reserve = _float(item.get("reserve_price"))
        zk = _float(item.get("zk_final_price") or item.get("final_price"))
        coupon = _float(item.get("coupon_amount"))
        return ProviderOffer(
            provider=self.code,
            external_id=item_id,
            title=str(item.get("title") or item_id),
            product_url=item.get("item_url") or item.get("url"),
            seller_name=item.get("shop_title") or item.get("nick"),
            list_price=reserve,
            promotion_price=zk,
            coupon_amount=coupon,
            commission_rate=_float(item.get("commission_rate")),
            raw_payload=item,
        )


def _float(value: object) -> float | None:
    try:
        if value is None or value == "":
            return None
        number = float(value)
        return number / 100 if number > 10000 and isinstance(value, str) else number
    except (TypeError, ValueError):
        return None
