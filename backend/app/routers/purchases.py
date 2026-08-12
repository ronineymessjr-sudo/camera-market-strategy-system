from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import OperatorIdentity, require_operator
from app.database import get_db


router = APIRouter(prefix="/api/purchases", tags=["purchases"])


@router.get("", response_model=list[schemas.PurchaseConfirmationOut])
def list_purchase_confirmations(
    limit: int = Query(default=100, ge=1, le=500),
    _: OperatorIdentity = Depends(require_operator),
    db: Session = Depends(get_db),
):
    return (
        db.query(models.PurchaseConfirmation)
        .order_by(desc(models.PurchaseConfirmation.confirmed_at), desc(models.PurchaseConfirmation.id))
        .limit(limit)
        .all()
    )


@router.post("", response_model=schemas.PurchaseConfirmationOut, status_code=201)
def confirm_purchase(
    payload: schemas.PurchaseConfirmationCreate,
    identity: OperatorIdentity = Depends(require_operator),
    db: Session = Depends(get_db),
):
    price = db.get(models.PriceRecord, payload.price_record_id)
    if not price:
        raise HTTPException(404, "Price record not found")
    if price.verification_status != "VERIFIED_CHECKOUT" or price.checkout_price is None:
        raise HTTPException(409, "Only a verified checkout price can be confirmed for purchase")
    valid_until = price.valid_until
    if valid_until and valid_until.tzinfo is None:
        valid_until = valid_until.replace(tzinfo=timezone.utc)
    if valid_until and valid_until < datetime.now(timezone.utc):
        raise HTTPException(409, "The verified checkout price has expired; verify it again before confirming")
    product = db.get(models.Product, price.product_id)
    if not product:
        raise HTTPException(409, "Product for price record not found")

    confirmation = models.PurchaseConfirmation(
        product_id=product.id,
        price_record_id=price.id,
        product_name=product.name,
        source_url=price.source_url,
        checkout_price=price.checkout_price,
        currency=(price.currency or "CNY").upper(),
        note=payload.note,
        confirmed_by=identity.email or identity.subject,
    )
    db.add(confirmation)
    db.commit()
    db.refresh(confirmation)
    return confirmation


@router.patch("/{confirmation_id}", response_model=schemas.PurchaseConfirmationOut)
def update_purchase_confirmation(
    confirmation_id: int,
    payload: schemas.PurchaseConfirmationUpdate,
    _: OperatorIdentity = Depends(require_operator),
    db: Session = Depends(get_db),
):
    confirmation = db.get(models.PurchaseConfirmation, confirmation_id)
    if not confirmation:
        raise HTTPException(404, "Purchase confirmation not found")
    confirmation.status = payload.status
    confirmation.completed_at = datetime.now(timezone.utc) if payload.status == "COMPLETED" else None
    db.commit()
    db.refresh(confirmation)
    return confirmation
