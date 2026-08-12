from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import settings
from app.database import Base, get_db
from app.main import app
from app.models import PriceRecord, Product


def test_purchase_confirmation_requires_current_verified_checkout():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Session = sessionmaker(bind=engine, expire_on_commit=False)
    Base.metadata.create_all(engine)
    db = Session()
    product = Product(name="Purchase confirmation lens")
    db.add(product)
    db.flush()
    price = PriceRecord(
        product_id=product.id,
        checkout_price=1234,
        currency="CNY",
        source_url="https://example.test/product",
        verification_status="VERIFIED_CHECKOUT",
        valid_until=datetime.now(timezone.utc) + timedelta(hours=1),
        needs_review=False,
    )
    db.add(price)
    db.commit()

    def override_db():
        session = Session()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_db
    settings.operator_api_token = "test-operator-token"
    try:
        client = TestClient(app)
        assert client.get("/api/purchases").status_code == 401
        assert client.post("/api/purchases", json={"price_record_id": price.id}).status_code == 401

        response = client.post(
            "/api/purchases",
            headers={"X-Operator-Token": "test-operator-token"},
            json={"price_record_id": price.id, "note": "Open the source and place the order manually."},
        )
        assert response.status_code == 201
        payload = response.json()
        assert payload["status"] == "CONFIRMED"
        assert payload["checkout_price"] == 1234
        assert payload["source_url"] == "https://example.test/product"

        listed = client.get(
            "/api/purchases",
            headers={"X-Operator-Token": "test-operator-token"},
        )
        assert listed.status_code == 200
        assert [item["id"] for item in listed.json()] == [payload["id"]]

        assert client.patch(
            f"/api/purchases/{payload['id']}",
            json={"status": "COMPLETED"},
        ).status_code == 401
        completed = client.patch(
            f"/api/purchases/{payload['id']}",
            headers={"X-Operator-Token": "test-operator-token"},
            json={"status": "COMPLETED"},
        )
        assert completed.status_code == 200
        assert completed.json()["status"] == "COMPLETED"
        assert completed.json()["completed_at"] is not None

        price.valid_until = datetime.now(timezone.utc) - timedelta(minutes=1)
        db.commit()
        expired = client.post(
            "/api/purchases",
            headers={"X-Operator-Token": "test-operator-token"},
            json={"price_record_id": price.id},
        )
        assert expired.status_code == 409
    finally:
        app.dependency_overrides.clear()
        settings.operator_api_token = None
