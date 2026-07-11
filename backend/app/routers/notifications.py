from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import require_operator
from app.database import get_db
from app.services.notification_service import mark_all_notifications_read, mark_notification_read


router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("", response_model=list[schemas.NotificationOut])
def list_notifications(
    unread_only: bool = False,
    limit: int = Query(default=50, ge=1, le=500),
    db: Session = Depends(get_db),
):
    query = db.query(models.Notification)
    if unread_only:
        query = query.filter(models.Notification.status == "UNREAD")
    return query.order_by(desc(models.Notification.created_at), desc(models.Notification.id)).limit(limit).all()


@router.post("/{notification_id}/read", response_model=schemas.NotificationOut, dependencies=[Depends(require_operator)])
def read_notification(notification_id: int, db: Session = Depends(get_db)):
    notification = mark_notification_read(db, notification_id)
    if not notification:
        raise HTTPException(404, "Notification not found")
    return notification


@router.post("/read-all", dependencies=[Depends(require_operator)])
def read_all_notifications(db: Session = Depends(get_db)):
    return {"updated": mark_all_notifications_read(db)}
