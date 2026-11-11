from datetime import datetime, timedelta, timezone

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models import PriceRecord, Product
from app.services.overview_service import latest_prices_by_product


def test_latest_price_clue_skips_newer_record_without_price():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine, expire_on_commit=False)()
    product = Product(name="Overview Camera")
    session.add(product)
    session.flush()
    now = datetime.now(timezone.utc)
    clue = PriceRecord(
        product_id=product.id,
        list_price=4999,
        verification_status="VISIBLE_PRICE",
        captured_at=now - timedelta(hours=1),
    )
    unpriced = PriceRecord(
        product_id=product.id,
        verification_status="UNVERIFIED",
        captured_at=now,
    )
    session.add_all([clue, unpriced])
    session.commit()

    latest_any = latest_prices_by_product(session, [product.id])[product.id]
    latest_clue = latest_prices_by_product(
        session, [product.id], ["VISIBLE_PRICE", "UNVERIFIED"], priced_only=True
    )[product.id]

    assert latest_any.id == unpriced.id
    assert latest_clue.id == clue.id
