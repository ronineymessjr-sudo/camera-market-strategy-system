from __future__ import annotations

import os
import time
from pathlib import Path

import httpx
from playwright.sync_api import sync_playwright


def required(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise SystemExit(f"{name} is required")
    return value


def main() -> None:
    base_url = required("E2E_BASE_URL").rstrip("/")
    if any(value in base_url for value in ("localhost", "127.0.0.1", "loca.lt", "trycloudflare.com")):
        raise SystemExit("E2E_BASE_URL must be a staging HTTPS URL")
    access_id = required("CLOUDFLARE_ACCESS_CLIENT_ID")
    access_secret = required("CLOUDFLARE_ACCESS_CLIENT_SECRET")
    operator_token = required("OPERATOR_API_TOKEN")
    evidence_file = Path(required("E2E_EVIDENCE_FILE")).resolve()
    if not evidence_file.is_file():
        raise SystemExit("E2E_EVIDENCE_FILE does not exist")

    headers = {
        "CF-Access-Client-Id": access_id,
        "CF-Access-Client-Secret": access_secret,
        "X-Operator-Token": operator_token,
    }
    product_id = None
    with httpx.Client(base_url=base_url, headers=headers, timeout=30.0) as api:
        stamp = int(time.time())
        product = api.post("/api/products", json={"name": f"V015 staging evidence test {stamp}", "priority": 999})
        product.raise_for_status()
        product_id = product.json()["id"]
        strategy = api.post("/api/strategies", json={
            "product_id": product_id,
            "strategy_name": "V0.15 staging trust test",
            "trigger_price": 200,
            "strong_buy_price": 150,
            "currency": "CNY",
            "max_price_age_hours": 24,
        })
        strategy.raise_for_status()
        clue = api.post("/api/prices", json={
            "product_id": product_id,
            "promotion_price": 120,
            "currency": "CNY",
            "region": "CN",
            "verification_status": "VISIBLE_PRICE",
            "confidence_score": 1,
            "needs_review": True,
            "source_url": "https://example.com/staging-e2e-source",
        })
        clue.raise_for_status()

        try:
            with sync_playwright() as playwright:
                browser = playwright.chromium.launch(headless=True)
                context = browser.new_context(extra_http_headers=headers)
                page = context.new_page()
                page.goto(f"{base_url}/verification?product_id={product_id}", wait_until="networkidle")
                page.get_by_label("Checkout evidence file").set_input_files(str(evidence_file))
                page.get_by_label("Final checkout price").fill("120")
                page.get_by_role("button", name="Promote to VERIFIED_CHECKOUT").click()
                page.wait_for_load_state("networkidle")
                browser.close()

            signals = api.get(f"/api/signals/product/{product_id}")
            signals.raise_for_status()
            if not any(item["triggered"] for item in signals.json()):
                raise SystemExit("Staging E2E failed: trusted evidence did not trigger the strategy")
            notifications = api.get("/api/notifications?unread_only=true")
            notifications.raise_for_status()
            if not any(item.get("product_id") == product_id for item in notifications.json()):
                raise SystemExit("Staging E2E failed: signal notification was not created")
            print(f"Staging E2E passed for product {product_id}")
        finally:
            if product_id is not None:
                api.delete(f"/api/products/{product_id}").raise_for_status()


if __name__ == "__main__":
    main()
