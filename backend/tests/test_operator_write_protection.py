from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import settings
from app.database import Base, get_db
from app.main import app
from app.models import Product


def test_anonymous_write_request_is_rejected():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    TestingSession = sessionmaker(bind=engine, expire_on_commit=False)
    Base.metadata.create_all(engine)

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
        response = client.post("/api/products", json={"name": "Protected Camera"})
        assert response.status_code == 401
    finally:
        app.dependency_overrides.clear()
        settings.operator_api_token = None


def test_price_create_cannot_directly_create_verified_checkout():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    TestingSession = sessionmaker(bind=engine, expire_on_commit=False)
    Base.metadata.create_all(engine)
    db = TestingSession()
    product = Product(name="Verified bypass test")
    db.add(product)
    db.commit()
    db.refresh(product)

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
            "/api/prices",
            headers={"Authorization": "Bearer test-operator-token"},
            json={
                "product_id": product.id,
                "checkout_price": 4299,
                "verification_status": "VERIFIED_CHECKOUT",
                "currency": "CNY",
                "needs_review": False,
            },
        )
        assert response.status_code == 422
        assert "verify-checkout" in response.json()["detail"]
    finally:
        app.dependency_overrides.clear()
        settings.operator_api_token = None
