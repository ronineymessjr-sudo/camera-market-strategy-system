from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any


@dataclass(slots=True)
class ProviderOffer:
    provider: str
    external_id: str
    title: str
    product_url: str | None = None
    seller_name: str | None = None
    list_price: float | None = None
    promotion_price: float | None = None
    coupon_amount: float | None = None
    commission_rate: float | None = None
    currency: str = "CNY"
    stock_status: str | None = None
    raw_payload: dict[str, Any] = field(default_factory=dict)
    captured_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    @property
    def effective_price(self) -> float | None:
        base = self.promotion_price if self.promotion_price is not None else self.list_price
        if base is None:
            return None
        discount = self.coupon_amount or 0
        return max(round(base - discount, 2), 0)


@dataclass(slots=True)
class ProviderSearchRequest:
    keyword: str
    page: int = 1
    page_size: int = 20
    sort: str | None = None
    min_price: float | None = None
    max_price: float | None = None


@dataclass(slots=True)
class ProviderSyncResult:
    provider: str
    request: ProviderSearchRequest
    offers: list[ProviderOffer]
    raw_response: dict[str, Any]
    request_id: str | None = None


class MarketplaceProvider(ABC):
    code: str
    display_name: str

    @abstractmethod
    def is_configured(self) -> bool:
        raise NotImplementedError

    @abstractmethod
    async def search(self, request: ProviderSearchRequest) -> ProviderSyncResult:
        raise NotImplementedError

    def status(self) -> dict[str, Any]:
        return {
            "provider": self.code,
            "display_name": self.display_name,
            "configured": self.is_configured(),
            "mode": "official_api",
        }
