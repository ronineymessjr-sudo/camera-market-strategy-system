from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile
from sqlalchemy.orm import Session

from app import schemas
from app.auth import require_operator
from app.database import get_db
from app.services.watchlist_commands import execute_watchlist_command
from app.services.watchlist_io import export_watchlist_csv, import_watchlist_csv
from app.routers.products import invalidate_product_snapshot


router = APIRouter(prefix="/api/watchlist", tags=["watchlist"])
MAX_IMPORT_BYTES = 1024 * 1024


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


@router.post("/import.csv", response_model=schemas.WatchlistImportResponse, dependencies=[Depends(require_operator)])
async def import_watchlist(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read(MAX_IMPORT_BYTES + 1)
    if len(content) > MAX_IMPORT_BYTES:
        raise HTTPException(413, "Watchlist CSV exceeds 1 MiB")
    try:
        result = import_watchlist_csv(db, content)
    except (UnicodeDecodeError, ValueError) as exc:
        db.rollback()
        raise HTTPException(422, str(exc)) from exc
    for product_id in result.product_ids:
        invalidate_product_snapshot(product_id)
    return schemas.WatchlistImportResponse(
        created_products=result.created_products,
        updated_products=result.updated_products,
        created_listings=result.created_listings,
        updated_listings=result.updated_listings,
        created_strategies=result.created_strategies,
        updated_strategies=result.updated_strategies,
    )


@router.get("/export.csv", dependencies=[Depends(require_operator)])
def export_watchlist(include_archived: bool = Query(default=False), db: Session = Depends(get_db)):
    content = export_watchlist_csv(db, include_archived=include_archived)
    return Response(
        content="\ufeff" + content,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="camera-market-watchlist.csv"'},
    )
