from datetime import datetime, timedelta

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models import EvidenceUpload, PriceEvidence, PriceRecord, Product, Strategy
from app.schemas import BacktestRequest
from app.services.quant_engine import backtest_strategy, quant_indicators


def test_quant_indicators_and_backtest():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    db = Session()
    product = Product(name="Test Lens", is_active=True)
    db.add(product)
    db.flush()
    strategy = Strategy(
        product_id=product.id,
        strategy_name="test",
        trigger_price=4500,
        strong_buy_price=4300,
        currency="CNY",
    )
    db.add(strategy)
    now = datetime.utcnow()
    for index, price in enumerate([5000, 4800, 4600, 4450, 4250, 4400, 4700]):
        record = PriceRecord(
            product_id=product.id,
            checkout_price=price,
            currency="CNY",
            verification_status="VERIFIED_CHECKOUT",
            needs_review=False,
            captured_at=now - timedelta(days=6-index),
        )
        db.add(record)
        db.flush()
        upload = EvidenceUpload(
            object_path=f"quant-{index}.png",
            evidence_hash=str(index) * 64,
            mime_type="image/png",
            size_bytes=10,
            uploaded_by="test",
            consumed_by_price_record_id=record.id,
        )
        db.add(upload)
        db.flush()
        db.add(PriceEvidence(
            price_record_id=record.id,
            upload_id=upload.id,
            evidence_type="CHECKOUT",
            origin="OPERATOR_UPLOAD",
            trusted_for_strategy=True,
        ))
    db.commit()

    indicators = quant_indicators(db, product.id, window_days=30)
    assert indicators.sample_count == 7
    assert indicators.latest_price == 4700
    assert indicators.max_drawdown_pct is not None

    result = backtest_strategy(db, BacktestRequest(
        product_id=product.id,
        strategy_id=strategy.id,
        window_days=30,
    ))
    assert result.trigger_count == 3
    assert result.strong_trigger_count == 1
    assert result.lowest_price == 4250
