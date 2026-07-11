from __future__ import annotations

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import OperatorIdentity, require_operator
from app.config import settings
from app.database import get_db
from app.services.storage_service import upload_evidence


router = APIRouter(prefix="/api/evidence", tags=["evidence"])


@router.post("/upload", response_model=schemas.EvidenceUploadOut, status_code=201)
async def create_evidence_upload(
    file: UploadFile = File(...),
    identity: OperatorIdentity = Depends(require_operator),
    db: Session = Depends(get_db),
):
    content = await file.read(settings.evidence_max_upload_bytes + 1)
    object_path, evidence_hash = await upload_evidence(content, file.content_type or "application/octet-stream")
    upload = models.EvidenceUpload(
        object_path=object_path,
        evidence_hash=evidence_hash,
        mime_type=file.content_type or "application/octet-stream",
        size_bytes=len(content),
        uploaded_by=identity.email or identity.subject,
    )
    db.add(upload)
    db.commit()
    db.refresh(upload)
    return upload
