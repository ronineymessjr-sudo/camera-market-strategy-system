from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class PriceExtraction:
    value: float | None
    raw_text: str | None
    context: str | None
    currency: str | None
    confidence: float
    method: str


@dataclass(slots=True)
class CrawlResult:
    title: str | None
    visible_price: float | None
    coupon_text: str | None
    seller_name: str | None
    stock_status: str | None
    screenshot_path: str | None
    screenshot_hash: str | None
    source_url: str
    verification_status: str
    raw_price_text: str | None
    raw_price_context: str | None
    currency: str | None
    region: str | None
    confidence_score: float
    extraction_method: str | None
    needs_review: bool
    error: str | None = None
