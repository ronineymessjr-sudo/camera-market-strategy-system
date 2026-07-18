import json

import httpx
import pytest

from app.config import settings
from app.integrations import amazon as amazon_module
from app.integrations.amazon import AmazonProductProvider
from app.integrations.base import ProviderSearchRequest
from app.integrations.ebay import EbayBrowseProvider
from app.integrations.jd import JDUnionProvider
from app.integrations.pdd import PddDdkProvider
from app.integrations.taobao import TaobaoAllianceProvider


def test_jd_offer_normalization():
    offer = JDUnionProvider()._normalize({
        "skuId": 123,
        "skuName": "Lens",
        "priceInfo": {"price": 5000, "lowestPrice": 4700},
        "couponInfo": {"discount": 200},
        "shopName": "JD Shop",
    })
    assert offer.effective_price == 4500
    assert offer.external_id == "123"


def test_taobao_offer_normalization():
    offer = TaobaoAllianceProvider()._normalize({
        "item_id": "abc",
        "title": "Lens",
        "reserve_price": "5000",
        "zk_final_price": "4700",
        "coupon_amount": "300",
    })
    assert offer.effective_price == 4400


def test_pdd_offer_normalization_uses_fen():
    offer = PddDdkProvider()._normalize({
        "goods_id": 5,
        "goods_name": "Lens",
        "min_normal_price": 500000,
        "min_group_price": 460000,
        "coupon_discount": 20000,
    })
    assert offer.list_price == 5000
    assert offer.effective_price == 4400


def test_ebay_offer_normalization():
    offer = EbayBrowseProvider()._normalize({
        "itemId": "v1|123",
        "title": "Used Camera",
        "itemWebUrl": "https://www.ebay.com/itm/123",
        "seller": {"username": "camera_shop"},
        "price": {"value": "899.99", "currency": "USD"},
        "itemAvailabilityStatus": "IN_STOCK",
    })
    assert offer.external_id == "v1|123"
    assert offer.effective_price == 899.99
    assert offer.currency == "USD"


def test_amazon_offer_normalization():
    offer = AmazonProductProvider()._normalize({
        "asin": "B00TEST",
        "detailPageURL": "https://www.amazon.com/dp/B00TEST",
        "itemInfo": {"title": {"displayValue": "Mirrorless Camera"}},
        "offersV2": {
            "listings": [{
                "price": {
                    "money": {"amount": 1299.0, "currency": "USD"},
                    "savingBasis": {"money": {"amount": 1499.0, "currency": "USD"}},
                },
                "merchantInfo": {"name": "Camera Store"},
                "availability": {"type": "Now"},
            }]
        },
    })
    assert offer.external_id == "B00TEST"
    assert offer.list_price == 1499.0
    assert offer.effective_price == 1299.0
    assert offer.currency == "USD"
    assert offer.seller_name == "Camera Store"


@pytest.mark.asyncio
async def test_amazon_creators_api_oauth_and_search(monkeypatch):
    monkeypatch.setattr(settings, "amazon_credential_id", "credential-id")
    monkeypatch.setattr(settings, "amazon_credential_secret", "credential-secret")
    monkeypatch.setattr(settings, "amazon_credential_version", "3.1")
    monkeypatch.setattr(settings, "amazon_marketplace", "www.amazon.com")
    monkeypatch.setattr(settings, "amazon_partner_tag", "camera-20")

    def handler(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content)
        if request.url.path == "/auth/o2/token":
            assert body["scope"] == "creatorsapi::default"
            return httpx.Response(200, json={"access_token": "token", "expires_in": 3600})

        assert request.url.path == "/catalog/v1/searchItems"
        assert request.headers["authorization"] == "Bearer token"
        assert request.headers["x-marketplace"] == "www.amazon.com"
        assert body["partnerTag"] == "camera-20"
        assert "offersV2.listings.price" in body["resources"]
        return httpx.Response(
            200,
            headers={"x-amzn-requestid": "request-123"},
            json={
                "searchResult": {
                    "items": [{
                        "asin": "B00TEST",
                        "itemInfo": {"title": {"displayValue": "Mirrorless Camera"}},
                        "offersV2": {
                            "listings": [{
                                "price": {"money": {"amount": 1299.0, "currency": "USD"}}
                            }]
                        },
                    }]
                }
            },
        )

    real_async_client = httpx.AsyncClient
    transport = httpx.MockTransport(handler)
    monkeypatch.setattr(
        amazon_module.httpx,
        "AsyncClient",
        lambda **kwargs: real_async_client(transport=transport, **kwargs),
    )

    result = await AmazonProductProvider().search(ProviderSearchRequest(keyword="camera", page_size=5))

    assert result.request_id == "request-123"
    assert len(result.offers) == 1
    assert result.offers[0].effective_price == 1299.0
