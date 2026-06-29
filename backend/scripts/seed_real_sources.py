from pathlib import Path
import argparse
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database import SessionLocal, init_db
from app.models import PlatformListing, Product, Strategy


PRODUCTS = [
    {
        "name": "Sigma 17-40mm F1.8 DC Art Sony E",
        "brand": "Sigma", "category": "lens", "mount_type": "Sony E", "sensor_format": "APS-C", "priority": 100,
        "sources": [
            {"url": "https://www.sigma-global.com/en/lenses/a025_17_40_18/", "platform": "sigma_official", "seller": "Sigma Global"},
        ],
        "strategy": {"name": "Ronin APS-C Value Strategy", "trigger": 4500, "strong": 4300, "active": True,
                     "notes": "用户记录：618 叠加 88VIP、淘金币等曾出现约 ¥4200–¥4300；需订单或结算页截图后才能作为已核验价格。"},
    },
    {
        "name": "Tamron 17-70mm F2.8 Sony E",
        "brand": "Tamron", "category": "lens", "mount_type": "Sony E", "sensor_format": "APS-C", "priority": 90,
        "sources": [
            {"url": "https://www.tamron.com/global/consumer/lenses/b070/", "platform": "tamron_official", "seller": "Tamron"},
            {"url": "https://tamron-usa.com/product/lenses/b070.html", "platform": "tamron_official", "seller": "Tamron Americas"},
        ],
        "strategy": {"name": "Tamron 17-70 Watch", "trigger": None, "strong": None, "active": True,
                     "notes": "观察策略；等待用户设置具体触发线。"},
    },
    {
        "name": "Sigma 18-50mm F2.8 DC DN Sony E",
        "brand": "Sigma", "category": "lens", "mount_type": "Sony E", "sensor_format": "APS-C", "priority": 70,
        "sources": [
            {"url": "https://www.sigma-global.com/en/lenses/c021_18_50_28/", "platform": "sigma_official", "seller": "Sigma Global"},
        ],
        "strategy": {"name": "Sigma 18-50 Watch", "trigger": None, "strong": None, "active": True,
                     "notes": "APS-C 高性价比变焦观察策略。"},
    },
    {
        "name": "Viltrox 75mm F1.2 Sony E",
        "brand": "Viltrox", "category": "lens", "mount_type": "Sony E", "sensor_format": "APS-C", "priority": 65,
        "sources": [
            {"url": "https://viltrox.com/search?q=75mm%20F1.2", "platform": "viltrox_official", "seller": "Viltrox"},
            {"url": "https://viltrox.com/products/viltrox-75mm-f1-2-e-z-pro-lens", "platform": "viltrox_official", "seller": "Viltrox Store"},
        ],
        "strategy": {"name": "Viltrox 75 Watch", "trigger": None, "strong": None, "active": True,
                     "notes": "定焦 1000–3000 元、最大光圈 F2.0 或更大观察池。"},
    },
    {
        "name": "Sony 35mm F1.8 FE",
        "brand": "Sony", "category": "lens", "mount_type": "Sony E", "sensor_format": "Full Frame", "priority": 60,
        "sources": [
            {"url": "https://electronics.sony.com/imaging/lenses/all-e-mount/p/sel35f18f", "platform": "sony_official", "seller": "Sony"},
        ],
        "strategy": {"name": "Sony 35 FE Watch", "trigger": None, "strong": None, "active": True,
                     "notes": "全画幅定焦 1000–3000 元、最大光圈 F2.0 或更大观察池。"},
    },
    {
        "name": "DJI Pocket 3",
        "brand": "DJI", "category": "camera", "mount_type": None, "sensor_format": None, "priority": 50,
        "sources": [
            {"url": "https://store.dji.com/product/osmo-pocket-3", "platform": "dji_official", "seller": "DJI Store"},
        ],
        "strategy": {"name": "DJI Pocket 3 Watch", "trigger": None, "strong": None, "active": True,
                     "notes": "视频创作设备观察策略，等待用户定义触发线。"},
    },
    {
        "name": "iPad Air",
        "brand": "Apple", "category": "tablet", "mount_type": None, "sensor_format": None, "priority": 30,
        "sources": [
            {"url": "https://www.apple.com.cn/ipad-air/", "platform": "apple_official", "seller": "Apple Store"},
            {"url": "https://www.apple.com/shop/buy-ipad/ipad-air", "platform": "apple_official", "seller": "Apple Store"},
        ],
        "strategy": {"name": "iPad Air Watch", "trigger": None, "strong": None, "active": True,
                     "notes": "创作者设备观察策略，等待用户定义规格和触发线。"},
    },
    {
        "name": "Sony a6700",
        "brand": "Sony", "category": "camera", "mount_type": "Sony E", "sensor_format": "APS-C", "priority": 88,
        "sources": [
            {"url": "https://electronics.sony.com/imaging/interchangeable-lens-cameras/aps-c/p/ilce6700-b", "platform": "sony_official", "seller": "Sony"},
        ],
        "strategy": {"name": "Sony a6700 Watch", "trigger": None, "strong": None, "active": True,
                     "notes": "APS-C 机身主力观察策略，适合和镜头池组合看总预算。"},
    },
    {
        "name": "Sony ZV-E10 II",
        "brand": "Sony", "category": "camera", "mount_type": "Sony E", "sensor_format": "APS-C", "priority": 82,
        "sources": [
            {"url": "https://electronics.sony.com/imaging/interchangeable-lens-cameras/aps-c/p/ilczve10m2-b", "platform": "sony_official", "seller": "Sony"},
        ],
        "strategy": {"name": "Sony ZV-E10 II Watch", "trigger": None, "strong": None, "active": True,
                     "notes": "视频/轻量创作机身观察策略。"},
    },
    {
        "name": "Fujifilm X100VI",
        "brand": "Fujifilm", "category": "camera", "mount_type": "fixed", "sensor_format": "APS-C", "priority": 78,
        "sources": [
            {"url": "https://fujifilm-x.com/global/products/cameras/x100vi/", "platform": "fujifilm_official", "seller": "Fujifilm"},
        ],
        "strategy": {"name": "Fujifilm X100VI Watch", "trigger": None, "strong": None, "active": True,
                     "notes": "高热度固定镜头相机，重点关注溢价回落和官方渠道供货。"},
    },
    {
        "name": "Ricoh GR III",
        "brand": "Ricoh", "category": "camera", "mount_type": "fixed", "sensor_format": "APS-C", "priority": 76,
        "sources": [
            {"url": "https://www.ricoh-imaging.co.jp/english/products/gr-3/", "platform": "ricoh_official", "seller": "Ricoh"},
        ],
        "strategy": {"name": "Ricoh GR III Watch", "trigger": None, "strong": None, "active": True,
                     "notes": "街拍口袋机观察策略，关注供货和二级市场价格。"},
    },
    {
        "name": "Canon EOS R50",
        "brand": "Canon", "category": "camera", "mount_type": "Canon RF", "sensor_format": "APS-C", "priority": 68,
        "sources": [
            {"url": "https://www.usa.canon.com/shop/p/eos-r50", "platform": "canon_official", "seller": "Canon"},
        ],
        "strategy": {"name": "Canon EOS R50 Watch", "trigger": None, "strong": None, "active": True,
                     "notes": "入门无反机身观察策略。"},
    },
    {
        "name": "Nikon Z fc",
        "brand": "Nikon", "category": "camera", "mount_type": "Nikon Z", "sensor_format": "APS-C", "priority": 64,
        "sources": [
            {"url": "https://www.nikonusa.com/p/z-fc/1675", "platform": "nikon_official", "seller": "Nikon"},
        ],
        "strategy": {"name": "Nikon Z fc Watch", "trigger": None, "strong": None, "active": True,
                     "notes": "复古 APS-C 机身观察策略。"},
    },
    {
        "name": "Sigma 56mm F1.4 DC DN Sony E",
        "brand": "Sigma", "category": "lens", "mount_type": "Sony E", "sensor_format": "APS-C", "priority": 62,
        "sources": [
            {"url": "https://www.sigma-global.com/en/lenses/c018_56_14/", "platform": "sigma_official", "seller": "Sigma Global"},
        ],
        "strategy": {"name": "Sigma 56 F1.4 Watch", "trigger": None, "strong": None, "active": True,
                     "notes": "APS-C 人像定焦观察策略。"},
    },
    {
        "name": "Tamron 11-20mm F2.8 Sony E",
        "brand": "Tamron", "category": "lens", "mount_type": "Sony E", "sensor_format": "APS-C", "priority": 58,
        "sources": [
            {"url": "https://www.tamron.com/global/consumer/lenses/b060/", "platform": "tamron_official", "seller": "Tamron"},
        ],
        "strategy": {"name": "Tamron 11-20 Watch", "trigger": None, "strong": None, "active": True,
                     "notes": "APS-C 超广变焦观察策略。"},
    },
    {
        "name": "Sony E 70-350mm F4.5-6.3 G OSS",
        "brand": "Sony", "category": "lens", "mount_type": "Sony E", "sensor_format": "APS-C", "priority": 54,
        "sources": [
            {"url": "https://electronics.sony.com/imaging/lenses/aps-c-e-mount/p/sel70350g", "platform": "sony_official", "seller": "Sony"},
        ],
        "strategy": {"name": "Sony 70-350G Watch", "trigger": None, "strong": None, "active": True,
                     "notes": "APS-C 长焦观察策略。"},
    },
    {
        "name": "DJI Osmo Action 5 Pro",
        "brand": "DJI", "category": "action_camera", "mount_type": None, "sensor_format": None, "priority": 48,
        "sources": [
            {"url": "https://store.dji.com/product/osmo-action-5-pro", "platform": "dji_official", "seller": "DJI Store"},
        ],
        "strategy": {"name": "DJI Action 5 Pro Watch", "trigger": None, "strong": None, "active": True,
                     "notes": "运动相机观察策略。"},
    },
    {
        "name": "Insta360 X4",
        "brand": "Insta360", "category": "action_camera", "mount_type": None, "sensor_format": None, "priority": 46,
        "sources": [
            {"url": "https://store.insta360.com/product/x4", "platform": "insta360_official", "seller": "Insta360 Store"},
        ],
        "strategy": {"name": "Insta360 X4 Watch", "trigger": None, "strong": None, "active": True,
                     "notes": "全景相机观察策略。"},
    },
    {
        "name": "iPad Pro",
        "brand": "Apple", "category": "tablet", "mount_type": None, "sensor_format": None, "priority": 42,
        "sources": [
            {"url": "https://www.apple.com.cn/ipad-pro/", "platform": "apple_official", "seller": "Apple Store"},
        ],
        "strategy": {"name": "iPad Pro Watch", "trigger": None, "strong": None, "active": True,
                     "notes": "创作剪辑设备观察策略，需用户指定尺寸和容量。"},
    },
    {
        "name": "Mac mini",
        "brand": "Apple", "category": "computer", "mount_type": None, "sensor_format": None, "priority": 40,
        "sources": [
            {"url": "https://www.apple.com.cn/mac-mini/", "platform": "apple_official", "seller": "Apple Store"},
        ],
        "strategy": {"name": "Mac mini Watch", "trigger": None, "strong": None, "active": True,
                     "notes": "桌面剪辑/修图设备观察策略，需用户指定芯片和内存配置。"},
    },
]


def main() -> None:
    parser = argparse.ArgumentParser(description="Bootstrap optional demo products and official sources.")
    parser.add_argument(
        "--bootstrap",
        action="store_true",
        help="Create missing demo products. Without this flag only existing matching products are reconciled.",
    )
    args = parser.parse_args()

    init_db()
    db = SessionLocal()
    created_products = 0
    updated_products = 0
    try:
        for data in PRODUCTS:
            product = db.query(Product).filter(Product.name == data["name"]).first()
            if product is None and not args.bootstrap:
                continue
            if product is None:
                product = Product(
                    name=data["name"], brand=data["brand"], category=data["category"],
                    mount_type=data["mount_type"], sensor_format=data["sensor_format"], priority=data["priority"],
                    is_active=True,
                )
                db.add(product)
                db.flush()
                created_products += 1
            else:
                # Never reactivate or overwrite an archived product during reconciliation.
                updated_products += 1

            if not product.is_active:
                continue

            sources = data.get("sources") or [
                {"url": data["url"], "platform": data["platform"], "seller": data["seller"]},
            ]
            for source in sources:
                listing = (
                    db.query(PlatformListing)
                    .filter(PlatformListing.product_id == product.id, PlatformListing.url == source["url"])
                    .first()
                )
                if listing is None:
                    db.add(PlatformListing(
                        product_id=product.id,
                        platform=source["platform"],
                        seller_name=source["seller"],
                        seller_type="official",
                        url=source["url"],
                        is_active=True,
                    ))
                else:
                    listing.platform = source["platform"]
                    listing.seller_name = source["seller"]
                    listing.seller_type = "official"

            strategy = db.query(Strategy).filter(Strategy.product_id == product.id).first()
            strategy_data = data["strategy"]
            if strategy is None:
                db.add(Strategy(
                    user_name="ronin",
                    product_id=product.id,
                    strategy_name=strategy_data["name"],
                    trigger_price=strategy_data["trigger"],
                    strong_buy_price=strategy_data["strong"],
                    currency="CNY",
                    mode="value_hunter",
                    max_price_age_hours=24,
                    near_target_pct=5.0,
                    notes=strategy_data["notes"],
                    is_active=strategy_data["active"],
                ))
            elif not strategy.notes:
                strategy.notes = strategy_data["notes"]
        db.commit()
        print(
            f"Seed reconciliation complete: created={created_products}, matched={updated_products}, "
            f"bootstrap={args.bootstrap}."
        )
    finally:
        db.close()


if __name__ == "__main__":
    main()
