from __future__ import annotations

import csv
import io
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import OperatorIdentity, require_operator
from app.crawler.generic import crawl_generic_page, screenshot_filename
from app.concurrency_guard import BusyError, GLOBAL_LOCKS
from app.database import get_db
from app.routers.products import invalidate_product_snapshot
from app.services.crawler_runner import run_crawl_batch
from app.services.evidence_service import replace_price_evidence
from app.services.scheduler import scheduler_status, start_scheduler, stop_scheduler
from app.services.signal_service import refresh_signals_for_product


router = APIRouter(prefix="/api/prices", tags=["prices"])


@router.post("", response_model=schemas.PriceOut, status_code=201, dependencies=[Depends(require_operator)])
def create_price(payload: schemas.PriceCreate, db: Session = Depends(get_db)):
    if not db.get(models.Product, payload.product_id):
        raise HTTPException(404, "Product not found")
    if payload.verification_status == "VERIFIED_CHECKOUT":
        raise HTTPException(422, "Use verify-checkout to create VERIFIED_CHECKOUT records")
    item = models.PriceRecord(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    invalidate_product_snapshot(item.product_id)
    return item


@router.get("/latest", response_model=list[schemas.PriceOut])
def latest_prices(limit: int = Query(50, ge=1, le=500), db: Session = Depends(get_db)):
    return db.query(models.PriceRecord).order_by(desc(models.PriceRecord.captured_at), desc(models.PriceRecord.id)).limit(limit).all()


@router.get("/stats", response_model=schemas.PriceStatsOut)
def price_stats(db: Session = Depends(get_db)):
    counts = dict(
        db.query(models.PriceRecord.verification_status, func.count(models.PriceRecord.id))
        .group_by(models.PriceRecord.verification_status)
        .all()
    )
    return schemas.PriceStatsOut(
        total=sum(counts.values()),
        verified_checkout=counts.get("VERIFIED_CHECKOUT", 0),
        visible_price=counts.get("VISIBLE_PRICE", 0),
        unverified=counts.get("UNVERIFIED", 0),
        invalid=counts.get("INVALID", 0),
        needs_review=db.query(models.PriceRecord).filter(models.PriceRecord.needs_review.is_(True)).count(),
    )


@router.get("/export.csv", dependencies=[Depends(require_operator)])
def export_prices(
    status: str = Query(default="all", pattern="^(all|verified|triggered|invalid|review)$"),
    limit: int = Query(default=10000, ge=1, le=50000),
    db: Session = Depends(get_db),
):
    query = db.query(models.PriceRecord)
    if status == "verified":
        query = query.filter(models.PriceRecord.verification_status == "VERIFIED_CHECKOUT")
    elif status == "invalid":
        query = query.filter(models.PriceRecord.verification_status == "INVALID")
    elif status == "review":
        query = query.filter(models.PriceRecord.needs_review.is_(True))
    elif status == "triggered":
        triggered_ids = db.query(models.Signal.price_record_id).filter(
            models.Signal.price_record_id.is_not(None),
            models.Signal.triggered.is_(True),
        )
        query = query.filter(models.PriceRecord.id.in_(triggered_ids))

    rows = query.order_by(desc(models.PriceRecord.captured_at), desc(models.PriceRecord.id)).limit(limit).all()
    product_ids = {row.product_id for row in rows}
    products = {
        product.id: product.name
        for product in db.query(models.Product).filter(models.Product.id.in_(product_ids)).all()
    } if product_ids else {}
    triggered_price_ids = {
        price_id
        for (price_id,) in db.query(models.Signal.price_record_id).filter(
            models.Signal.price_record_id.in_([row.id for row in rows]),
            models.Signal.triggered.is_(True),
        ).all()
    } if rows else set()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "price_record_id", "captured_at", "product_id", "product_name", "listing_id",
        "platform", "seller_name", "title", "list_price", "promotion_price", "checkout_price",
        "shipping_fee", "currency", "verification_status", "confidence_score", "needs_review",
        "strategy_triggered", "source_url", "screenshot_hash", "verified_at", "valid_until", "verified_by",
    ])
    for row in rows:
        writer.writerow([
            row.id, row.captured_at.isoformat() if row.captured_at else "", row.product_id,
            products.get(row.product_id, ""), row.listing_id or "", row.platform or "", row.seller_name or "",
            row.title or "", row.list_price or "", row.promotion_price or "", row.checkout_price or "",
            row.shipping_fee or "", row.currency or "", row.verification_status, row.confidence_score or "",
            row.needs_review, row.id in triggered_price_ids, row.source_url or "", row.screenshot_hash or "",
            row.verified_at.isoformat() if row.verified_at else "",
            row.valid_until.isoformat() if row.valid_until else "", row.verified_by or "",
        ])

    payload = "\ufeff" + output.getvalue()
    return StreamingResponse(
        iter([payload]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="price-history-{status}.csv"'},
    )


@router.get("/review-queue", response_model=list[schemas.PriceOut])
def review_queue(limit: int = Query(50, ge=1, le=200), db: Session = Depends(get_db)):
    return (
        db.query(models.PriceRecord)
        .filter(
            models.PriceRecord.needs_review.is_(True),
            models.PriceRecord.verification_status.in_(["VISIBLE_PRICE", "UNVERIFIED"]),
        )
        .order_by(desc(models.PriceRecord.confidence_score), desc(models.PriceRecord.captured_at), desc(models.PriceRecord.id))
        .limit(limit)
        .all()
    )


@router.get("/product/{product_id}", response_model=list[schemas.PriceOut])
def product_prices(product_id: int, limit: int = Query(100, ge=1, le=500), db: Session = Depends(get_db)):
    if not db.get(models.Product, product_id):
        raise HTTPException(404, "Product not found")
    return (
        db.query(models.PriceRecord)
        .filter(models.PriceRecord.product_id == product_id)
        .order_by(desc(models.PriceRecord.captured_at), desc(models.PriceRecord.id))
        .limit(limit)
        .all()
    )


@router.get("/{price_id}/evidence", response_model=list[schemas.PriceEvidenceOut])
def price_evidence(price_id: int, db: Session = Depends(get_db)):
    if not db.get(models.PriceRecord, price_id):
        raise HTTPException(404, "Price record not found")
    return (
        db.query(models.PriceEvidence)
        .filter(models.PriceEvidence.price_record_id == price_id)
        .order_by(desc(models.PriceEvidence.created_at), desc(models.PriceEvidence.id))
        .all()
    )


@router.get("/{price_id}/adjustments", response_model=list[schemas.PriceAdjustmentOut])
def price_adjustments(price_id: int, db: Session = Depends(get_db)):
    if not db.get(models.PriceRecord, price_id):
        raise HTTPException(404, "Price record not found")
    return (
        db.query(models.PriceAdjustment)
        .filter(models.PriceAdjustment.price_record_id == price_id)
        .order_by(desc(models.PriceAdjustment.created_at), desc(models.PriceAdjustment.id))
        .all()
    )


@router.post("/{price_id}/verify-checkout", response_model=schemas.PriceOut)
def verify_checkout(
    price_id: int,
    payload: schemas.VerifyCheckoutRequest,
    identity: OperatorIdentity = Depends(require_operator),
    db: Session = Depends(get_db),
):
    item = db.get(models.PriceRecord, price_id)
    if not item:
        raise HTTPException(404, "Price record not found")
    if item.verification_status == "INVALID":
        raise HTTPException(409, "Invalid record cannot be verified; create a new manual record instead")

    item.checkout_price = payload.checkout_price
    item.shipping_fee = payload.shipping_fee
    item.coupon_text = payload.coupon_text or item.coupon_text
    item.currency = payload.currency.upper()
    item.region = payload.region
    item.review_note = payload.note
    item.verification_status = "VERIFIED_CHECKOUT"
    item.needs_review = False
    now = datetime.now(timezone.utc)
    item.verified_at = now
    item.valid_until = now + timedelta(hours=payload.valid_for_hours)
    verified_by = identity.email or identity.subject
    item.verified_by = verified_by
    replace_price_evidence(db, item, payload.evidence, payload.adjustments, verified_by=verified_by)
    db.commit()
    db.refresh(item)
    refresh_signals_for_product(db, item.product_id, item)
    invalidate_product_snapshot(item.product_id)
    return item


@router.post("/{price_id}/invalidate", response_model=schemas.PriceOut, dependencies=[Depends(require_operator)])
def invalidate_price(price_id: int, payload: schemas.InvalidatePriceRequest, db: Session = Depends(get_db)):
    item = db.get(models.PriceRecord, price_id)
    if not item:
        raise HTTPException(404, "Price record not found")
    item.verification_status = "INVALID"
    item.needs_review = False
    item.review_note = payload.note
    item.checkout_price = None
    item.verified_at = None
    item.valid_until = None
    item.verified_by = None
    db.commit()
    db.refresh(item)
    refresh_signals_for_product(db, item.product_id)
    invalidate_product_snapshot(item.product_id)
    return item


@router.post("/crawl/{listing_id}", response_model=schemas.PriceOut, dependencies=[Depends(require_operator)])
async def crawl_listing(listing_id: int, db: Session = Depends(get_db)):
    listing = db.get(models.PlatformListing, listing_id)
    if not listing:
        raise HTTPException(404, "Listing not found")
    result = await crawl_generic_page(listing.url, screenshot_name=screenshot_filename(listing_id))
    record = _record_from_crawl(listing, result)
    db.add(record)
    db.commit()
    db.refresh(record)
    invalidate_product_snapshot(record.product_id)
    return record


@router.post("/crawl-all", response_model=schemas.CrawlAllResponse)
async def crawl_all(
    product_id: int | None = None,
    platform: str | None = None,
    force: bool = False,
    concurrency: int | None = Query(default=None, ge=1, le=8),
    min_interval_minutes: int | None = Query(default=None, ge=0, le=1440),
    _: None = Depends(require_operator),
    db: Session = Depends(get_db),
):
    try:
        async with GLOBAL_LOCKS.acquire(_crawl_lock_key(product_id, platform), timeout=0.1):
            result = await run_crawl_batch(
                db,
                product_id=product_id,
                platform=platform,
                force=force,
                concurrency=concurrency,
                min_interval_minutes=min_interval_minutes,
            )
    except BusyError as exc:
        raise HTTPException(409, "A crawl is already running for this scope") from exc
    for product_id in {record.product_id for record in result.records}:
        invalidate_product_snapshot(product_id)
    return schemas.CrawlAllResponse(
        run=result.run,
        records=result.records,
        failures=result.failures,
        skipped_listing_ids=result.skipped_listing_ids,
    )


@router.get("/runs/latest", response_model=schemas.FlowRunOut | None)
def latest_run(db: Session = Depends(get_db)):
    return db.query(models.FlowRun).order_by(desc(models.FlowRun.started_at), desc(models.FlowRun.id)).first()


@router.get("/runs", response_model=list[schemas.FlowRunOut])
def list_runs(limit: int = Query(30, ge=1, le=200), db: Session = Depends(get_db)):
    return db.query(models.FlowRun).order_by(desc(models.FlowRun.started_at), desc(models.FlowRun.id)).limit(limit).all()


@router.get("/scheduler")
def get_scheduler_status():
    return scheduler_status()


@router.post("/scheduler/start", dependencies=[Depends(require_operator)])
def start_scheduler_endpoint():
    changed = start_scheduler()
    return {"changed": changed, **scheduler_status()}


@router.post("/scheduler/stop", dependencies=[Depends(require_operator)])
def stop_scheduler_endpoint():
    changed = stop_scheduler()
    return {"changed": changed, **scheduler_status()}


def _crawl_lock_key(product_id: int | None, platform: str | None) -> str:
    return f"crawl-all:{product_id or 'all'}:{(platform or 'all').lower()}"


def _record_from_crawl(listing: models.PlatformListing, result) -> models.PriceRecord:
    return models.PriceRecord(
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
