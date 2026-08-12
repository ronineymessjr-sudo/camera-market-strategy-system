from __future__ import annotations

import json
import sqlite3
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / "backend" / "camera_market.db"
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
BASE = f"http://127.0.0.1:{PORT}"


def fetch(path: str):
    with urllib.request.urlopen(BASE + path, timeout=10) as response:
        return response.status, json.loads(response.read().decode("utf-8"))


def main() -> int:
    print("== API ==")
    for path in ("/api/system/health", "/api/products/overview", "/api/prices/stats", "/api/strategies", "/api/signals/today", "/api/reports/daily", "/api/system/last-flow"):
        try:
            status, data = fetch(path)
            count = len(data) if isinstance(data, list) else "object"
            print(f"{path}: {status}, {count}")
        except Exception as exc:
            print(f"{path}: ERROR {exc}")
            return 1

    if DB.exists():
        print("\n== SQLite ==")
        conn = sqlite3.connect(DB)
        for table in ("products", "platform_listings", "price_records", "strategies", "signals", "daily_reports", "flow_runs"):
            count = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
            print(f"{table}: {count}")
        rows = conn.execute("SELECT verification_status, COUNT(*) FROM price_records GROUP BY verification_status").fetchall()
        print("price statuses:", dict(rows))
        invalid_triggered = conn.execute("""
            SELECT COUNT(*)
            FROM signals s
            LEFT JOIN price_records p ON p.id = s.price_record_id
            WHERE s.triggered = 1
              AND (
                p.id IS NULL
                OR p.verification_status <> 'VERIFIED_CHECKOUT'
                OR p.valid_until IS NULL
                OR datetime(p.valid_until) < datetime('now')
                OR NOT EXISTS (
                  SELECT 1 FROM price_evidence e
                  WHERE e.price_record_id = p.id AND e.trusted_for_strategy = 1
                )
              )
        """).fetchone()[0]
        print("invalid triggered signals:", invalid_triggered)
        if invalid_triggered:
            conn.close()
            return 1
        conn.close()
    else:
        print(f"SQLite DB not found at {DB}; DATABASE_URL may point elsewhere.")

    screenshots = list((ROOT / "backend" / "app" / "static" / "screenshots").glob("*.png"))
    charts = list((ROOT / "backend" / "app" / "static" / "charts").glob("*.png"))
    print(f"screenshots: {len(screenshots)}")
    print(f"charts: {len(charts)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
