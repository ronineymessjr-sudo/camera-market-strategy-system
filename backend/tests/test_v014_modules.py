from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import settings
from app.database import Base, get_db
from app.main import app
from app.models import PriceRecord, Product, SourceHealthHistory


def test_verify_checkout_requires_structured_evidence():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    TestingSession = sessionmaker(bind=engine, expire_on_commit=False)
    Base.metadata.create_all(engine)
    db = TestingSession()
    product = Product(name="Evidence Required Camera")
    db.add(product)
    db.flush()
    record = PriceRecord(product_id=product.id, promotion_price=4299, verification_status="VISIBLE_PRICE")
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
    settings.operator_api_token = "test-operator-token"
    try:
        client = TestClient(app)
        response = client.post(
            f"/api/prices/{record.id}/verify-checkout",
            headers={"X-Operator-Token": "test-operator-token"},
            json={"checkout_price": 4299, "note": "missing evidence", "currency": "CNY", "region": "CN"},
        )
        assert response.status_code == 422
        assert "evidence" in response.text
    finally:
        app.dependency_overrides.clear()
        settings.operator_api_token = None


def test_source_health_rolls_up_runtime_history():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    TestingSession = sessionmaker(bind=engine, expire_on_commit=False)
    Base.metadata.create_all(engine)
    db = TestingSession()
    now = datetime.now(timezone.utc)
    db.add(SourceHealthHistory(provider="jd", status="SUCCESS", mode="crawler", latency_ms=100, checked_at=now))
    db.add(SourceHealthHistory(provider="jd", status="FAILED", mode="crawler", latency_ms=200, checked_at=now))
    db.commit()

    def override_db():
        session = TestingSession()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_db
    try:
        client = TestClient(app)
        response = client.get("/api/source-health")
        assert response.status_code == 200
        jd = next(item for item in response.json() if item["provider"] == "jd")
        assert jd["status"] == "DEGRADED"
        assert jd["success_count"] == 1
        assert jd["failure_count"] == 1
        assert jd["average_latency_ms"] == 150
    finally:
        app.dependency_overrides.clear()
