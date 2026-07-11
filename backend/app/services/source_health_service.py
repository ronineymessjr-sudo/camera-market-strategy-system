from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

from sqlalchemy import desc
from sqlalchemy.orm import Session

from app import models, schemas
from app.integrations.registry import provider_statuses


def record_source_health(
    db: Session,
    provider: str,
    status: str,
    *,
    mode: str | None = None,
    latency_ms: int | None = None,
    details: dict | None = None,
) -> models.SourceHealthHistory:
    row = models.SourceHealthHistory(
        provider=provider,
        status=status.upper(),
        mode=mode,
        latency_ms=latency_ms,
        details_json=json.dumps(details or {}, ensure_ascii=False),
    )
    db.add(row)
    db.flush()
    return row


def build_source_health(db: Session, *, window_hours: int = 24) -> list[schemas.SourceHealthOut]:
    threshold = datetime.now(timezone.utc) - timedelta(hours=window_hours)
    configured = {item["provider"]: item for item in provider_statuses()}
    providers = set(configured)
    providers.update(row[0] for row in db.query(models.SourceHealthHistory.provider).distinct().all())
    providers.update(row[0] for row in db.query(models.FlowRun.run_type).distinct().all())
    providers.update(row[0] for row in db.query(models.IntegrationRun.provider).distinct().all())

    result: list[schemas.SourceHealthOut] = []
    for provider in sorted(providers):
        history = (
            db.query(models.SourceHealthHistory)
            .filter(models.SourceHealthHistory.provider == provider, models.SourceHealthHistory.checked_at >= threshold)
            .order_by(desc(models.SourceHealthHistory.checked_at), desc(models.SourceHealthHistory.id))
            .all()
        )
        success_count = sum(1 for row in history if row.status == "SUCCESS")
        failure_count = sum(1 for row in history if row.status in {"FAILED", "ERROR", "PARTIAL"})
        total = success_count + failure_count
        latest = history[0] if history else None
        latest_success = next((row for row in history if row.status == "SUCCESS"), None)
        latencies = [row.latency_ms for row in history if row.latency_ms is not None]
        status = _rollup_status(latest, success_count, failure_count, bool(configured.get(provider, None)))
        last_error = _last_error(history)

        provider_status = configured.get(provider)
        result.append(
            schemas.SourceHealthOut(
                provider=provider,
                configured=provider_status["configured"] if provider_status else True,
                mode=provider_status["mode"] if provider_status else "runtime",
                status=status,
                last_checked_at=latest.checked_at if latest else None,
                last_success_at=latest_success.checked_at if latest_success else None,
                last_error=last_error,
                success_count=success_count,
                failure_count=failure_count,
                success_rate=round(success_count / total, 4) if total else 0.0,
                average_latency_ms=round(sum(latencies) / len(latencies), 2) if latencies else None,
                stale=latest is None,
            )
        )
    return result


def _rollup_status(latest: models.SourceHealthHistory | None, success_count: int, failure_count: int, configured: bool) -> str:
    if latest is None and not configured:
        return "UNCONFIGURED"
    if latest is None:
        return "NO_RUNS"
    if latest.status == "SUCCESS" and failure_count == 0:
        return "HEALTHY"
    if success_count and failure_count:
        return "DEGRADED"
    if failure_count:
        return "FAILED"
    return latest.status


def _last_error(history: list[models.SourceHealthHistory]) -> str | None:
    for row in history:
        if row.status not in {"FAILED", "ERROR", "PARTIAL"}:
            continue
        if not row.details_json:
            return row.status
        try:
            details = json.loads(row.details_json)
        except json.JSONDecodeError:
            return row.details_json[:500]
        return str(details.get("error") or details.get("message") or row.status)[:500]
    return None
