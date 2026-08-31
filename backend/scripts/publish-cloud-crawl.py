"""Publish a sanitized local crawl result to the public Cloudflare store."""

from __future__ import annotations

import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from app.database import SessionLocal
from app.models import PlatformListing, Product


INGEST_URL = "https://camera-market-intelligence.photomagic.workers.dev/api/cloud-crawl/ingest"
OIDC_AUDIENCE = "camera-market-cloud-crawl"
ALLOWED_STATUS = {"VISIBLE_PRICE", "UNVERIFIED"}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("crawl_result", type=Path)
    args = parser.parse_args()
    source = json.loads(args.crawl_result.read_text(encoding="utf-8"))
    payload = build_payload(source)
    token = request_oidc_token()
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    request = Request(
        INGEST_URL,
        data=body,
        method="POST",
        headers={
            "accept": "application/json",
            "content-type": "application/json",
            "authorization": f"Bearer {token}",
        },
    )
    try:
        with urlopen(request, timeout=60) as response:
            response_body = response.read().decode("utf-8")
            status = response.status
    except Exception as exc:
        raise SystemExit(f"cloud crawl ingest failed: {exc}") from exc
    if status < 200 or status >= 300:
        raise SystemExit(f"cloud crawl ingest returned HTTP {status}: {response_body[:500]}")
    print(response_body)


def build_payload(source: dict) -> dict:
    run = source.get("run") or {}
    items = source.get("records")
    if not isinstance(items, list):
        raise SystemExit("crawl result has no records list")
    with SessionLocal() as db:
        products = {item.id: item for item in db.query(Product).all()}
        listings = {item.id: item for item in db.query(PlatformListing).all()}
        records = [sanitize_record(item, products, listings) for item in items]
    return {
        "run": {
            "local_run_id": positive_int(run.get("id")),
            "status": run.get("status"),
            "started_at": run.get("started_at"),
            "finished_at": run.get("finished_at"),
            "duration_seconds": run.get("duration_seconds"),
            "total_count": run.get("total_count", 0),
            "success_count": run.get("success_count", 0),
            "failure_count": run.get("failure_count", 0),
            "skipped_count": run.get("skipped_count", 0),
        },
        "records": records,
    }


def sanitize_record(item: dict, products: dict, listings: dict) -> dict:
    if not isinstance(item, dict):
        raise SystemExit("crawl result contains a non-object record")
    forbidden = ("checkout_price", "verified_at", "verified_by", "evidence", "raw_price_text", "raw_price_context")
    if any(item.get(field) is not None for field in forbidden):
        raise SystemExit("refusing to publish checkout or raw evidence fields")
    status = item.get("verification_status")
    if status not in ALLOWED_STATUS:
        raise SystemExit(f"refusing to publish unsupported verification status: {status}")
    product = products.get(positive_int(item.get("product_id")))
    listing = listings.get(positive_int(item.get("listing_id")))
    if product is None or listing is None or listing.product_id != product.id:
        raise SystemExit("crawl result references an unknown product/listing")
    captured_at = item.get("captured_at") or datetime.now(timezone.utc).isoformat()
    return {
        "product_id": product.id,
        "listing_id": listing.id,
        "product_name": product.name,
        "brand": product.brand or "",
        "category": product.category or "",
        "title": item.get("title") or "",
        "platform": listing.platform or "",
        "source_url": listing.url,
        "list_price": nullable_float(item.get("list_price")),
        "promotion_price": nullable_float(item.get("promotion_price")),
        "currency": (item.get("currency") or "").upper(),
        "stock_status": item.get("stock_status") or "",
        "verification_status": status,
        "confidence_score": nullable_float(item.get("confidence_score")),
        "extraction_method": item.get("extraction_method") or "",
        "captured_at": captured_at,
    }


def request_oidc_token() -> str:
    endpoint = os.environ.get("ACTIONS_ID_TOKEN_REQUEST_URL")
    request_token = os.environ.get("ACTIONS_ID_TOKEN_REQUEST_TOKEN")
    if not endpoint or not request_token:
        raise SystemExit("GitHub Actions OIDC environment is unavailable")
    separator = "&" if "?" in endpoint else "?"
    url = f"{endpoint}{separator}{urlencode({'audience': OIDC_AUDIENCE})}"
    request = Request(url, headers={"Authorization": f"bearer {request_token}", "accept": "application/json"})
    try:
        with urlopen(request, timeout=30) as response:
            data = json.loads(response.read().decode("utf-8"))
    except Exception as exc:
        raise SystemExit(f"GitHub Actions OIDC request failed: {exc}") from exc
    value = data.get("value")
    if not isinstance(value, str) or not value:
        raise SystemExit("GitHub Actions OIDC response did not contain a token")
    return value


def positive_int(value):
    try:
        value = int(value)
    except (TypeError, ValueError):
        return None
    return value if value > 0 else None


def nullable_float(value):
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError) as exc:
        raise SystemExit(f"invalid numeric crawl field: {value!r}") from exc


if __name__ == "__main__":
    main()
