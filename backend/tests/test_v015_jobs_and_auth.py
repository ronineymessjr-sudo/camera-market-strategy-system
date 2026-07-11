from types import SimpleNamespace

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import auth
from app.routers import evidence as evidence_router
from app.schema_upgrade import upgrade_local_schema
from app.models import PriceRecord, Product, Signal
from app.config import settings
from app.database import Base, get_db
from app.main import app
from app.services.job_queue import claim_next_job, enqueue_job


def _database():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, expire_on_commit=False)


def test_job_queue_claims_once():
    factory = _database()
    db = factory()
    queued = enqueue_job(db, "REPORT", {}, idempotency_key="report:test")
    duplicate = enqueue_job(db, "REPORT", {}, idempotency_key="report:test")
    assert duplicate.id == queued.id
    claimed = claim_next_job(db, "worker-test")
    assert claimed.id == queued.id
    assert claimed.status == "RUNNING"
    assert claim_next_job(db, "worker-other") is None


def test_job_endpoint_returns_accepted():
    factory = _database()

    def override_db():
        db = factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_db
    settings.operator_api_token = "test-operator-token"
    try:
        response = TestClient(app).post(
            "/api/jobs/reports",
            headers={"X-Operator-Token": "test-operator-token"},
        )
        assert response.status_code == 202
        assert response.json()["status"] == "QUEUED"
    finally:
        app.dependency_overrides.clear()
        settings.operator_api_token = None


def test_cloudflare_access_identity_is_verified(monkeypatch):
    settings.cloudflare_access_team_domain = "https://team.cloudflareaccess.com"
    settings.cloudflare_access_audience = "audience"
    settings.operator_email = "owner@example.com"
    monkeypatch.setattr(auth, "_jwk_client", lambda _: SimpleNamespace(
        get_signing_key_from_jwt=lambda __: SimpleNamespace(key="public-key")
    ))
    monkeypatch.setattr(auth.jwt, "decode", lambda *args, **kwargs: {
        "sub": "operator-subject",
        "email": "owner@example.com",
    })
    try:
        identity = auth._cloudflare_identity("signed-token")
        assert identity.email == "owner@example.com"
        assert identity.auth_method == "cloudflare-access"
    finally:
        settings.cloudflare_access_team_domain = None
        settings.cloudflare_access_audience = None
        settings.operator_email = None


def test_evidence_upload_records_server_hash(monkeypatch):
    factory = _database()

    def override_db():
        db = factory()
        try:
            yield db
        finally:
            db.close()

    async def fake_upload(content: bytes, mime_type: str):
        assert content == b"checkout-proof"
        assert mime_type == "image/png"
        return "2026/07/proof.png", "d" * 64

    app.dependency_overrides[get_db] = override_db
    settings.operator_api_token = "test-operator-token"
    monkeypatch.setattr(evidence_router, "upload_evidence", fake_upload)
    try:
        response = TestClient(app).post(
            "/api/evidence/upload",
            headers={"X-Operator-Token": "test-operator-token"},
            files={"file": ("proof.png", b"checkout-proof", "image/png")},
        )
        assert response.status_code == 201
        assert response.json()["evidence_hash"] == "d" * 64
        assert response.json()["object_path"] == "2026/07/proof.png"
    finally:
        app.dependency_overrides.clear()
        settings.operator_api_token = None


def test_local_upgrade_downgrades_unproven_legacy_signal():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, expire_on_commit=False)
    db = factory()
    product = Product(name="Legacy camera")
    db.add(product)
    db.flush()
    price = PriceRecord(
        product_id=product.id,
        checkout_price=1000,
        currency="CNY",
        verification_status="VERIFIED_CHECKOUT",
        needs_review=False,
    )
    db.add(price)
    db.flush()
    signal = Signal(product_id=product.id, price_record_id=price.id, signal_type="BUY_TRIGGERED", triggered=True)
    db.add(signal)
    db.commit()

    upgrade_local_schema(engine)
    db.expire_all()
    assert db.get(PriceRecord, price.id).verification_status == "UNVERIFIED"
    assert db.get(PriceRecord, price.id).needs_review is True
    assert db.get(Signal, signal.id).triggered is False
