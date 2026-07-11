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
    "price_evidence": {
        "upload_id": "INTEGER",
        "origin": "VARCHAR(40) DEFAULT 'USER_METADATA'",
        "trusted_for_strategy": "BOOLEAN DEFAULT 0",
    },
    "notification_deliveries": {
        "attempts": "INTEGER DEFAULT 0",
        "next_attempt_at": "DATETIME",
    },
    "daily_reports": {
        "updated_at": "DATETIME",
    },
}


SQLITE_TABLES: dict[str, str] = {
    "evidence_uploads": """
        CREATE TABLE evidence_uploads (
            id INTEGER PRIMARY KEY,
            object_path TEXT NOT NULL UNIQUE,
            evidence_hash VARCHAR(128) NOT NULL,
            mime_type VARCHAR(120) NOT NULL,
            size_bytes INTEGER NOT NULL,
            uploaded_by VARCHAR(200) NOT NULL,
            consumed_by_price_record_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """,
    "price_evidence": """
        CREATE TABLE price_evidence (
            id INTEGER PRIMARY KEY,
            price_record_id INTEGER NOT NULL,
            upload_id INTEGER,
            evidence_type VARCHAR(40) NOT NULL,
            origin VARCHAR(40) DEFAULT 'USER_METADATA',
            trusted_for_strategy BOOLEAN DEFAULT 0,
            object_path TEXT,
            evidence_hash VARCHAR(128),
            source_url TEXT,
            sku_id VARCHAR(120),
            seller_name TEXT,
            region VARCHAR(80),
            captured_at DATETIME,
            verified_by VARCHAR(80),
            note TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """,
    "price_adjustments": """
        CREATE TABLE price_adjustments (
            id INTEGER PRIMARY KEY,
            price_record_id INTEGER NOT NULL,
            adjustment_type VARCHAR(80) NOT NULL,
            label TEXT,
            amount NUMERIC(12, 2) NOT NULL,
            currency VARCHAR(12) DEFAULT 'CNY',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """,
    "source_health_history": """
        CREATE TABLE source_health_history (
            id INTEGER PRIMARY KEY,
            provider VARCHAR(40) NOT NULL,
            status VARCHAR(40) NOT NULL,
            mode VARCHAR(80),
            latency_ms INTEGER,
            checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            details TEXT
        )
    """,
    "notifications": """
        CREATE TABLE notifications (
            id INTEGER PRIMARY KEY,
            product_id INTEGER,
            signal_id INTEGER,
            type VARCHAR(80) NOT NULL,
            title TEXT NOT NULL,
            body TEXT,
            status VARCHAR(40) DEFAULT 'UNREAD',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            read_at DATETIME
        )
    """,
    "notification_deliveries": """
        CREATE TABLE notification_deliveries (
            id INTEGER PRIMARY KEY,
            notification_id INTEGER NOT NULL,
            channel VARCHAR(80) NOT NULL,
            status VARCHAR(40) DEFAULT 'PENDING',
            attempts INTEGER DEFAULT 0,
            next_attempt_at DATETIME,
            request_json TEXT,
            response_json TEXT,
            error_message TEXT,
            delivered_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """,
    "background_jobs": """
        CREATE TABLE background_jobs (
            id INTEGER PRIMARY KEY,
            job_type VARCHAR(80) NOT NULL,
            status VARCHAR(40) DEFAULT 'QUEUED',
            idempotency_key VARCHAR(200) UNIQUE,
            payload_json TEXT,
            result_json TEXT,
            error_message TEXT,
            worker_id VARCHAR(160),
            attempts INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            started_at DATETIME,
            finished_at DATETIME
        )
    """,
}


def upgrade_local_schema(engine: Engine) -> None:
    """Apply additive SQLite upgrades without deleting existing local data."""
    if engine.dialect.name != "sqlite":
        return

    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    with engine.begin() as conn:
        for table_name, ddl in SQLITE_TABLES.items():
            if table_name not in existing_tables:
                logger.info("Creating SQLite table %s", table_name)
                conn.execute(text(ddl))

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
            conn.execute(text(
                "UPDATE price_records SET verification_status = 'UNVERIFIED', needs_review = 1, valid_until = NULL "
                "WHERE verification_status = 'VERIFIED_CHECKOUT' AND NOT EXISTS ("
                "SELECT 1 FROM price_evidence e WHERE e.price_record_id = price_records.id "
                "AND e.trusted_for_strategy = 1)"
            ))

        if "strategies" in existing_tables:
            conn.execute(text("UPDATE strategies SET max_price_age_hours = 24 WHERE max_price_age_hours IS NULL"))
            conn.execute(text("UPDATE strategies SET near_target_pct = 5.0 WHERE near_target_pct IS NULL"))

        if "signals" in existing_tables:
            conn.execute(text(
                "UPDATE signals SET triggered = 0, signal_type = 'UNVERIFIED', "
                "reason_code = 'NO_TRUSTED_EVIDENCE', message = 'Trusted checkout evidence is required.' "
                "WHERE triggered = 1 AND price_record_id IN ("
                "SELECT id FROM price_records WHERE verification_status <> 'VERIFIED_CHECKOUT')"
            ))
            conn.execute(text("UPDATE signals SET is_current = 1 WHERE is_current IS NULL"))
            # Keep only the newest signal current for each strategy.
            conn.execute(text(
                "UPDATE signals SET is_current = 0 "
                "WHERE strategy_id IS NOT NULL AND id NOT IN ("
                "SELECT MAX(id) FROM signals WHERE strategy_id IS NOT NULL GROUP BY strategy_id"
                ")"
            ))
