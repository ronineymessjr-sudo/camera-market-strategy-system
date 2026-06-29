from datetime import date

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models import PriceRecord, Product, Strategy
from app.services.report_generator import ReportGenerator


def test_report_separates_visible_clue_from_verified_price(tmp_path, monkeypatch):
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine, expire_on_commit=False)()
    product = Product(name="Sigma 17-40mm F1.8 DC Art Sony E", priority=100)
    session.add(product)
    session.flush()
    session.add(Strategy(product_id=product.id, strategy_name="test", trigger_price=4500, strong_buy_price=4300))
    session.add(PriceRecord(
        product_id=product.id,
        platform="official",
        promotion_price=4299,
        verification_status="VISIBLE_PRICE",
        raw_price_text="¥4299",
        raw_price_context="页面可见价 ¥4299",
        currency="CNY",
        confidence_score=0.8,
        needs_review=True,
    ))
    session.commit()

    report = ReportGenerator(session).generate(date.today())
    assert "今日暂无可核验好价" in report.markdown_content
    assert "VISIBLE_PRICE" in report.markdown_content
    assert "STRONG_BUY" not in report.summary
