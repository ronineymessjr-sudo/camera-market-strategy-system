from __future__ import annotations

import csv
import io

from fastapi import APIRouter, Depends, File, Query, Response, UploadFile
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import OperatorIdentity, require_operator
from app.config import settings
from app.database import get_db
from app.services.storage_service import upload_evidence


router = APIRouter(prefix="/api/evidence", tags=["evidence"])


@router.get("/export.csv")
def export_evidence_audit(
    trusted_only: bool = Query(default=True),
    _: OperatorIdentity = Depends(require_operator),
    db: Session = Depends(get_db),
):
    query = (
        db.query(models.PriceEvidence, models.PriceRecord, models.Product)
        .join(models.PriceRecord, models.PriceRecord.id == models.PriceEvidence.price_record_id)
        .join(models.Product, models.Product.id == models.PriceRecord.product_id)
    )
    if trusted_only:
        query = query.filter(models.PriceEvidence.trusted_for_strategy.is_(True))
    rows = query.order_by(models.PriceEvidence.created_at.desc(), models.PriceEvidence.id.desc()).all()

    output = io.StringIO(newline="")
    writer = csv.writer(output)
    writer.writerow([
        "product", "price_record_id", "verification_status", "checkout_price", "currency", "valid_until",
        "evidence_id", "evidence_type", "origin", "trusted_for_strategy", "object_path", "evidence_hash",
        "source_url", "seller_name", "region", "captured_at", "verified_by", "note", "created_at",
    ])
    for evidence, price, product in rows:
        writer.writerow([
            product.name,
            price.id,
            price.verification_status,
            price.checkout_price or "",
            price.currency or "",
            price.valid_until.isoformat() if price.valid_until else "",
            evidence.id,
            evidence.evidence_type,
            evidence.origin,
            evidence.trusted_for_strategy,
            evidence.object_path or "",
            evidence.evidence_hash or "",
            evidence.source_url or "",
            evidence.seller_name or "",
            evidence.region or "",
            evidence.captured_at.isoformat() if evidence.captured_at else "",
            evidence.verified_by or "",
            evidence.note or "",
            evidence.created_at.isoformat() if evidence.created_at else "",
        ])
    return Response(
        content="\ufeff" + output.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="verified-price-evidence.csv"'},
    )


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
