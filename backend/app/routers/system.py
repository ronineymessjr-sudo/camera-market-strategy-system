from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db


router = APIRouter(prefix="/api/system", tags=["system"])


@router.get("/health")
def health():
    return {"status": "ok", "version": "0.12.1"}


@router.get("/last-flow", response_model=schemas.FlowRunOut | None)
def last_flow(db: Session = Depends(get_db)):
    return db.query(models.FlowRun).order_by(desc(models.FlowRun.started_at), desc(models.FlowRun.id)).first()
