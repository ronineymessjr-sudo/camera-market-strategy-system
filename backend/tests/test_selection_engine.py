from datetime import datetime, timedelta, timezone

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models import EvidenceUpload, PriceEvidence, PriceRecord, Product, Strategy
from app.services.selection_engine import build_selection_candidates


def test_selection_engine_only_flags_fresh_verified_strategy_price():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine, expire_on_commit=False)()
    product = Product(name="Sigma 17-40", priority=100)
    session.add(product)
    session.flush()
    session.add(Strategy(
        product_id=product.id,
        strategy_name="Ronin",
        trigger_price=4500,
        strong_buy_price=4300,
        currency="CNY",
        max_price_age_hours=24,
    ))
    now = datetime.now(timezone.utc)
    price = PriceRecord(
        product_id=product.id,
        checkout_price=4299,
        currency="CNY",
        verification_status="VERIFIED_CHECKOUT",
        verified_at=now,
        valid_until=now + timedelta(hours=24),
        captured_at=now,
        needs_review=False,
    )
    session.add(price)
    session.flush()
    upload = EvidenceUpload(
        object_path="selection-checkout.png",
        evidence_hash="c" * 64,
        mime_type="image/png",
        size_bytes=10,
        uploaded_by="test",
        consumed_by_price_record_id=price.id,
    )
    session.add(upload)
    session.flush()
    session.add(PriceEvidence(
        price_record_id=price.id,
        upload_id=upload.id,
        evidence_type="CHECKOUT",
        origin="OPERATOR_UPLOAD",
        trusted_for_strategy=True,
    ))
    session.commit()

    candidate = build_selection_candidates(session)[0]
    assert candidate.is_buy_signal is True
    assert candidate.status == "STRATEGY_TRIGGERED_STRONG"
