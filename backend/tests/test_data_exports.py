from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import settings
from app.database import Base, get_db
from app.main import app
from app.models import PriceEvidence, PriceRecord, Product


def test_evidence_export_contains_only_trusted_rows_by_default():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    TestingSession = sessionmaker(bind=engine, expire_on_commit=False)
    Base.metadata.create_all(engine)
    db = TestingSession()
    product = Product(name="Evidence Camera")
    db.add(product)
    db.flush()
    price = PriceRecord(
        product_id=product.id,
        checkout_price=3999,
        currency="CNY",
        verification_status="VERIFIED_CHECKOUT",
        needs_review=False,
    )
    db.add(price)
    db.flush()
    db.add_all([
        PriceEvidence(
            price_record_id=price.id,
            evidence_type="CHECKOUT",
            origin="OPERATOR_UPLOAD",
            trusted_for_strategy=True,
            evidence_hash="trusted-hash",
        ),
        PriceEvidence(
            price_record_id=price.id,
            evidence_type="PAGE",
            origin="USER_METADATA",
            trusted_for_strategy=False,
            evidence_hash="clue-hash",
        ),
    ])
    db.commit()

    def override_db():
        session = TestingSession()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_db
    settings.operator_api_token = "test-operator-token"
    try:
        response = TestClient(app).get(
            "/api/evidence/export.csv",
            headers={"X-Operator-Token": "test-operator-token"},
        )
        assert response.status_code == 200
        assert "trusted-hash" in response.text
        assert "clue-hash" not in response.text
        assert "Evidence Camera" in response.text

        price_response = TestClient(app).get(
            "/api/prices/export.csv?status=verified",
            headers={"X-Operator-Token": "test-operator-token"},
        )
        assert price_response.status_code == 200
        assert "price-history-verified.csv" in price_response.headers["content-disposition"]
        assert "Evidence Camera" in price_response.text
        assert "VERIFIED_CHECKOUT" in price_response.text
    finally:
        app.dependency_overrides.clear()
        settings.operator_api_token = None
