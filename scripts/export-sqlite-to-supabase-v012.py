from __future__ import annotations

import argparse
import json
import sqlite3
from collections import OrderedDict
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from typing import Any


TABLE_MAP = OrderedDict(
    [
        ("products", "products"),
        ("platform_listings", "product_listings"),
        ("price_records", "price_records"),
        ("strategies", "strategies"),
        ("signals", "signals"),
        ("daily_reports", "daily_reports"),
        ("flow_runs", "flow_runs"),
        ("watchlist_command_logs", "watchlist_command_logs"),
        ("external_offers", "external_offers"),
        ("integration_runs", "integration_runs"),
        ("strategy_backtests", "strategy_backtests"),
    ]
)

BOOLEAN_COLUMNS = {
    "products": {"is_active"},
    "platform_listings": {"is_active"},
    "price_records": {"needs_review"},
    "strategies": {"is_active"},
    "signals": {"triggered", "is_current"},
}


def connect(db_path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def table_exists(conn: sqlite3.Connection, table: str) -> bool:
    row = conn.execute(
        "select 1 from sqlite_master where type = 'table' and name = ?",
        (table,),
    ).fetchone()
    return row is not None


def table_columns(conn: sqlite3.Connection, table: str) -> list[str]:
    return [row["name"] for row in conn.execute(f"pragma table_info({quote_ident(table)})")]


def quote_ident(value: str) -> str:
    return '"' + value.replace('"', '""') + '"'


def sql_literal(value: Any, *, source_table: str | None = None, column: str | None = None) -> str:
    if value is None:
        return "null"
    if source_table and column and column in BOOLEAN_COLUMNS.get(source_table, set()):
        return "true" if bool(value) else "false"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, int | float | Decimal):
        return str(value)
    if isinstance(value, datetime):
        return "'" + value.isoformat().replace("'", "''") + "'"
    if isinstance(value, date):
        return "'" + value.isoformat().replace("'", "''") + "'"
    return "'" + str(value).replace("'", "''") + "'"


def summarize(conn: sqlite3.Connection) -> dict[str, Any]:
    tables = [
        row["name"]
        for row in conn.execute("select name from sqlite_master where type = 'table' order by name")
    ]
    counts: dict[str, int] = {}
    for table in tables:
        counts[table] = conn.execute(f"select count(*) from {quote_ident(table)}").fetchone()[0]
    return {"tables": tables, "counts": counts}


def json_value(value: Any, *, source_table: str, column: str) -> Any:
    if value is None:
        return None
    if column in BOOLEAN_COLUMNS.get(source_table, set()):
        return bool(value)
    return value


def normalized_row(row: sqlite3.Row, columns: list[str], source_table: str) -> dict[str, Any]:
    values = {column: row[column] for column in columns}
    if source_table == "daily_reports" and values.get("updated_at") is None:
        values["updated_at"] = values.get("created_at")
    return values


def export_json_seed(conn: sqlite3.Connection) -> dict[str, Any]:
    tables = []
    for source_table, target_table in TABLE_MAP.items():
        if not table_exists(conn, source_table):
            continue

        columns = table_columns(conn, source_table)
        rows = conn.execute(
            f"select * from {quote_ident(source_table)} order by id"
        ).fetchall()
        normalized_rows = [normalized_row(row, columns, source_table) for row in rows]
        tables.append(
            {
                "source": source_table,
                "target": target_table,
                "rows": [
                    {
                        column: json_value(row[column], source_table=source_table, column=column)
                        for column in columns
                    }
                    for row in normalized_rows
                ],
            }
        )
    return {"version": "v0.12", "tables": tables}


def export_sql(conn: sqlite3.Connection) -> str:
    lines = [
        "-- Generated from backend/camera_market.db by scripts/export-sqlite-to-supabase-v012.py",
        "-- Re-runnable seed for V0.12 Supabase production schema.",
        "begin;",
        "set constraints all deferred;",
    ]

    for source_table, target_table in TABLE_MAP.items():
        if not table_exists(conn, source_table):
            lines.append(f"-- skipped missing source table: {source_table}")
            continue

        columns = table_columns(conn, source_table)
        rows = conn.execute(
            f"select * from {quote_ident(source_table)} order by id"
        ).fetchall()
        if not rows:
            lines.append(f"-- skipped empty source table: {source_table}")
            continue

        quoted_columns = ", ".join(quote_ident(column) for column in columns)
        update_columns = [column for column in columns if column != "id"]
        update_clause = ", ".join(
            f"{quote_ident(column)} = excluded.{quote_ident(column)}" for column in update_columns
        )
        conflict_clause = (
            f"do update set {update_clause}" if update_clause else "do nothing"
        )

        lines.append(f"-- {source_table} -> public.{target_table}: {len(rows)} rows")
        for row in rows:
            row_values = normalized_row(row, columns, source_table)
            values = ", ".join(
                sql_literal(row_values[column], source_table=source_table, column=column)
                for column in columns
            )
            lines.append(
                f"insert into public.{quote_ident(target_table)} ({quoted_columns}) "
                f"values ({values}) on conflict (id) {conflict_clause};"
            )
        lines.append(
            "select setval("
            f"pg_get_serial_sequence('public.{target_table}', 'id'), "
            f"greatest(coalesce((select max(id) from public.{quote_ident(target_table)}), 1), 1), "
            "true"
            ");"
        )

    lines.extend(
        [
            "commit;",
            "",
            "-- Verification helpers:",
            "-- select verification_status, count(*) from public.price_records group by verification_status order by verification_status;",
            "-- select triggered, count(*) from public.signals group by triggered order by triggered;",
            "-- select count(*) from public.verification_audits;",
        ]
    )
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description="Export local SQLite data into Supabase V0.12 seed SQL.")
    parser.add_argument("--db", default="backend/camera_market.db", type=Path)
    parser.add_argument("--summary", action="store_true")
    parser.add_argument("--out", type=Path)
    parser.add_argument("--json-out", type=Path)
    args = parser.parse_args()

    conn = connect(args.db)
    if args.summary:
        print(json.dumps(summarize(conn), ensure_ascii=False, indent=2))
        return
    if args.json_out:
        args.json_out.parent.mkdir(parents=True, exist_ok=True)
        args.json_out.write_text(
            json.dumps(export_json_seed(conn), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        return

    sql = export_sql(conn)
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(sql, encoding="utf-8")
    else:
        print(sql)


if __name__ == "__main__":
    main()
