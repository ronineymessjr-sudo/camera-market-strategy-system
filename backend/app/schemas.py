from __future__ import annotations

from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ProductBase(BaseModel):
    name: str
    brand: str | None = None
    category: str | None = None
    mount_type: str | None = None
    sensor_format: str | None = None
    priority: int = 0
    tags: str | None = None
    notes: str | None = None
    is_active: bool = True


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: str | None = None
    brand: str | None = None
    category: str | None = None
    mount_type: str | None = None
    sensor_format: str | None = None
    priority: int | None = None
    tags: str | None = None
    notes: str | None = None
    is_active: bool | None = None


class ProductOut(ProductBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    archived_at: datetime | None = None
    created_at: datetime


class ListingCreate(BaseModel):
    product_id: int | None = None
    platform: str
    seller_name: str | None = None
    seller_type: str | None = None
    url: str
    sku_id: str | None = None
    is_active: bool = True


class ListingUpdate(BaseModel):
    platform: str | None = None
    seller_name: str | None = None
    seller_type: str | None = None
    url: str | None = None
    sku_id: str | None = None
    is_active: bool | None = None


class ListingOut(ListingCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    product_id: int
    created_at: datetime


class PriceCreate(BaseModel):
    product_id: int
    listing_id: int | None = None
    platform: str | None = None
    seller_name: str | None = None
    title: str | None = None
    list_price: float | None = None
    promotion_price: float | None = None
    checkout_price: float | None = None
    coupon_text: str | None = None
    shipping_fee: float | None = None
    stock_status: str | None = None
    verification_status: str = "UNVERIFIED"
    source_url: str | None = None
    screenshot_path: str | None = None
    raw_price_text: str | None = None
    raw_price_context: str | None = None
    currency: str | None = None
    region: str | None = None
    confidence_score: float | None = Field(default=None, ge=0, le=1)
    extraction_method: str | None = None
    needs_review: bool = True
    screenshot_hash: str | None = None
    review_note: str | None = None
    verified_by: str | None = None
    valid_until: datetime | None = None

    @model_validator(mode="after")
    def validate_verified_checkout(self):
        if self.verification_status == "VERIFIED_CHECKOUT" and self.checkout_price is None:
            raise ValueError("VERIFIED_CHECKOUT requires checkout_price")
        return self


class PriceOut(PriceCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    verified_at: datetime | None = None
    captured_at: datetime


class VerifyCheckoutRequest(BaseModel):
    checkout_price: float = Field(gt=0)
    note: str = Field(min_length=2, max_length=2000)
    currency: str = "CNY"
    region: str = "CN"
    shipping_fee: float | None = Field(default=None, ge=0)
    coupon_text: str | None = None
    verified_by: str = "ronin"
    valid_for_hours: int = Field(default=24, ge=1, le=720)


class InvalidatePriceRequest(BaseModel):
    note: str = Field(min_length=2, max_length=2000)


class StrategyCreate(BaseModel):
    user_name: str = "ronin"
    product_id: int
    strategy_name: str
    trigger_price: float | None = None
    strong_buy_price: float | None = None
    watch_price: float | None = None
    currency: str = "CNY"
    mode: str = "value_hunter"
    max_price_age_hours: int = Field(default=24, ge=1, le=720)
    near_target_pct: float = Field(default=5.0, ge=0, le=100)
    notes: str | None = None
    is_active: bool = True


class StrategyUpdate(BaseModel):
    strategy_name: str | None = None
    trigger_price: float | None = None
    strong_buy_price: float | None = None
    watch_price: float | None = None
    currency: str | None = None
    mode: str | None = None
    max_price_age_hours: int | None = Field(default=None, ge=1, le=720)
    near_target_pct: float | None = Field(default=None, ge=0, le=100)
    notes: str | None = None
    is_active: bool | None = None


class StrategyOut(StrategyCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime


class SignalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    product_id: int
    strategy_id: int | None
    price_record_id: int | None
    signal_type: str
    reason_code: str | None = None
    message: str | None
    triggered: bool
    is_current: bool = True
    created_at: datetime


class DailyReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    report_date: date
    title: str
    summary: str | None
    markdown_content: str
    chart_path: str | None
    created_at: datetime
    updated_at: datetime | None = None


class PriceAnalyticsOut(BaseModel):
    product_id: int
    window_days: int
    series_type: str
    currency: str | None = None
    sample_count: int
    is_sufficient: bool
    latest_price: float | None = None
    min_price: float | None = None
    max_price: float | None = None
    median_price: float | None = None
    mean_price: float | None = None
    range_pct: float | None = None
    volatility_pct: float | None = None
    change_pct: float | None = None
    latest_percentile: float | None = None
    anomaly_score: float | None = None
    trend: str = "INSUFFICIENT_DATA"
    updated_at: datetime | None = None


class SelectionCandidateOut(BaseModel):
    product: ProductOut
    strategy: StrategyOut | None = None
    latest_verified: PriceOut | None = None
    latest_clue: PriceOut | None = None
    analytics: PriceAnalyticsOut
    score: float
    status: str
    is_buy_signal: bool
    reasons: list[str]


class ProductOverviewOut(BaseModel):
    product: ProductOut
    latest_any: PriceOut | None = None
    latest_verified: PriceOut | None = None
    latest_fresh_verified: PriceOut | None = None
    latest_clue: PriceOut | None = None
    latest_signal: SignalOut | None = None
    recent_prices: list[PriceOut] = []
    active_listing_count: int = 0
    analytics: PriceAnalyticsOut | None = None


class FlowRunOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    run_type: str
    status: str
    started_at: datetime
    finished_at: datetime | None
    duration_seconds: float | None
    total_count: int
    success_count: int
    failure_count: int
    skipped_count: int
    details_json: str | None
    log_path: str | None


class CrawlAllResponse(BaseModel):
    run: FlowRunOut
    records: list[PriceOut]
    failures: list[dict[str, Any]]
    skipped_listing_ids: list[int]


class PriceStatsOut(BaseModel):
    total: int
    verified_checkout: int
    visible_price: int
    unverified: int
    invalid: int
    needs_review: int


class WatchlistCommandRequest(BaseModel):
    command: str = Field(min_length=2, max_length=2000)


class WatchlistCommandResponse(BaseModel):
    action: str
    message: str
    product: ProductOut | None = None
    strategy: StrategyOut | None = None
    listing: ListingOut | None = None

class ProviderStatusOut(BaseModel):
    provider: str
    display_name: str
    configured: bool
    mode: str


class IntegrationSearchRequest(BaseModel):
    keyword: str = Field(min_length=1, max_length=200)
    product_id: int | None = None
    page: int = Field(default=1, ge=1, le=1000)
    page_size: int = Field(default=20, ge=1, le=100)
    sort: str | None = None
    min_price: float | None = Field(default=None, ge=0)
    max_price: float | None = Field(default=None, ge=0)
    ingest: bool = True


class ExternalOfferOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    provider: str
    external_id: str
    product_id: int | None
    listing_id: int | None
    title: str
    product_url: str | None
    seller_name: str | None
    list_price: float | None
    promotion_price: float | None
    coupon_amount: float | None
    effective_price: float | None
    commission_rate: float | None
    currency: str
    stock_status: str | None
    captured_at: datetime
    expires_at: datetime | None


class IntegrationRunOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    provider: str
    keyword: str | None
    status: str
    request_id: str | None
    started_at: datetime
    finished_at: datetime | None
    offer_count: int
    ingested_count: int
    error_message: str | None
    request_json: str | None
    response_summary_json: str | None


class IntegrationSyncResponse(BaseModel):
    run: IntegrationRunOut
    offers: list[ExternalOfferOut]
    price_record_ids: list[int] = []


class QuantIndicatorsOut(BaseModel):
    product_id: int
    window_days: int
    currency: str
    series_type: str
    sample_count: int
    latest_price: float | None = None
    sma_short: float | None = None
    sma_long: float | None = None
    ema_short: float | None = None
    ema_long: float | None = None
    rsi_14: float | None = None
    bollinger_mid: float | None = None
    bollinger_upper: float | None = None
    bollinger_lower: float | None = None
    z_score: float | None = None
    max_drawdown_pct: float | None = None
    downside_deviation_pct: float | None = None
    price_percentile: float | None = None
    market_regime: str = "INSUFFICIENT_DATA"
    risk_level: str = "UNKNOWN"


class BacktestRequest(BaseModel):
    product_id: int
    strategy_id: int | None = None
    trigger_price: float | None = Field(default=None, gt=0)
    strong_buy_price: float | None = Field(default=None, gt=0)
    window_days: int = Field(default=180, ge=7, le=3650)
    currency: str = "CNY"
    include_visible_prices: bool = False


class BacktestOut(BaseModel):
    product_id: int
    strategy_id: int | None = None
    window_days: int
    series_type: str
    observation_count: int
    trigger_count: int
    strong_trigger_count: int
    first_trigger_at: datetime | None = None
    latest_trigger_at: datetime | None = None
    lowest_price: float | None = None
    median_price: float | None = None
    average_trigger_price: float | None = None
    savings_vs_median_pct: float | None = None
    missed_low_gap_pct: float | None = None
    max_drawdown_pct: float | None = None
    volatility_pct: float | None = None
    trigger_rate_pct: float | None = None
    verdict: str
    events: list[dict[str, Any]] = []


class FrontendBootstrapOut(BaseModel):
    generated_at: datetime
    providers: list[ProviderStatusOut]
    price_stats: PriceStatsOut
    latest_run: FlowRunOut | None = None
    integration_runs: list[IntegrationRunOut] = []
    selection_candidates: list[SelectionCandidateOut] = []
    products: list[ProductOverviewOut] = []
