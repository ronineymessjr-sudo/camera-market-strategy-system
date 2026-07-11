from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from pathlib import PurePosixPath
from uuid import uuid4

import httpx
from fastapi import HTTPException

from app.config import settings


ALLOWED_EVIDENCE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
}


async def upload_evidence(content: bytes, mime_type: str) -> tuple[str, str]:
    if mime_type not in ALLOWED_EVIDENCE_TYPES:
        raise HTTPException(415, "Evidence must be JPEG, PNG, WebP, or PDF")
    if not content:
        raise HTTPException(422, "Evidence file is empty")
    if len(content) > settings.evidence_max_upload_bytes:
        raise HTTPException(413, "Evidence file exceeds the configured upload limit")
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(503, "Supabase evidence storage is not configured")

    now = datetime.now(timezone.utc)
    filename = f"{uuid4().hex}{ALLOWED_EVIDENCE_TYPES[mime_type]}"
    object_path = str(PurePosixPath(str(now.year), f"{now.month:02d}", filename))
    url = (
        f"{settings.supabase_url.rstrip('/')}/storage/v1/object/"
        f"{settings.evidence_storage_bucket}/{object_path}"
    )
    headers = {
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "apikey": settings.supabase_service_role_key,
        "Content-Type": mime_type,
        "x-upsert": "false",
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, headers=headers, content=content)
    if response.status_code not in {200, 201}:
        raise HTTPException(502, "Supabase evidence upload failed")
    return object_path, hashlib.sha256(content).hexdigest()
