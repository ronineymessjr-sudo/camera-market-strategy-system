from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import require_operator
from app.database import get_db
from app.services.quant_engine import backtest_strategy, quant_indicators


router = APIRouter(prefix="/api/quant", tags=["quant"])


@router.get("/products/{product_id}/indicators", response_model=schemas.QuantIndicatorsOut)
def indicators(
    product_id: int,
    window_days: int = Query(default=180, ge=7, le=3650),
    currency: str = Query(default="CNY", min_length=3, max_length=12),
    include_visible: bool = False,
    db: Session = Depends(get_db),
):
    if not db.get(models.Product, product_id):
        raise HTTPException(404, "Product not found")
    return quant_indicators(
        db,
        product_id,
        window_days=window_days,
        currency=currency,
        include_visible=include_visible,
    )


@router.post("/backtests", response_model=schemas.BacktestOut, dependencies=[Depends(require_operator)])
def backtest(payload: schemas.BacktestRequest, db: Session = Depends(get_db)):
    if not db.get(models.Product, payload.product_id):
        raise HTTPException(404, "Product not found")
    if payload.strategy_id is not None and not db.get(models.Strategy, payload.strategy_id):
        raise HTTPException(404, "Strategy not found")
    try:
        return backtest_strategy(db, payload)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
