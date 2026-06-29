from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request


BASE = "http://127.0.0.1:8000"


CHECKS = [
    ("GET", "/api/system/health", None, {200}),
    ("GET", "/api/integrations/providers", None, {200}),
    ("GET", "/api/integrations/offers", None, {200}),
    ("GET", "/api/prices/stats", None, {200}),
    ("GET", "/api/quant/products/1/indicators", None, {200}),
    ("GET", "/api/frontend/bootstrap", None, {200}),
    (
        "POST",
        "/api/quant/backtests",
        {"product_id": 1, "trigger_price": 4500, "strong_buy_price": 4300, "window_days": 30},
        {200},
    ),
    (
        "POST",
        "/api/integrations/jd/sync",
        {"keyword": "Sigma 17-40", "page_size": 5, "ingest": False},
        {409},
    ),
]


def request(method: str, path: str, payload: dict | None):
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        BASE + path,
        data=body,
        method=method,
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        text = exc.read().decode("utf-8")
        try:
            return exc.code, json.loads(text)
        except json.JSONDecodeError:
            return exc.code, {"detail": text}


def summarize(data):
    if isinstance(data, list):
        return f"list[{len(data)}]"
    if isinstance(data, dict):
        keys = ", ".join(list(data.keys())[:8])
        return f"object({keys})"
    return type(data).__name__


def main() -> int:
    failed = 0
    for method, path, payload, expected_statuses in CHECKS:
        status, data = request(method, path, payload)
        ok = status in expected_statuses
        print(f"{method} {path}: {status} {summarize(data)}")
        if not ok:
            failed += 1
            print(f"  expected one of {sorted(expected_statuses)}")
            print(f"  payload: {data}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
