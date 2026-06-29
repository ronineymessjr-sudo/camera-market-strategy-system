from __future__ import annotations

from datetime import datetime, time, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db


router = APIRouter(prefix="/api/signals", tags=["signals"])


@router.get("", response_model=list[schemas.SignalOut])
def list_signals(
    limit: int = Query(100, ge=1, le=500),
    current_only: bool = False,
    db: Session = Depends(get_db),
):
    query = db.query(models.Signal)
    if current_only:
        query = query.filter(models.Signal.is_current.is_(True))
    return query.order_by(desc(models.Signal.created_at), desc(models.Signal.id)).limit(limit).all()


@router.get("/today", response_model=list[schemas.SignalOut])
def today_signals(current_only: bool = True, db: Session = Depends(get_db)):
    start = datetime.combine(datetime.now().date(), time.min)
    end = start + timedelta(days=1)
    query = db.query(models.Signal).filter(models.Signal.created_at >= start, models.Signal.created_at < end)
    if current_only:
        query = query.filter(models.Signal.is_current.is_(True))
    return query.order_by(desc(models.Signal.created_at), desc(models.Signal.id)).all()


@router.get("/product/{product_id}", response_model=list[schemas.SignalOut])
def product_signals(product_id: int, current_only: bool = False, db: Session = Depends(get_db)):
    query = db.query(models.Signal).filter(models.Signal.product_id == product_id)
    if current_only:
        query = query.filter(models.Signal.is_current.is_(True))
    return query.order_by(desc(models.Signal.created_at), desc(models.Signal.id)).limit(100).all()
