from datetime import datetime, timedelta

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models import EvidenceUpload, PriceEvidence, PriceRecord, Product
from app.services.price_analytics import calculate_product_analytics


def test_price_analytics_detects_range_and_downtrend():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine, expire_on_commit=False)()
    product = Product(name="Test lens")
    session.add(product)
    session.flush()
    now = datetime.utcnow()
    for index, value in enumerate([5000, 4800, 4500, 4300]):
        price = PriceRecord(
            product_id=product.id,
            checkout_price=value,
            currency="CNY",
            verification_status="VERIFIED_CHECKOUT",
            captured_at=now - timedelta(days=3-index),
            verified_at=now - timedelta(days=3-index),
            needs_review=False,
        )
        session.add(price)
        session.flush()
        upload = EvidenceUpload(
            object_path=f"analytics-{index}.png",
            evidence_hash=str(index) * 64,
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

    result = calculate_product_analytics(session, product.id, window_days=30)
    assert result.is_sufficient is True
    assert result.min_price == 4300
    assert result.max_price == 5000
    assert result.trend == "DOWN"
    assert result.change_pct < 0
