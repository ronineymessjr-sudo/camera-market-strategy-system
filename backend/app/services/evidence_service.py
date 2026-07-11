from __future__ import annotations

from sqlalchemy.orm import Session
from fastapi import HTTPException

from app import models, schemas


def replace_price_evidence(
    db: Session,
    price_record: models.PriceRecord,
    evidence: list[schemas.PriceEvidenceCreate],
    adjustments: list[schemas.PriceAdjustmentCreate],
    *,
    verified_by: str,
) -> None:
    db.query(models.PriceEvidence).filter(models.PriceEvidence.price_record_id == price_record.id).delete(
        synchronize_session=False
    )
    db.query(models.PriceAdjustment).filter(models.PriceAdjustment.price_record_id == price_record.id).delete(
        synchronize_session=False
    )

    for item in evidence:
        data = item.model_dump()
        evidence_type = data["evidence_type"].upper()
        upload = None
        trusted = evidence_type in {"CHECKOUT", "CART", "ORDER"}
        if trusted:
            upload = db.get(models.EvidenceUpload, data.get("upload_id"))
            if not upload:
                raise HTTPException(422, "Trusted evidence upload was not found")
            if upload.consumed_by_price_record_id not in {None, price_record.id}:
                raise HTTPException(409, "Evidence upload has already been used")
            upload.consumed_by_price_record_id = price_record.id
        db.add(
            models.PriceEvidence(
                price_record_id=price_record.id,
                upload_id=upload.id if upload else None,
                evidence_type=evidence_type,
                origin="OPERATOR_UPLOAD" if upload else "USER_METADATA",
                trusted_for_strategy=trusted,
                object_path=upload.object_path if upload else data.get("object_path"),
                evidence_hash=upload.evidence_hash if upload else data.get("evidence_hash"),
                source_url=data.get("source_url") or price_record.source_url,
                sku_id=data.get("sku_id"),
                seller_name=data.get("seller_name") or price_record.seller_name,
                region=data.get("region") or price_record.region,
                captured_at=data.get("captured_at"),
                verified_by=verified_by,
                note=data.get("note"),
            )
        )

    for item in adjustments:
        data = item.model_dump()
        db.add(
            models.PriceAdjustment(
                price_record_id=price_record.id,
                adjustment_type=data["adjustment_type"].upper(),
                label=data.get("label"),
                amount=data["amount"],
                currency=data["currency"].upper(),
            )
        )


def evidence_summary(db: Session, price_record_id: int) -> dict[str, int]:
    evidence_count = db.query(models.PriceEvidence).filter(models.PriceEvidence.price_record_id == price_record_id).count()
    adjustment_count = (
        db.query(models.PriceAdjustment).filter(models.PriceAdjustment.price_record_id == price_record_id).count()
    )
    return {"evidence_count": evidence_count, "adjustment_count": adjustment_count}
