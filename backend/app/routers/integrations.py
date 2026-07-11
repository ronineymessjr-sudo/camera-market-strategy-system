from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import require_operator
from app.database import get_db
from app.integrations.registry import get_provider, provider_statuses, supported_providers
from app.services.integration_service import latest_integration_runs, sync_provider


router = APIRouter(prefix="/api/integrations", tags=["integrations"])


@router.get("/providers", response_model=list[schemas.ProviderStatusOut])
def providers():
    return provider_statuses()


@router.post("/{provider}/sync", response_model=schemas.IntegrationSyncResponse, dependencies=[Depends(require_operator)])
async def provider_sync(
    provider: str,
    payload: schemas.IntegrationSearchRequest,
    db: Session = Depends(get_db),
):
    if provider not in supported_providers():
        raise HTTPException(404, f"Unsupported provider: {provider}")
    if payload.product_id is not None and not db.get(models.Product, payload.product_id):
        raise HTTPException(404, "Product not found")
    instance = get_provider(provider)
    if not instance.is_configured():
        raise HTTPException(409, f"{provider} API credentials are not configured")
    try:
        run, offers, price_ids = await sync_provider(db, provider, payload)
    except Exception as exc:
        raise HTTPException(502, f"Provider sync failed: {exc}") from exc
    return schemas.IntegrationSyncResponse(run=run, offers=offers, price_record_ids=price_ids)


@router.get("/runs", response_model=list[schemas.IntegrationRunOut])
def runs(limit: int = Query(default=30, ge=1, le=500), db: Session = Depends(get_db)):
    return latest_integration_runs(db, limit=limit)


@router.get("/offers", response_model=list[schemas.ExternalOfferOut])
def offers(
    provider: str | None = None,
    product_id: int | None = None,
    active_only: bool = True,
    limit: int = Query(default=100, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    query = db.query(models.ExternalOffer)
    if provider:
        query = query.filter(models.ExternalOffer.provider == provider)
    if product_id is not None:
        query = query.filter(models.ExternalOffer.product_id == product_id)
    if active_only:
        query = query.filter(
            (models.ExternalOffer.expires_at.is_(None)) |
            (models.ExternalOffer.expires_at >= datetime.now(timezone.utc))
        )
    return query.order_by(desc(models.ExternalOffer.captured_at), desc(models.ExternalOffer.id)).limit(limit).all()
