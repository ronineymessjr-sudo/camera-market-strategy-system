from __future__ import annotations

import logging
from sqlalchemy import Engine, inspect, text

logger = logging.getLogger(__name__)


SQLITE_COLUMNS: dict[str, dict[str, str]] = {
    "products": {
        "tags": "TEXT",
        "is_active": "BOOLEAN DEFAULT 1",
        "archived_at": "DATETIME",
    },
    "price_records": {
        "raw_price_text": "TEXT",
        "raw_price_context": "TEXT",
        "currency": "VARCHAR(12)",
        "region": "VARCHAR(80)",
        "confidence_score": "FLOAT",
        "extraction_method": "VARCHAR(80)",
        "needs_review": "BOOLEAN DEFAULT 1",
        "screenshot_hash": "VARCHAR(128)",
        "review_note": "TEXT",
        "verified_at": "DATETIME",
        "valid_until": "DATETIME",
        "verified_by": "VARCHAR(80)",
    },
    "strategies": {
        "watch_price": "NUMERIC(12, 2)",
        "currency": "VARCHAR(12) DEFAULT 'CNY'",
        "max_price_age_hours": "INTEGER DEFAULT 24",
        "near_target_pct": "FLOAT DEFAULT 5.0",
        "notes": "TEXT",
    },
    "signals": {
        "reason_code": "VARCHAR(80)",
        "is_current": "BOOLEAN DEFAULT 1",
    },
    "daily_reports": {
        "updated_at": "DATETIME",
    },
}


def upgrade_local_schema(engine: Engine) -> None:
    """Apply additive SQLite upgrades without deleting existing local data."""
    if engine.dialect.name != "sqlite":
        return

    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    with engine.begin() as conn:
        for table_name, columns in SQLITE_COLUMNS.items():
            if table_name not in existing_tables:
                continue
            existing = {column["name"] for column in inspector.get_columns(table_name)}
            for column_name, ddl in columns.items():
                if column_name in existing:
                    continue
                logger.info("Adding SQLite column %s.%s", table_name, column_name)
                conn.execute(text(f'ALTER TABLE "{table_name}" ADD COLUMN "{column_name}" {ddl}'))

        if "products" in existing_tables:
            conn.execute(text("UPDATE products SET is_active = 1 WHERE is_active IS NULL"))

        if "price_records" in existing_tables:
            conn.execute(text(
                "UPDATE price_records SET needs_review = 0 "
                "WHERE verification_status IN ('VERIFIED_CHECKOUT', 'INVALID')"
            ))
            conn.execute(text(
                "UPDATE price_records SET verified_at = COALESCE(verified_at, captured_at) "
                "WHERE verification_status = 'VERIFIED_CHECKOUT'"
            ))
            # Existing verified records are deliberately not made permanently fresh.
            # They remain historical facts until the user re-verifies a current checkout.

        if "strategies" in existing_tables:
            conn.execute(text("UPDATE strategies SET max_price_age_hours = 24 WHERE max_price_age_hours IS NULL"))
            conn.execute(text("UPDATE strategies SET near_target_pct = 5.0 WHERE near_target_pct IS NULL"))

        if "signals" in existing_tables:
            conn.execute(text("UPDATE signals SET is_current = 1 WHERE is_current IS NULL"))
            # Keep only the newest signal current for each strategy.
            conn.execute(text(
                "UPDATE signals SET is_current = 0 "
                "WHERE strategy_id IS NOT NULL AND id NOT IN ("
                "SELECT MAX(id) FROM signals WHERE strategy_id IS NOT NULL GROUP BY strategy_id"
                ")"
            ))
