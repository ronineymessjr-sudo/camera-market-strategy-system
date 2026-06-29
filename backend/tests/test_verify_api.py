from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models import PriceRecord, Product, Strategy


def test_verify_checkout_creates_signal():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSession = sessionmaker(bind=engine, expire_on_commit=False)
    Base.metadata.create_all(engine)
    db = TestingSession()
    product = Product(name="Test lens")
    db.add(product)
    db.flush()
    db.add(Strategy(product_id=product.id, strategy_name="Test", trigger_price=4500, strong_buy_price=4300))
    record = PriceRecord(product_id=product.id, promotion_price=4299, verification_status="VISIBLE_PRICE", needs_review=True)
    db.add(record)
    db.commit()
    db.refresh(record)

    def override_db():
        session = TestingSession()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_db
    try:
        client = TestClient(app)
        response = client.post(
            f"/api/prices/{record.id}/verify-checkout",
            json={"checkout_price": 4299, "note": "订单结算页人工核验", "currency": "CNY", "region": "CN"},
        )
        assert response.status_code == 200
        assert response.json()["verification_status"] == "VERIFIED_CHECKOUT"
        signals = client.get("/api/signals").json()
        assert signals[0]["signal_type"] == "STRONG_BUY"
    finally:
        app.dependency_overrides.clear()
