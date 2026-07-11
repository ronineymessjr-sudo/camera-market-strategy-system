from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import require_operator
from app.database import get_db
from app.services.signal_service import refresh_signal_for_strategy


router = APIRouter(prefix="/api/strategies", tags=["strategies"])


@router.get("", response_model=list[schemas.StrategyOut])
def list_strategies(db: Session = Depends(get_db)):
    return db.query(models.Strategy).order_by(desc(models.Strategy.is_active), desc(models.Strategy.id)).all()


@router.post("", response_model=schemas.StrategyOut, status_code=201, dependencies=[Depends(require_operator)])
def create_strategy(payload: schemas.StrategyCreate, db: Session = Depends(get_db)):
    if not db.get(models.Product, payload.product_id):
        raise HTTPException(404, "Product not found")
    item = models.Strategy(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    if item.is_active:
        refresh_signal_for_strategy(db, item)
    return item


@router.put("/{strategy_id}", response_model=schemas.StrategyOut, dependencies=[Depends(require_operator)])
def update_strategy(strategy_id: int, payload: schemas.StrategyUpdate, db: Session = Depends(get_db)):
    item = db.get(models.Strategy, strategy_id)
    if not item:
        raise HTTPException(404, "Strategy not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    if item.is_active:
        refresh_signal_for_strategy(db, item)
    return item


@router.post("/{strategy_id}/copy", response_model=schemas.StrategyOut, status_code=201, dependencies=[Depends(require_operator)])
def copy_strategy(strategy_id: int, user_name: str = "ronin", db: Session = Depends(get_db)):
    source = db.get(models.Strategy, strategy_id)
    if not source:
        raise HTTPException(404, "Strategy not found")
    item = models.Strategy(
        user_name=user_name,
        product_id=source.product_id,
        strategy_name=f"{source.strategy_name} Copy",
        trigger_price=source.trigger_price,
        strong_buy_price=source.strong_buy_price,
        watch_price=source.watch_price,
        currency=source.currency,
        mode=source.mode,
        max_price_age_hours=source.max_price_age_hours,
        near_target_pct=source.near_target_pct,
        notes=source.notes,
        is_active=False,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item
