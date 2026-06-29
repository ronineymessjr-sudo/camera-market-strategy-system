from app.integrations.amazon import AmazonProductProvider
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
        "ASIN": "B00TEST",
        "DetailPageURL": "https://www.amazon.com/dp/B00TEST",
        "ItemInfo": {"Title": {"DisplayValue": "Mirrorless Camera"}},
        "Offers": {
            "Listings": [{
                "Price": {"Amount": 1299.0, "Currency": "USD"},
                "SavingBasis": {"Amount": 1499.0, "Currency": "USD"},
                "Availability": {"Type": "Now"},
            }]
        },
    })
    assert offer.external_id == "B00TEST"
    assert offer.list_price == 1499.0
    assert offer.effective_price == 1299.0
    assert offer.currency == "USD"
