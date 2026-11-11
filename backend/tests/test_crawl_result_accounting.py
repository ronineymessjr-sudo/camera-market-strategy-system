from app.crawler.base import CrawlResult
from app.services.crawler_runner import ListingSnapshot, _crawl_run_status, _failure_for_result


def _listing() -> ListingSnapshot:
    return ListingSnapshot(1, 7, "generic", "Example seller", "https://example.com/product")


def _result(**overrides) -> CrawlResult:
    values = {
        "title": "Example product",
        "visible_price": None,
        "coupon_text": None,
        "seller_name": "Example seller",
        "stock_status": "UNKNOWN",
        "screenshot_path": None,
        "screenshot_hash": None,
        "source_url": "https://example.com/product",
        "verification_status": "UNVERIFIED",
        "raw_price_text": None,
        "raw_price_context": None,
        "currency": None,
        "region": None,
        "confidence_score": 0.0,
        "extraction_method": "none",
        "needs_review": True,
        "error": None,
    }
    values.update(overrides)
    return CrawlResult(**values)


def test_page_without_price_is_not_a_successful_crawl():
    failure = _failure_for_result(_listing(), _result())

    assert failure == {
        "listing_id": 1,
        "url": "https://example.com/product",
        "error_type": "PRICE_NOT_EXTRACTED",
        "error": "The page loaded but no visible price was extracted",
    }
    assert _crawl_run_status(0, 1) == "FAILED"


def test_extracted_visible_price_counts_as_success():
    result = _result(visible_price=4999, verification_status="VISIBLE_PRICE", extraction_method="json_ld")

    assert _failure_for_result(_listing(), result) is None
    assert _crawl_run_status(1, 0) == "SUCCESS"


def test_mixed_price_extraction_run_is_partial():
    assert _crawl_run_status(11, 12) == "PARTIAL"
