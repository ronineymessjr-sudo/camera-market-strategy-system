from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base, LISTING_TABLE_NAME


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    brand: Mapped[str | None] = mapped_column(String(80))
    category: Mapped[str | None] = mapped_column(String(80))
    mount_type: Mapped[str | None] = mapped_column(String(80))
    sensor_format: Mapped[str | None] = mapped_column(String(80))
    priority: Mapped[int] = mapped_column(Integer, default=0)
    tags: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    listings: Mapped[list["PlatformListing"]] = relationship(back_populates="product", cascade="all, delete-orphan")


class PlatformListing(Base):
    __tablename__ = LISTING_TABLE_NAME
    __table_args__ = (UniqueConstraint("product_id", "url", name="uq_listing_product_url"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False, index=True)
    platform: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    seller_name: Mapped[str | None] = mapped_column(Text)
    seller_type: Mapped[str | None] = mapped_column(String(80))
    url: Mapped[str] = mapped_column(Text, nullable=False)
    sku_id: Mapped[str | None] = mapped_column(String(120))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    product: Mapped[Product] = relationship(back_populates="listings")


class PriceRecord(Base):
    __tablename__ = "price_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False, index=True)
    listing_id: Mapped[int | None] = mapped_column(ForeignKey(f"{LISTING_TABLE_NAME}.id"), index=True)
    platform: Mapped[str | None] = mapped_column(String(40), index=True)
    seller_name: Mapped[str | None] = mapped_column(Text)
    title: Mapped[str | None] = mapped_column(Text)

    list_price: Mapped[float | None] = mapped_column(Numeric(12, 2))
    promotion_price: Mapped[float | None] = mapped_column(Numeric(12, 2))
    checkout_price: Mapped[float | None] = mapped_column(Numeric(12, 2))
    coupon_text: Mapped[str | None] = mapped_column(Text)
    shipping_fee: Mapped[float | None] = mapped_column(Numeric(12, 2))

    stock_status: Mapped[str | None] = mapped_column(String(80))
    verification_status: Mapped[str] = mapped_column(String(80), default="UNVERIFIED", index=True)
    source_url: Mapped[str | None] = mapped_column(Text)
    screenshot_path: Mapped[str | None] = mapped_column(Text)

    raw_price_text: Mapped[str | None] = mapped_column(Text)
    raw_price_context: Mapped[str | None] = mapped_column(Text)
    currency: Mapped[str | None] = mapped_column(String(12))
    region: Mapped[str | None] = mapped_column(String(80))
    confidence_score: Mapped[float | None] = mapped_column(Float)
    extraction_method: Mapped[str | None] = mapped_column(String(80))
    needs_review: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    screenshot_hash: Mapped[str | None] = mapped_column(String(128))
    review_note: Mapped[str | None] = mapped_column(Text)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    valid_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    verified_by: Mapped[str | None] = mapped_column(String(80))

    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)


class Strategy(Base):
    __tablename__ = "strategies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_name: Mapped[str] = mapped_column(String(80), default="ronin", index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False, index=True)
    strategy_name: Mapped[str] = mapped_column(Text, nullable=False)
    trigger_price: Mapped[float | None] = mapped_column(Numeric(12, 2))
    strong_buy_price: Mapped[float | None] = mapped_column(Numeric(12, 2))
    watch_price: Mapped[float | None] = mapped_column(Numeric(12, 2))
    currency: Mapped[str] = mapped_column(String(12), default="CNY")
    mode: Mapped[str] = mapped_column(String(80), default="value_hunter")
    max_price_age_hours: Mapped[int] = mapped_column(Integer, default=24)
    near_target_pct: Mapped[float] = mapped_column(Float, default=5.0)
    notes: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Signal(Base):
    __tablename__ = "signals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False, index=True)
    strategy_id: Mapped[int | None] = mapped_column(ForeignKey("strategies.id"), index=True)
    price_record_id: Mapped[int | None] = mapped_column(ForeignKey("price_records.id"), index=True)
    signal_type: Mapped[str] = mapped_column(String(80), default="WAIT", index=True)
    reason_code: Mapped[str | None] = mapped_column(String(80), index=True)
    message: Mapped[str | None] = mapped_column(Text)
    triggered: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    is_current: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)


class DailyReport(Base):
    __tablename__ = "daily_reports"
    __table_args__ = (UniqueConstraint("report_date", name="uq_daily_report_date"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    report_date: Mapped[datetime] = mapped_column(Date, nullable=False, index=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    summary: Mapped[str | None] = mapped_column(Text)
    markdown_content: Mapped[str] = mapped_column(Text, nullable=False)
    chart_path: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class FlowRun(Base):
    __tablename__ = "flow_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    run_type: Mapped[str] = mapped_column(String(40), default="crawl_all")
    status: Mapped[str] = mapped_column(String(40), default="RUNNING", index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    duration_seconds: Mapped[float | None] = mapped_column(Float)
    total_count: Mapped[int] = mapped_column(Integer, default=0)
    success_count: Mapped[int] = mapped_column(Integer, default=0)
    failure_count: Mapped[int] = mapped_column(Integer, default=0)
    skipped_count: Mapped[int] = mapped_column(Integer, default=0)
    details_json: Mapped[str | None] = mapped_column(Text)
    log_path: Mapped[str | None] = mapped_column(Text)


class WatchlistCommandLog(Base):
    __tablename__ = "watchlist_command_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    command_text: Mapped[str] = mapped_column(Text, nullable=False)
    action: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    product_id: Mapped[int | None] = mapped_column(ForeignKey("products.id"), index=True)
    result_message: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)


class ExternalOffer(Base):
    __tablename__ = "external_offers"
    __table_args__ = (UniqueConstraint("provider", "external_id", "captured_at", name="uq_external_offer_snapshot"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    provider: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    external_id: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    product_id: Mapped[int | None] = mapped_column(ForeignKey("products.id"), index=True)
    listing_id: Mapped[int | None] = mapped_column(ForeignKey(f"{LISTING_TABLE_NAME}.id"), index=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    product_url: Mapped[str | None] = mapped_column(Text)
    seller_name: Mapped[str | None] = mapped_column(Text)
    list_price: Mapped[float | None] = mapped_column(Numeric(12, 2))
    promotion_price: Mapped[float | None] = mapped_column(Numeric(12, 2))
    coupon_amount: Mapped[float | None] = mapped_column(Numeric(12, 2))
    effective_price: Mapped[float | None] = mapped_column(Numeric(12, 2), index=True)
    commission_rate: Mapped[float | None] = mapped_column(Float)
    currency: Mapped[str] = mapped_column(String(12), default="CNY")
    stock_status: Mapped[str | None] = mapped_column(String(80))
    raw_payload_json: Mapped[str | None] = mapped_column(Text)
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)


class IntegrationRun(Base):
    __tablename__ = "integration_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    provider: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    keyword: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(40), default="RUNNING", index=True)
    request_id: Mapped[str | None] = mapped_column(String(160))
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    offer_count: Mapped[int] = mapped_column(Integer, default=0)
    ingested_count: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[str | None] = mapped_column(Text)
    request_json: Mapped[str | None] = mapped_column(Text)
    response_summary_json: Mapped[str | None] = mapped_column(Text)


class StrategyBacktest(Base):
    __tablename__ = "strategy_backtests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    strategy_id: Mapped[int | None] = mapped_column(ForeignKey("strategies.id"), index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False, index=True)
    window_days: Mapped[int] = mapped_column(Integer, default=180)
    series_type: Mapped[str] = mapped_column(String(80), default="VERIFIED_CHECKOUT")
    metrics_json: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
