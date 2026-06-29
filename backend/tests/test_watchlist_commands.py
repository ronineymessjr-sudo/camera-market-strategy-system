from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models import PlatformListing, Product, Strategy
from app.services.watchlist_commands import execute_watchlist_command


def test_watchlist_command_add_and_archive():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine, expire_on_commit=False)()

    result = execute_watchlist_command(
        session,
        "添加 Sigma 17-40 F1.8 触发价4500 强买价4300 https://example.com/item",
    )
    assert result.product is not None
    assert result.product.is_active is True
    assert session.query(PlatformListing).count() == 1
    strategy = session.query(Strategy).first()
    assert float(strategy.trigger_price) == 4500
    assert float(strategy.strong_buy_price) == 4300

    removed = execute_watchlist_command(session, "移除 Sigma 17-40 F1.8")
    assert removed.product is not None
    assert removed.product.is_active is False
    assert session.query(Product).count() == 1
    assert session.query(PlatformListing).first().is_active is False
