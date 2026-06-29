from __future__ import annotations

import json
import time
from typing import Any

from app.config import settings

from .base import MarketplaceProvider, ProviderOffer, ProviderSearchRequest, ProviderSyncResult
from .http import post_form
from .signing import secret_wrapped_md5


class PddDdkProvider(MarketplaceProvider):
    code = "pdd"
    display_name = "多多进宝"

    def is_configured(self) -> bool:
        return bool(settings.pdd_client_id and settings.pdd_client_secret and settings.pdd_pid)

    async def search(self, request: ProviderSearchRequest) -> ProviderSyncResult:
        if not self.is_configured():
            raise RuntimeError("PDD provider is not configured")
        params: dict[str, Any] = {
            "type": settings.pdd_goods_search_method,
            "client_id": settings.pdd_client_id,
            "timestamp": int(time.time()),
            "data_type": "JSON",
            "keyword": request.keyword,
            "page": request.page,
            "page_size": request.page_size,
            "pid": settings.pdd_pid,
            "sort_type": request.sort,
            "range_list": json.dumps(_ranges(request), ensure_ascii=False) if request.min_price or request.max_price else None,
        }
        params = {key: value for key, value in params.items() if value is not None}
        params["sign"] = secret_wrapped_md5(params, settings.pdd_client_secret)
        raw = await post_form(settings.pdd_api_url, params)
        items = self._extract_items(raw)
        offers = [self._normalize(item) for item in items]
        return ProviderSyncResult(self.code, request, offers, raw, raw.get("request_id"))

    @staticmethod
    def _extract_items(raw: dict) -> list[dict]:
        response = raw.get("goods_search_response") or raw.get("pdd_ddk_goods_search_response") or raw
        items = response.get("goods_list") or response.get("list") or []
        return items if isinstance(items, list) else []

    def _normalize(self, item: dict) -> ProviderOffer:
        goods_id = str(item.get("goods_id") or item.get("id") or "")
        min_group = _fen(item.get("min_group_price"))
        min_normal = _fen(item.get("min_normal_price"))
        coupon = _fen(item.get("coupon_discount"))
        return ProviderOffer(
            provider=self.code,
            external_id=goods_id,
            title=str(item.get("goods_name") or goods_id),
            product_url=item.get("goods_url") or item.get("url"),
            seller_name=item.get("mall_name"),
            list_price=min_normal,
            promotion_price=min_group,
            coupon_amount=coupon,
            commission_rate=_float(item.get("promotion_rate")),
            raw_payload=item,
        )


def _ranges(request: ProviderSearchRequest) -> list[dict]:
    result: list[dict] = []
    if request.min_price is not None:
        result.append({"range_id": 0, "range_from": int(request.min_price * 100)})
    if request.max_price is not None:
        result.append({"range_id": 0, "range_to": int(request.max_price * 100)})
    return result


def _fen(value: object) -> float | None:
    try:
        return round(float(value) / 100, 2) if value is not None and value != "" else None
    except (TypeError, ValueError):
        return None


def _float(value: object) -> float | None:
    try:
        return float(value) if value is not None and value != "" else None
    except (TypeError, ValueError):
        return None
