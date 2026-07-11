from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models import EvidenceUpload, PriceRecord, Product, Strategy
from app.config import settings


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
    upload = EvidenceUpload(
        object_path="2026/07/checkout.png",
        evidence_hash="a" * 64,
        mime_type="image/png",
        size_bytes=128,
        uploaded_by="operator-token",
    )
    db.add(upload)
    db.commit()
    db.refresh(record)
    db.refresh(upload)

    def override_db():
        session = TestingSession()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_db
    settings.operator_api_token = "test-operator-token"
    try:
        client = TestClient(app)
        response = client.post(
            f"/api/prices/{record.id}/verify-checkout",
            headers={"X-Operator-Token": "test-operator-token"},
            json={
                "checkout_price": 4299,
                "note": "订单结算页人工核验",
                "currency": "CNY",
                "region": "CN",
                "evidence": [{"evidence_type": "CHECKOUT", "upload_id": upload.id}],
            },
        )
        assert response.status_code == 200
        assert response.json()["verification_status"] == "VERIFIED_CHECKOUT"
        evidence = client.get(f"/api/prices/{record.id}/evidence").json()
        assert evidence[0]["evidence_type"] == "CHECKOUT"
        assert evidence[0]["trusted_for_strategy"] is True
        signals = client.get("/api/signals").json()
        assert signals[0]["signal_type"] == "STRONG_BUY"
        notifications = client.get("/api/notifications").json()
        assert notifications[0]["type"] == "SIGNAL_TRIGGERED"
    finally:
        app.dependency_overrides.clear()
        settings.operator_api_token = None
