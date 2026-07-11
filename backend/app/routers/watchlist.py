from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import schemas
from app.auth import require_operator
from app.database import get_db
from app.services.watchlist_commands import execute_watchlist_command


router = APIRouter(prefix="/api/watchlist", tags=["watchlist"])


@router.post("/commands", response_model=schemas.WatchlistCommandResponse, dependencies=[Depends(require_operator)])
def run_watchlist_command(payload: schemas.WatchlistCommandRequest, db: Session = Depends(get_db)):
    try:
        result = execute_watchlist_command(db, payload.command)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    return schemas.WatchlistCommandResponse(
        action=result.action,
        message=result.message,
        product=result.product,
        strategy=result.strategy,
        listing=result.listing,
    )
