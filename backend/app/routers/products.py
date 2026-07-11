from __future__ import annotations

from datetime import datetime, timezone
from time import time
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import require_operator
from app.database import SessionLocal, get_db
from app.product_refresh_cache import ProductRefreshCache
from app.services.price_analytics import calculate_product_analytics
from app.services.overview_service import (
    active_listing_counts,
    active_strategies_by_product,
    latest_prices_by_product,
    latest_signals_by_product,
    recent_prices_by_product,
)
from app.services.signal_service import is_price_fresh


router = APIRouter(prefix="/api/products", tags=["products"])
_PRODUCT_SNAPSHOT_CACHE: ProductRefreshCache[dict[str, Any]] = ProductRefreshCache(
    ttl_seconds=300,
    stale_seconds=900,
    clock=time,
)


@router.get("", response_model=list[schemas.ProductOut])
def list_products(include_archived: bool = False, db: Session = Depends(get_db)):
    query = db.query(models.Product)
    if not include_archived:
        query = query.filter(models.Product.is_active.is_(True))
    return query.order_by(desc(models.Product.priority), models.Product.id).all()


@router.get("/overview", response_model=list[schemas.ProductOverviewOut])
def product_overview(
    include_archived: bool = False,
    analytics_window_days: int = Query(default=30, ge=1, le=3650),
    db: Session = Depends(get_db),
):
    query = db.query(models.Product)
    if not include_archived:
        query = query.filter(models.Product.is_active.is_(True))
    products = query.order_by(desc(models.Product.priority), models.Product.id).all()
    product_ids = [product.id for product in products]
    latest_any_by_product = latest_prices_by_product(db, product_ids)
    latest_verified_by_product = latest_prices_by_product(db, product_ids, ["VERIFIED_CHECKOUT"], trusted_only=True)
    latest_clue_by_product = latest_prices_by_product(db, product_ids, ["VISIBLE_PRICE", "UNVERIFIED"])
    strategies_by_product = active_strategies_by_product(db, product_ids)
    signals_by_product = latest_signals_by_product(db, product_ids)
    recent_by_product = recent_prices_by_product(db, product_ids)
    listing_counts = active_listing_counts(db, product_ids)
    payload: list[schemas.ProductOverviewOut] = []
    for product in products:
        latest_any = latest_any_by_product.get(product.id)
        latest_verified = latest_verified_by_product.get(product.id)
        strategy = strategies_by_product.get(product.id)
        latest_fresh_verified = None
        if (
            strategy
            and latest_verified
            and latest_verified.currency
            and latest_verified.currency.upper() == strategy.currency.upper()
            and is_price_fresh(latest_verified, strategy)
        ):
            latest_fresh_verified = latest_verified
        latest_clue = latest_clue_by_product.get(product.id)
        latest_signal = signals_by_product.get(product.id)
        recent = recent_by_product.get(product.id, [])
        active_listing_count = listing_counts.get(product.id, 0)
        analytics = calculate_product_analytics(
            db,
            product.id,
            window_days=analytics_window_days,
            preferred_currency=strategy.currency if strategy else "CNY",
        )
        payload.append(
            schemas.ProductOverviewOut(
                product=product,
                latest_any=latest_any,
                latest_verified=latest_verified,
                latest_fresh_verified=latest_fresh_verified,
                latest_clue=latest_clue,
                latest_signal=latest_signal,
                recent_prices=recent,
                active_listing_count=active_listing_count,
                analytics=analytics,
            )
        )
    return payload


@router.post("", response_model=schemas.ProductOut, status_code=201, dependencies=[Depends(require_operator)])
def create_product(payload: schemas.ProductCreate, db: Session = Depends(get_db)):
    item = models.Product(**payload.model_dump())
    db.add(item)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, "Product with the same name already exists") from exc
    db.refresh(item)
    return item


@router.get("/{product_id}", response_model=schemas.ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    return _require_product(db, product_id)


@router.get("/{product_id}/refresh-snapshot", response_model=schemas.ProductRefreshSnapshotOut)
async def product_refresh_snapshot(
    product_id: int,
    force_refresh: bool = False,
):
    result = await _PRODUCT_SNAPSHOT_CACHE.get(
        _product_snapshot_key(product_id),
        lambda: _load_product_snapshot(product_id),
        force_refresh=force_refresh,
    )
    return {
        **result.value,
        "refreshed_at": result.refreshed_at,
        "next_refresh_at": result.next_refresh_at,
        "refresh_in_seconds": result.refresh_in_seconds,
        "source": result.source,
        "stale": result.stale,
    }


@router.patch("/{product_id}", response_model=schemas.ProductOut, dependencies=[Depends(require_operator)])
def update_product(product_id: int, payload: schemas.ProductUpdate, db: Session = Depends(get_db)):
    item = _require_product(db, product_id)
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(item, key, value)
    if data.get("is_active") is True:
        item.archived_at = None
    elif data.get("is_active") is False:
        item.archived_at = datetime.now(timezone.utc)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, "Product with the same name already exists") from exc
    db.refresh(item)
    invalidate_product_snapshot(product_id)
    return item


@router.delete("/{product_id}", response_model=schemas.ProductOut, dependencies=[Depends(require_operator)])
def archive_product(product_id: int, db: Session = Depends(get_db)):
    item = _require_product(db, product_id)
    item.is_active = False
    item.archived_at = datetime.now(timezone.utc)
    db.query(models.PlatformListing).filter(models.PlatformListing.product_id == product_id).update(
        {models.PlatformListing.is_active: False}, synchronize_session=False
    )
    db.query(models.Strategy).filter(models.Strategy.product_id == product_id).update(
        {models.Strategy.is_active: False}, synchronize_session=False
    )
    db.commit()
    db.refresh(item)
    invalidate_product_snapshot(product_id)
    return item


@router.post("/{product_id}/restore", response_model=schemas.ProductOut, dependencies=[Depends(require_operator)])
def restore_product(product_id: int, db: Session = Depends(get_db)):
    item = _require_product(db, product_id)
    item.is_active = True
    item.archived_at = None
    db.commit()
    db.refresh(item)
    invalidate_product_snapshot(product_id)
    return item


@router.get("/{product_id}/listings", response_model=list[schemas.ListingOut])
def list_listings(product_id: int, include_inactive: bool = True, db: Session = Depends(get_db)):
    _require_product(db, product_id)
    query = db.query(models.PlatformListing).filter(models.PlatformListing.product_id == product_id)
    if not include_inactive:
        query = query.filter(models.PlatformListing.is_active.is_(True))
    return query.order_by(desc(models.PlatformListing.is_active), models.PlatformListing.id).all()


@router.post("/{product_id}/listings", response_model=schemas.ListingOut, status_code=201, dependencies=[Depends(require_operator)])
def create_listing(product_id: int, payload: schemas.ListingCreate, db: Session = Depends(get_db)):
    _require_product(db, product_id)
    data = payload.model_dump(exclude={"product_id"})
    item = models.PlatformListing(product_id=product_id, **data)
    db.add(item)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, "The product already has this source URL") from exc
    db.refresh(item)
    invalidate_product_snapshot(product_id)
    return item


@router.patch("/{product_id}/listings/{listing_id}", response_model=schemas.ListingOut, dependencies=[Depends(require_operator)])
def update_listing(
    product_id: int,
    listing_id: int,
    payload: schemas.ListingUpdate,
    db: Session = Depends(get_db),
):
    _require_product(db, product_id)
    item = db.get(models.PlatformListing, listing_id)
    if not item or item.product_id != product_id:
        raise HTTPException(404, "Listing not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, "The product already has this source URL") from exc
    db.refresh(item)
    invalidate_product_snapshot(product_id)
    return item


@router.delete("/{product_id}/listings/{listing_id}", response_model=schemas.ListingOut, dependencies=[Depends(require_operator)])
def deactivate_listing(product_id: int, listing_id: int, db: Session = Depends(get_db)):
    _require_product(db, product_id)
    item = db.get(models.PlatformListing, listing_id)
    if not item or item.product_id != product_id:
        raise HTTPException(404, "Listing not found")
    item.is_active = False
    db.commit()
    db.refresh(item)
    invalidate_product_snapshot(product_id)
    return item


def _product_snapshot_key(product_id: int) -> str:
    return f"product:{product_id}"


def invalidate_product_snapshot(product_id: int) -> None:
    _PRODUCT_SNAPSHOT_CACHE.invalidate(_product_snapshot_key(product_id))


async def _load_product_snapshot(product_id: int) -> dict[str, Any]:
    db = SessionLocal()
    try:
        product = _require_product(db, product_id)
        listings = (
            db.query(models.PlatformListing)
            .filter(models.PlatformListing.product_id == product_id, models.PlatformListing.is_active.is_(True))
            .order_by(models.PlatformListing.id)
            .all()
        )
        return {
            "product": schemas.ProductOut.model_validate(product).model_dump(mode="json"),
            "listings": [schemas.ListingOut.model_validate(listing).model_dump(mode="json") for listing in listings],
            "latest_any": _dump_optional_price(_latest_price(db, product_id)),
            "latest_verified": _dump_optional_price(_latest_price(db, product_id, verified=True)),
            "latest_clue": _dump_optional_price(_latest_price(db, product_id, clue=True)),
            "active_listing_count": len(listings),
        }
    finally:
        db.close()


def _dump_optional_price(price: models.PriceRecord | None) -> dict[str, Any] | None:
    if price is None:
        return None
    return schemas.PriceOut.model_validate(price).model_dump(mode="json")


def _require_product(db: Session, product_id: int) -> models.Product:
    product = db.get(models.Product, product_id)
    if not product:
        raise HTTPException(404, "Product not found")
    return product


def _latest_price(db: Session, product_id: int, *, verified: bool = False, clue: bool = False):
    query = db.query(models.PriceRecord).filter(models.PriceRecord.product_id == product_id)
    if verified:
        query = query.filter(
            models.PriceRecord.verification_status == "VERIFIED_CHECKOUT",
            models.PriceRecord.checkout_price.isnot(None),
        )
    if clue:
        query = query.filter(models.PriceRecord.verification_status.in_(["VISIBLE_PRICE", "UNVERIFIED"]))
    return query.order_by(desc(models.PriceRecord.captured_at), desc(models.PriceRecord.id)).first()
