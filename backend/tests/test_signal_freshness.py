from datetime import datetime, timedelta, timezone

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models import PriceRecord, Product, Strategy
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
    session.commit()

    signal = refresh_signal_for_strategy(session, strategy)
    assert signal.signal_type == "STALE"
    assert signal.triggered is False
