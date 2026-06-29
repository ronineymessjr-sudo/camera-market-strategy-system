from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.services.price_analytics import calculate_product_analytics


router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/products/{product_id}", response_model=schemas.PriceAnalyticsOut)
def product_analytics(
    product_id: int,
    window_days: int = Query(default=30, ge=1, le=3650),
    currency: str = Query(default="CNY", min_length=3, max_length=12),
    db: Session = Depends(get_db),
):
    if not db.get(models.Product, product_id):
        raise HTTPException(404, "Product not found")
    return calculate_product_analytics(db, product_id, window_days=window_days, preferred_currency=currency)


@router.get("/market", response_model=list[schemas.PriceAnalyticsOut])
def market_analytics(
    window_days: int = Query(default=30, ge=1, le=3650),
    currency: str = Query(default="CNY", min_length=3, max_length=12),
    include_archived: bool = False,
    db: Session = Depends(get_db),
):
    query = db.query(models.Product)
    if not include_archived:
        query = query.filter(models.Product.is_active.is_(True))
    products = query.order_by(models.Product.priority.desc(), models.Product.id).all()
    return [
        calculate_product_analytics(db, product.id, window_days=window_days, preferred_currency=currency)
        for product in products
    ]
