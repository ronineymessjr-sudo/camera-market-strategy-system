from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.services.price_analytics import calculate_product_analytics
from app.services.signal_service import latest_verified_price


router = APIRouter(prefix="/api/products", tags=["products"])


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
    payload: list[schemas.ProductOverviewOut] = []
    for product in products:
        latest_any = _latest_price(db, product.id)
        latest_verified = _latest_price(db, product.id, verified=True)
        strategy = (
            db.query(models.Strategy)
            .filter(models.Strategy.product_id == product.id, models.Strategy.is_active.is_(True))
            .order_by(desc(models.Strategy.id))
            .first()
        )
        latest_fresh_verified = None
        if strategy:
            latest_fresh_verified = latest_verified_price(
                db,
                product.id,
                currency=strategy.currency,
                max_age_hours=strategy.max_price_age_hours,
                fresh_only=True,
            )
        latest_clue = _latest_price(db, product.id, clue=True)
        latest_signal = (
            db.query(models.Signal)
            .filter(models.Signal.product_id == product.id, models.Signal.is_current.is_(True))
            .order_by(desc(models.Signal.created_at), desc(models.Signal.id))
            .first()
        )
        recent = (
            db.query(models.PriceRecord)
            .filter(models.PriceRecord.product_id == product.id)
            .order_by(desc(models.PriceRecord.captured_at), desc(models.PriceRecord.id))
            .limit(8)
            .all()
        )
        active_listing_count = (
            db.query(models.PlatformListing)
            .filter(models.PlatformListing.product_id == product.id, models.PlatformListing.is_active.is_(True))
            .count()
        )
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


@router.post("", response_model=schemas.ProductOut, status_code=201)
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


@router.patch("/{product_id}", response_model=schemas.ProductOut)
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
    return item


@router.delete("/{product_id}", response_model=schemas.ProductOut)
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
    return item


@router.post("/{product_id}/restore", response_model=schemas.ProductOut)
def restore_product(product_id: int, db: Session = Depends(get_db)):
    item = _require_product(db, product_id)
    item.is_active = True
    item.archived_at = None
    db.commit()
    db.refresh(item)
    return item


@router.get("/{product_id}/listings", response_model=list[schemas.ListingOut])
def list_listings(product_id: int, include_inactive: bool = True, db: Session = Depends(get_db)):
    _require_product(db, product_id)
    query = db.query(models.PlatformListing).filter(models.PlatformListing.product_id == product_id)
    if not include_inactive:
        query = query.filter(models.PlatformListing.is_active.is_(True))
    return query.order_by(desc(models.PlatformListing.is_active), models.PlatformListing.id).all()


@router.post("/{product_id}/listings", response_model=schemas.ListingOut, status_code=201)
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
    return item


@router.patch("/{product_id}/listings/{listing_id}", response_model=schemas.ListingOut)
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
    return item


@router.delete("/{product_id}/listings/{listing_id}", response_model=schemas.ListingOut)
def deactivate_listing(product_id: int, listing_id: int, db: Session = Depends(get_db)):
    _require_product(db, product_id)
    item = db.get(models.PlatformListing, listing_id)
    if not item or item.product_id != product_id:
        raise HTTPException(404, "Listing not found")
    item.is_active = False
    db.commit()
    db.refresh(item)
    return item


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
