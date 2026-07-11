from datetime import datetime, timedelta, timezone

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models import EvidenceUpload, PriceEvidence, PriceRecord, Product, Strategy
from app.services.signal_service import refresh_signal_for_strategy


def test_stale_verified_price_never_triggers():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine, expire_on_commit=False)()
    product = Product(name="Sigma 17-40")
    session.add(product)
    session.flush()
    strategy = Strategy(
        product_id=product.id,
        strategy_name="test",
        trigger_price=4500,
        strong_buy_price=4300,
        max_price_age_hours=24,
    )
    session.add(strategy)
    old = datetime.now(timezone.utc) - timedelta(days=3)
    price = PriceRecord(
        product_id=product.id,
        checkout_price=4299,
        currency="CNY",
        verification_status="VERIFIED_CHECKOUT",
        verified_at=old,
        captured_at=old,
        needs_review=False,
    )
    session.add(price)
    session.flush()
    upload = EvidenceUpload(
        object_path="stale.png",
        evidence_hash="b" * 64,
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

    signal = refresh_signal_for_strategy(session, strategy)
    assert signal.signal_type == "STALE"
    assert signal.triggered is False


def test_verified_price_without_trusted_evidence_never_triggers():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine, expire_on_commit=False)()
    product = Product(name="Legacy checkout without proof")
    session.add(product)
    session.flush()
    strategy = Strategy(product_id=product.id, strategy_name="test", trigger_price=4500, currency="CNY")
    price = PriceRecord(
        product_id=product.id,
        checkout_price=4200,
        currency="CNY",
        verification_status="VERIFIED_CHECKOUT",
        verified_at=datetime.now(timezone.utc),
        captured_at=datetime.now(timezone.utc),
        needs_review=False,
    )
    session.add_all([strategy, price])
    session.commit()

    signal = refresh_signal_for_strategy(session, strategy, price)
    assert signal.reason_code == "NO_TRUSTED_EVIDENCE"
    assert signal.triggered is False


def test_unknown_currency_verified_price_never_triggers():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine, expire_on_commit=False)()
    product = Product(name="Currency unknown camera")
    session.add(product)
    session.flush()
    strategy = Strategy(
        product_id=product.id,
        strategy_name="test",
        trigger_price=4500,
        strong_buy_price=4300,
        currency="CNY",
    )
    session.add(strategy)
    price = PriceRecord(
        product_id=product.id,
        checkout_price=4299,
        currency=None,
        verification_status="VERIFIED_CHECKOUT",
        verified_at=datetime.now(timezone.utc),
        captured_at=datetime.now(timezone.utc),
        needs_review=False,
    )
    session.add(price)
    session.commit()

    signal = refresh_signal_for_strategy(session, strategy, price)
    assert signal.signal_type == "CURRENCY_UNKNOWN"
    assert signal.reason_code == "CURRENCY_UNKNOWN"
    assert signal.triggered is False
