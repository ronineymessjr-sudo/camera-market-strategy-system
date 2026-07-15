from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models import PlatformListing, Product, Strategy
from app.services.watchlist_io import export_watchlist_csv, import_watchlist_csv


def test_watchlist_csv_import_is_idempotent_and_exportable():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    db = sessionmaker(bind=engine, expire_on_commit=False)()

    first = import_watchlist_csv(
        db,
        (
            "name,brand,category,source_url,platform,trigger_price,strong_buy_price,priority\n"
            "Sony A7 IV,Sony,Camera,https://example.com/a7iv,jd,12000,11000,10\n"
        ).encode(),
    )
    assert first.created_products == 1
    assert first.created_listings == 1
    assert first.created_strategies == 1

    second = import_watchlist_csv(
        db,
        (
            "name,brand,category,source_url,platform,trigger_price,strong_buy_price,priority\n"
            "Sony A7 IV,Sony,Camera,https://example.com/a7iv,jd,11800,10800,20\n"
        ).encode(),
    )
    assert second.created_products == 0
    assert second.updated_products == 1
    assert second.updated_listings == 1
    assert second.updated_strategies == 1
    assert db.query(Product).count() == 1
    assert db.query(PlatformListing).count() == 1
    assert db.query(Strategy).count() == 1
    assert float(db.query(Strategy).one().trigger_price) == 11800
    assert db.query(Product).one().priority == 20

    exported = export_watchlist_csv(db, include_archived=True)
    assert "Sony A7 IV" in exported
    assert "https://example.com/a7iv" in exported
    assert "11800" in exported


def test_watchlist_csv_rejects_rows_without_name():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    db = sessionmaker(bind=engine)()

    try:
        import_watchlist_csv(db, b"brand,source_url\nSony,https://example.com/a7iv\n")
    except ValueError as exc:
        assert "name column" in str(exc)
    else:
        raise AssertionError("missing name column must be rejected")
