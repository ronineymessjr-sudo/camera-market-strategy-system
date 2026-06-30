from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models import PlatformListing, PriceRecord, Product
from app.routers.products import _PRODUCT_SNAPSHOT_CACHE


def test_product_refresh_snapshot_uses_cache_and_invalidates_on_listing_create():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSession = sessionmaker(bind=engine, expire_on_commit=False)
    Base.metadata.create_all(engine)

    db = TestingSession()
    product = Product(name="Snapshot Camera", brand="Demo")
    db.add(product)
    db.flush()
    db.add(
        PlatformListing(
            product_id=product.id,
            platform="jd",
            seller_name="JD Demo",
            url="https://example.com/jd-camera",
        )
    )
    db.add(
        PriceRecord(
            product_id=product.id,
            platform="jd",
            promotion_price=4499,
            verification_status="VISIBLE_PRICE",
        )
    )
    db.commit()

    def override_db():
        session = TestingSession()
        try:
            yield session
        finally:
            session.close()

    _PRODUCT_SNAPSHOT_CACHE.clear()
    app.dependency_overrides[get_db] = override_db
    try:
        client = TestClient(app)
        first = client.get(f"/api/products/{product.id}/refresh-snapshot")
        second = client.get(f"/api/products/{product.id}/refresh-snapshot")

        assert first.status_code == 200
        assert first.json()["source"] == "refresh"
        assert second.status_code == 200
        assert second.json()["source"] == "cache"
        assert second.json()["active_listing_count"] == 1

        created = client.post(
            f"/api/products/{product.id}/listings",
            json={
                "platform": "taobao",
                "seller_name": "Taobao Demo",
                "url": "https://example.com/taobao-camera",
            },
        )
        assert created.status_code == 201

        refreshed = client.get(f"/api/products/{product.id}/refresh-snapshot")
        assert refreshed.status_code == 200
        assert refreshed.json()["source"] == "refresh"
        assert refreshed.json()["active_listing_count"] == 2
    finally:
        _PRODUCT_SNAPSHOT_CACHE.clear()
        app.dependency_overrides.clear()
