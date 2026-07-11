from __future__ import annotations

from sqlalchemy.orm import Session
from sqlalchemy import or_, select

import hashlib
import hmac
import json
from datetime import datetime, timedelta, timezone

import httpx

from app import models
from app.config import settings


def create_signal_notification(db: Session, signal: models.Signal) -> models.Notification | None:
    if not signal.triggered:
        return None
    existing = (
        db.query(models.Notification)
        .filter(models.Notification.signal_id == signal.id, models.Notification.type == "SIGNAL_TRIGGERED")
        .first()
    )
    if existing:
        return existing
    notification = models.Notification(
        product_id=signal.product_id,
        signal_id=signal.id,
        type="SIGNAL_TRIGGERED",
        title=f"{signal.signal_type} triggered",
        body=signal.message,
        status="UNREAD",
    )
    db.add(notification)
    db.flush()
    if settings.outbound_webhook_url:
        db.add(models.NotificationDelivery(
            notification_id=notification.id,
            channel="WEBHOOK",
            status="PENDING",
            attempts=0,
        ))
    return notification


def mark_notification_read(db: Session, notification_id: int) -> models.Notification | None:
    from datetime import datetime, timezone

    notification = db.get(models.Notification, notification_id)
    if not notification:
        return None
    notification.status = "READ"
    notification.read_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(notification)
    return notification


def mark_all_notifications_read(db: Session) -> int:
    changed = db.query(models.Notification).filter(models.Notification.status == "UNREAD").update(
        {models.Notification.status: "READ", models.Notification.read_at: datetime.now(timezone.utc)},
        synchronize_session=False,
    )
    db.commit()
    return changed


def deliver_next_webhook(db: Session) -> bool:
    if not settings.outbound_webhook_url:
        return False
    now = datetime.now(timezone.utc)
    statement = (
        select(models.NotificationDelivery)
        .where(
            models.NotificationDelivery.channel == "WEBHOOK",
            models.NotificationDelivery.status.in_(["PENDING", "RETRY", "SENDING"]),
            or_(models.NotificationDelivery.next_attempt_at.is_(None), models.NotificationDelivery.next_attempt_at <= now),
        )
        .order_by(models.NotificationDelivery.id)
        .limit(1)
    )
    if db.get_bind().dialect.name == "postgresql":
        statement = statement.with_for_update(skip_locked=True)
    delivery = db.execute(statement).scalar_one_or_none()
    if not delivery:
        db.rollback()
        return False
    notification = db.get(models.Notification, delivery.notification_id)
    delivery.status = "SENDING"
    delivery.attempts = (delivery.attempts or 0) + 1
    delivery.next_attempt_at = now + timedelta(minutes=5)
    payload = {
        "id": notification.id,
        "type": notification.type,
        "title": notification.title,
        "body": notification.body,
        "product_id": notification.product_id,
        "signal_id": notification.signal_id,
        "created_at": notification.created_at.isoformat() if notification.created_at else None,
    }
    body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode()
    headers = {"Content-Type": "application/json"}
    if settings.outbound_webhook_secret:
        headers["X-Camera-Market-Signature"] = hmac.new(
            settings.outbound_webhook_secret.encode(), body, hashlib.sha256
        ).hexdigest()
    delivery.request_json = body.decode()
    db.commit()
    try:
        response = httpx.post(settings.outbound_webhook_url, content=body, headers=headers, timeout=10.0)
        response.raise_for_status()
        delivery = db.get(models.NotificationDelivery, delivery.id)
        delivery.status = "DELIVERED"
        delivery.response_json = response.text[:4000]
        delivery.delivered_at = datetime.now(timezone.utc)
        delivery.next_attempt_at = None
    except Exception as exc:
        db.rollback()
        delivery = db.get(models.NotificationDelivery, delivery.id)
        delivery.error_message = str(exc)[:4000]
        delivery.status = "FAILED" if delivery.attempts >= 3 else "RETRY"
        delivery.next_attempt_at = datetime.now(timezone.utc) + timedelta(minutes=2 ** delivery.attempts)
    db.commit()
    return True
