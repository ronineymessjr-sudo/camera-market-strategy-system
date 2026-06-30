from __future__ import annotations

import asyncio
import json
import time
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from playwright.async_api import async_playwright
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app import models
from app.config import settings
from app.crawler.base import CrawlResult
from app.crawler.generic import crawl_page_with_browser, screenshot_filename


LOG_DIR = Path(__file__).resolve().parents[3] / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)
DEFAULT_PLATFORM_LIMITS = {"taobao": 2, "pdd": 2, "jd": 4, "generic": 6}


@dataclass(slots=True)
class ListingSnapshot:
    id: int
    product_id: int
    platform: str
    seller_name: str | None
    url: str


@dataclass(slots=True)
class CrawlFailure:
    listing_id: int
    url: str
    error: str


@dataclass(slots=True)
class CrawlBatchResult:
    run: models.FlowRun
    records: list[models.PriceRecord]
    failures: list[dict[str, Any]]
    skipped_listing_ids: list[int]


async def crawl_listing_snapshot(browser, listing: ListingSnapshot, semaphore: asyncio.Semaphore) -> tuple[ListingSnapshot, CrawlResult]:
    async with semaphore:
        last_error: Exception | None = None
        for attempt in range(settings.crawler_retries + 1):
            try:
                result = await crawl_page_with_browser(
                    browser,
                    listing.url,
                    screenshot_filename(listing.id),
                    timeout_ms=settings.crawler_timeout_ms,
                )
                return listing, result
            except Exception as exc:
                last_error = exc
                if attempt < settings.crawler_retries:
                    await asyncio.sleep(min(2 ** attempt, 5))
        assert last_error is not None
        return listing, CrawlResult(
            title=None,
            visible_price=None,
            coupon_text=None,
            seller_name=listing.seller_name,
            stock_status="CRAWL_ERROR",
            screenshot_path=None,
            screenshot_hash=None,
            source_url=listing.url,
            verification_status="UNVERIFIED",
            raw_price_text=None,
            raw_price_context=f"{type(last_error).__name__}: {last_error}"[:1200],
            currency=None,
            region=None,
            confidence_score=0.0,
            extraction_method="error",
            needs_review=True,
            error=str(last_error),
        )


def _platform_key(platform: str | None) -> str:
    normalized = (platform or "generic").strip().lower()
    if "taobao" in normalized or "tmall" in normalized:
        return "taobao"
    if "pdd" in normalized or "pinduoduo" in normalized:
        return "pdd"
    if normalized in {"jd", "jingdong"} or "jd.com" in normalized:
        return "jd"
    return "generic"


def _platform_limits() -> dict[str, int]:
    limits = DEFAULT_PLATFORM_LIMITS.copy()
    for item in settings.crawler_platform_concurrency.split(","):
        if ":" not in item:
            continue
        key, value = item.split(":", 1)
        key = key.strip().lower()
        try:
            limit = int(value.strip())
        except ValueError:
            continue
        if key and limit > 0:
            limits[key] = limit
    return limits


async def run_crawl_batch(
    db: Session,
    *,
    product_id: int | None = None,
    platform: str | None = None,
    force: bool = False,
    concurrency: int | None = None,
    min_interval_minutes: int | None = None,
) -> CrawlBatchResult:
    concurrency = max(1, min(concurrency or settings.crawler_concurrency, 8))
    min_interval_minutes = settings.crawler_min_interval_minutes if min_interval_minutes is None else max(0, min_interval_minutes)

    query = (
        db.query(models.PlatformListing)
        .join(models.Product, models.Product.id == models.PlatformListing.product_id)
        .filter(
            models.PlatformListing.is_active.is_(True),
            models.Product.is_active.is_(True),
        )
    )
    if product_id is not None:
        query = query.filter(models.PlatformListing.product_id == product_id)
    if platform:
        query = query.filter(models.PlatformListing.platform == platform)
    listings = query.order_by(models.PlatformListing.id).all()

    run = models.FlowRun(run_type="crawl_all", status="RUNNING", total_count=len(listings))
    db.add(run)
    db.commit()
    db.refresh(run)

    started = time.perf_counter()
    snapshots: list[ListingSnapshot] = []
    skipped: list[int] = []
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=min_interval_minutes)

    for listing in listings:
        if not force:
            latest = (
                db.query(models.PriceRecord)
                .filter(models.PriceRecord.listing_id == listing.id)
                .order_by(desc(models.PriceRecord.captured_at), desc(models.PriceRecord.id))
                .first()
            )
            if latest and latest.captured_at:
                captured_at = latest.captured_at
                if captured_at.tzinfo is None:
                    captured_at = captured_at.replace(tzinfo=timezone.utc)
                if captured_at >= cutoff:
                    skipped.append(listing.id)
                    continue
        snapshots.append(ListingSnapshot(listing.id, listing.product_id, listing.platform, listing.seller_name, listing.url))

    global_semaphore = asyncio.Semaphore(concurrency)
    platform_semaphores = {
        key: asyncio.Semaphore(max(1, min(limit, concurrency)))
        for key, limit in _platform_limits().items()
    }

    async def crawl_with_limits(listing: ListingSnapshot) -> tuple[ListingSnapshot, CrawlResult]:
        platform_key = _platform_key(listing.platform)
        platform_semaphore = platform_semaphores.get(platform_key, platform_semaphores["generic"])
        async with global_semaphore:
            return await crawl_listing_snapshot(browser, listing, platform_semaphore)

    if snapshots:
        async with async_playwright() as playwright:
            browser = await playwright.chromium.launch(headless=settings.crawler_headless)
            try:
                results = await asyncio.gather(
                    *(crawl_with_limits(listing) for listing in snapshots),
                    return_exceptions=False,
                )
            finally:
                await browser.close()
    else:
        results = []

    records: list[models.PriceRecord] = []
    failures: list[dict[str, Any]] = []
    log_items: list[dict[str, Any]] = []

    for listing, result in results:
        record = models.PriceRecord(
            product_id=listing.product_id,
            listing_id=listing.id,
            platform=listing.platform,
            seller_name=result.seller_name or listing.seller_name,
            title=result.title,
            list_price=result.visible_price,
            promotion_price=result.visible_price,
            checkout_price=None,
            coupon_text=result.coupon_text,
            stock_status=result.stock_status,
            verification_status=result.verification_status,
            source_url=result.source_url,
            screenshot_path=result.screenshot_path,
            raw_price_text=result.raw_price_text,
            raw_price_context=result.raw_price_context,
            currency=result.currency,
            region=result.region,
            confidence_score=result.confidence_score,
            extraction_method=result.extraction_method,
            needs_review=result.needs_review,
            screenshot_hash=result.screenshot_hash,
        )
        db.add(record)
        db.flush()
        records.append(record)
        if result.error:
            failures.append({"listing_id": listing.id, "url": listing.url, "error": result.error})
        log_items.append({"listing": asdict(listing), "result": asdict(result), "price_record_id": record.id})

    duration = round(time.perf_counter() - started, 3)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    log_path = LOG_DIR / f"crawl_run_{run.id}_{timestamp}.json"
    log_payload = {
        "run_id": run.id,
        "duration_seconds": duration,
        "concurrency": concurrency,
        "platform_concurrency": _platform_limits(),
        "skipped_listing_ids": skipped,
        "failures": failures,
        "items": log_items,
    }
    log_path.write_text(json.dumps(log_payload, ensure_ascii=False, indent=2), encoding="utf-8")

    run.status = "SUCCESS" if not failures else ("PARTIAL" if records else "FAILED")
    run.finished_at = datetime.now(timezone.utc)
    run.duration_seconds = duration
    run.success_count = len(records) - len(failures)
    run.failure_count = len(failures)
    run.skipped_count = len(skipped)
    run.details_json = json.dumps(
        {
            "concurrency": concurrency,
            "platform_concurrency": _platform_limits(),
            "record_ids": [record.id for record in records],
            "failures": failures,
        },
        ensure_ascii=False,
    )
    run.log_path = str(log_path)
    db.commit()
    for record in records:
        db.refresh(record)
    db.refresh(run)
    return CrawlBatchResult(run=run, records=records, failures=failures, skipped_listing_ids=skipped)
