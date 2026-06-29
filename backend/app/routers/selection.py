from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app import schemas
from app.database import get_db
from app.services.selection_engine import build_selection_candidates


router = APIRouter(prefix="/api/selection", tags=["selection"])


@router.get("/candidates", response_model=list[schemas.SelectionCandidateOut])
def selection_candidates(
    user_name: str = "ronin",
    window_days: int = Query(default=30, ge=1, le=3650),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    return build_selection_candidates(db, user_name=user_name, window_days=window_days, limit=limit)
