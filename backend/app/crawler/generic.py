from __future__ import annotations

import hashlib
import json
import math
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

from playwright.async_api import Browser, Error as PlaywrightError, async_playwright

from app.config import settings
from .base import CrawlResult, PriceExtraction
from .parsers import ParserProfile, profile_for_url


SCREENSHOT_DIR = Path(__file__).resolve().parents[1] / "static" / "screenshots"
SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)

ACCESS_DENIED_MARKERS = (
    "access denied",
    "访问被拒绝",
    "请求被拒绝",
    "forbidden",
    "captcha",
    "验证码",
    "安全验证",
)

STRONG_PRICE_WORDS = (
    "到手价",
    "券后价",
    "实付",
    "活动价",
    "促销价",
    "会员价",
    "sale price",
    "current price",
    "now",
)

WEAK_PRICE_WORDS = ("价格", "售价", "price", "优惠", "折后", "低至", "from")

CURRENCY_PATTERNS: tuple[tuple[str, str], ...] = (
    (r"(?:¥|￥|RMB\s*|CNY\s*)([0-9][0-9,]*(?:\.[0-9]{1,2})?)", "CNY"),
    (r"(?:US\$|USD\s*|\$)([0-9][0-9,]*(?:\.[0-9]{1,2})?)", "USD"),
    (r"(?:JPY\s*|JP¥\s*)([0-9][0-9,]*(?:\.[0-9]{1,2})?)", "JPY"),
    (r"([0-9][0-9,]*(?:\.[0-9]{1,2})?)\s*(?:元|人民币)", "CNY"),
    (r"([0-9][0-9,]*(?:\.[0-9]{1,2})?)\s*(?:円|日元)", "JPY"),
)

KEYWORD_PATTERN = re.compile(
    r"(?:到手价|券后价|实付|活动价|促销价|会员价|售价|价格|低至|sale price|current price|price|from)"
    r"\s*[:：]?\s*(?:¥|￥|RMB|CNY|US\$|USD|\$|JPY|JP¥)?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)",
    re.IGNORECASE,
)

MODEL_NUMBER_MARKERS = ("mm", "f/", "f1.", "f2.", "gb", "tb", "mah", "像素", "分辨率", "×", "x")


def _to_float(raw: str) -> float | None:
    try:
        value = float(raw.replace(",", ""))
    except (TypeError, ValueError):
        return None
    if not math.isfinite(value) or value <= 0:
        return None
    return value


def _context(text: str, start: int, end: int, radius: int = 90) -> str:
    return " ".join(text[max(0, start - radius): min(len(text), end + radius)].split())


def _score_candidate(value: float, context: str, currency: str | None, method: str) -> float:
    lowered = context.lower()
    score = 0.15
    if any(word in lowered for word in STRONG_PRICE_WORDS):
        score += 0.45
    elif any(word in lowered for word in WEAK_PRICE_WORDS):
        score += 0.22
    if currency:
        score += 0.22
    if 50 <= value <= 200_000:
        score += 0.12
    if method.startswith("dom") or method == "json_ld":
        score += 0.15
    if any(marker in lowered for marker in MODEL_NUMBER_MARKERS) and not any(word in lowered for word in STRONG_PRICE_WORDS):
        score -= 0.32
    if "原价" in context or "划线价" in context or "建议零售价" in context or "list price" in lowered or "msrp" in lowered:
        score -= 0.22
    return max(0.0, min(round(score, 3), 1.0))


def extract_visible_price(text: str, *, dom_candidates: Iterable[tuple[str, str | None, str]] = ()) -> PriceExtraction:
    """Extract a visible price clue without claiming it is a checkout total.

    Returns the highest-confidence candidate plus the exact text/context used.
    Pure function so it can be covered by unit tests.
    """
    candidates: list[PriceExtraction] = []

    for raw_text, currency_hint, method in dom_candidates:
        if not raw_text:
            continue
        raw_match = re.search(r"([0-9][0-9,]*(?:\.[0-9]{1,2})?)", raw_text)
        if not raw_match:
            continue
        value = _to_float(raw_match.group(1))
        if value is None:
            continue
        currency = currency_hint or _currency_from_text(raw_text)
        confidence = _score_candidate(value, raw_text, currency, method)
        candidates.append(PriceExtraction(value, raw_match.group(0), raw_text[:300], currency, confidence, method))

    for regex, currency in CURRENCY_PATTERNS:
        for match in re.finditer(regex, text, re.IGNORECASE):
            value = _to_float(match.group(1))
            if value is None:
                continue
            context = _context(text, match.start(), match.end())
            scoring_context = text[max(0, match.start() - 28): min(len(text), match.end() + 4)]
            confidence = _score_candidate(value, scoring_context, currency, "currency_regex")
            candidates.append(PriceExtraction(value, match.group(0), context, currency, confidence, "currency_regex"))

    for match in KEYWORD_PATTERN.finditer(text):
        value = _to_float(match.group(1))
        if value is None:
            continue
        context = _context(text, match.start(), match.end())
        currency = _currency_from_text(context)
        confidence = _score_candidate(value, context, currency, "keyword_regex")
        candidates.append(PriceExtraction(value, match.group(0), context, currency, confidence, "keyword_regex"))

    if not candidates:
        return PriceExtraction(None, None, None, None, 0.0, "none")

    candidates.sort(key=lambda item: (item.confidence, _keyword_rank(item.context or "")), reverse=True)
    best = candidates[0]
    if best.confidence < 0.35:
        return PriceExtraction(None, best.raw_text, best.context, best.currency, best.confidence, best.method)
    return best


def _keyword_rank(context: str) -> int:
    lowered = context.lower()
    for index, word in enumerate(STRONG_PRICE_WORDS):
        if word in lowered:
            return len(STRONG_PRICE_WORDS) - index
    return 0


def _currency_from_text(text: str) -> str | None:
    lowered = text.lower()
    if any(token in text for token in ("¥", "￥", "人民币", "元")) or "cny" in lowered or "rmb" in lowered:
        return "CNY"
    if "us$" in lowered or "usd" in lowered or "$" in text:
        return "USD"
    if "jp¥" in lowered or "jpy" in lowered or "日元" in text or "円" in text:
        return "JPY"
    return None


async def _extract_dom_candidates(page, profile: ParserProfile) -> list[tuple[str, str | None, str]]:
    candidates: list[tuple[str, str | None, str]] = []

    # Structured metadata is usually less ambiguous than body-wide regex.
    meta_selectors = (
        "meta[itemprop='price']",
        "meta[property='product:price:amount']",
        "meta[property='og:price:amount']",
    )
    for selector in meta_selectors:
        locator = page.locator(selector).first
        try:
            if await locator.count():
                value = await locator.get_attribute("content")
                if value:
                    currency_locator = page.locator("meta[itemprop='priceCurrency'], meta[property='product:price:currency']").first
                    currency = await currency_locator.get_attribute("content") if await currency_locator.count() else None
                    candidates.append((value, currency, "dom_meta"))
        except PlaywrightError:
            continue

    for selector in profile.price_selectors:
        try:
            locator = page.locator(selector)
            count = min(await locator.count(), 5)
            for index in range(count):
                text = " ".join((await locator.nth(index).inner_text(timeout=1500)).split())
                if text:
                    candidates.append((text, None, f"dom_selector:{profile.name}"))
        except PlaywrightError:
            continue

    try:
        scripts = page.locator("script[type='application/ld+json']")
        count = min(await scripts.count(), 6)
        for index in range(count):
            raw = await scripts.nth(index).text_content()
            if not raw:
                continue
            try:
                payload = json.loads(raw)
            except json.JSONDecodeError:
                continue
            for price, currency in _walk_json_prices(payload):
                candidates.append((str(price), currency, "json_ld"))
    except PlaywrightError:
        pass

    return candidates


def _walk_json_prices(payload):
    if isinstance(payload, dict):
        price = payload.get("price") or payload.get("lowPrice")
        currency = payload.get("priceCurrency")
        if price is not None:
            yield price, currency
        for value in payload.values():
            yield from _walk_json_prices(value)
    elif isinstance(payload, list):
        for value in payload:
            yield from _walk_json_prices(value)


async def crawl_page_with_browser(
    browser: Browser,
    url: str,
    screenshot_name: str,
    *,
    timeout_ms: int | None = None,
) -> CrawlResult:
    profile = profile_for_url(url)
    timeout_ms = timeout_ms or settings.crawler_timeout_ms
    context = await browser.new_context(
        locale="zh-CN",
        user_agent=(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"
        ),
        viewport={"width": 1440, "height": 1000},
    )
    page = await context.new_page()
    screenshot_path = SCREENSHOT_DIR / screenshot_name
    title: str | None = None
    body_text = ""
    error: str | None = None
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=timeout_ms)
        await page.wait_for_timeout(profile.wait_ms)
        title = await page.title()
        body_text = await page.locator("body").inner_text(timeout=10_000)
        await page.screenshot(path=str(screenshot_path), full_page=True)
        dom_candidates = await _extract_dom_candidates(page, profile)
    except Exception as exc:  # Playwright raises several subclasses depending on the failure.
        error = f"{type(exc).__name__}: {exc}"
        dom_candidates = []
        try:
            await page.screenshot(path=str(screenshot_path), full_page=True)
        except Exception:
            pass
    finally:
        await context.close()

    combined = f"{title or ''}\n{body_text}"
    blocked = any(marker in combined.lower() for marker in ACCESS_DENIED_MARKERS)
    extraction = extract_visible_price(body_text, dom_candidates=dom_candidates)
    screenshot_hash = _sha256(screenshot_path) if screenshot_path.exists() else None

    if error or blocked:
        verification_status = "UNVERIFIED"
        stock_status = "ACCESS_DENIED" if blocked else "CRAWL_ERROR"
        confidence = 0.0 if blocked else extraction.confidence
    elif extraction.value is not None:
        verification_status = "VISIBLE_PRICE"
        stock_status = "UNKNOWN"
        confidence = extraction.confidence
    else:
        verification_status = "UNVERIFIED"
        stock_status = "UNKNOWN"
        confidence = extraction.confidence

    return CrawlResult(
        title=title,
        visible_price=extraction.value,
        coupon_text=None,
        seller_name=None,
        stock_status=stock_status,
        screenshot_path=f"/static/screenshots/{screenshot_path.name}" if screenshot_path.exists() else None,
        screenshot_hash=screenshot_hash,
        source_url=url,
        verification_status=verification_status,
        raw_price_text=extraction.raw_text,
        raw_price_context=(extraction.context or error or "")[:1200] or None,
        currency=extraction.currency,
        region=None,
        confidence_score=confidence,
        extraction_method=extraction.method,
        needs_review=verification_status in {"VISIBLE_PRICE", "UNVERIFIED"},
        error=error,
    )


async def crawl_generic_page(url: str, screenshot_name: str = "page.png") -> CrawlResult:
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=settings.crawler_headless)
        try:
            return await crawl_page_with_browser(browser, url, screenshot_name)
        finally:
            await browser.close()


def screenshot_filename(listing_id: int) -> str:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    return f"listing_{listing_id}_{stamp}.png"


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()
