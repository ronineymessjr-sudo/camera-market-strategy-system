from __future__ import annotations

import json
import sqlite3
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / "backend" / "camera_market.db"
BASE = "http://127.0.0.1:8000"


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
