from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

from sqlalchemy import desc
from sqlalchemy.orm import Session

from app import models, schemas
from app.config import settings
from app.integrations.base import ProviderSearchRequest
from app.integrations.registry import get_provider


PROVIDER_REGION = {
    "amazon": "US",
    "ebay": "US",
}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _match_listing(db: Session, provider: str, external_id: str, product_url: str | None) -> models.PlatformListing | None:
    query = db.query(models.PlatformListing).filter(models.PlatformListing.platform == provider)
    if external_id:
        match = query.filter(models.PlatformListing.sku_id == external_id).first()
        if match:
            return match
    if product_url:
        return query.filter(models.PlatformListing.url == product_url).first()
    return None


async def sync_provider(
    db: Session,
    provider_code: str,
    payload: schemas.IntegrationSearchRequest,
) -> tuple[models.IntegrationRun, list[models.ExternalOffer], list[int]]:
    provider = get_provider(provider_code)
    run = models.IntegrationRun(
        provider=provider_code,
        keyword=payload.keyword,
        status="RUNNING",
        request_json=payload.model_dump_json(),
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    try:
        result = await provider.search(ProviderSearchRequest(
            keyword=payload.keyword,
            page=payload.page,
            page_size=payload.page_size,
            sort=payload.sort,
            min_price=payload.min_price,
            max_price=payload.max_price,
        ))
        expiry = _now() + timedelta(hours=settings.integration_offer_ttl_hours)
        saved: list[models.ExternalOffer] = []
        price_record_ids: list[int] = []
        for offer in result.offers:
            listing = _match_listing(db, provider_code, offer.external_id, offer.product_url)
            product_id = payload.product_id or (listing.product_id if listing else None)
            row = models.ExternalOffer(
                provider=provider_code,
                external_id=offer.external_id,
                product_id=product_id,
                listing_id=listing.id if listing else None,
                title=offer.title,
                product_url=offer.product_url,
                seller_name=offer.seller_name,
                list_price=offer.list_price,
                promotion_price=offer.promotion_price,
                coupon_amount=offer.coupon_amount,
                effective_price=offer.effective_price,
                commission_rate=offer.commission_rate,
                currency=offer.currency,
                stock_status=offer.stock_status,
                raw_payload_json=json.dumps(offer.raw_payload, ensure_ascii=False),
                captured_at=offer.captured_at,
                expires_at=expiry,
            )
            db.add(row)
            db.flush()
            saved.append(row)

            if payload.ingest and product_id is not None and offer.effective_price is not None:
                price = models.PriceRecord(
                    product_id=product_id,
                    listing_id=listing.id if listing else None,
                    platform=provider_code,
                    seller_name=offer.seller_name,
                    title=offer.title,
                    list_price=offer.list_price,
                    promotion_price=offer.effective_price,
                    checkout_price=None,
                    coupon_text=f"官方API优惠额: {offer.coupon_amount}" if offer.coupon_amount else None,
                    verification_status="VISIBLE_PRICE",
                    source_url=offer.product_url,
                    raw_price_text=str(offer.effective_price),
                    raw_price_context="official affiliate/open-platform API offer; checkout not verified",
                    currency=offer.currency,
                    region=PROVIDER_REGION.get(provider_code, "CN"),
                    confidence_score=0.9,
                    extraction_method=f"OFFICIAL_API:{provider_code}",
                    needs_review=True,
                    valid_until=expiry,
                )
                db.add(price)
                db.flush()
                price_record_ids.append(price.id)

        run.status = "SUCCESS"
        run.request_id = result.request_id
        run.offer_count = len(saved)
        run.ingested_count = len(price_record_ids)
        run.finished_at = _now()
        run.response_summary_json = json.dumps({
            "offer_count": len(saved),
            "ingested_count": len(price_record_ids),
            "provider": provider_code,
        }, ensure_ascii=False)
        db.commit()
        for item in saved:
            db.refresh(item)
        db.refresh(run)
        return run, saved, price_record_ids
    except Exception as exc:
        run.status = "FAILED"
        run.finished_at = _now()
        run.error_message = str(exc)[:4000]
        db.commit()
        db.refresh(run)
        raise


def latest_integration_runs(db: Session, limit: int = 20) -> list[models.IntegrationRun]:
    return db.query(models.IntegrationRun).order_by(desc(models.IntegrationRun.started_at), desc(models.IntegrationRun.id)).limit(limit).all()
