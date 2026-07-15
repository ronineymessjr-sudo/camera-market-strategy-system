from __future__ import annotations

import csv
import io
from dataclasses import dataclass, field
from datetime import datetime, timezone

from sqlalchemy import desc
from sqlalchemy.orm import Session

from app import models
from app.services.watchlist_commands import _infer_platform


MAX_IMPORT_ROWS = 500


@dataclass(slots=True)
class WatchlistImportResult:
    created_products: int = 0
    updated_products: int = 0
    created_listings: int = 0
    updated_listings: int = 0
    created_strategies: int = 0
    updated_strategies: int = 0
    product_ids: set[int] = field(default_factory=set)


def import_watchlist_csv(db: Session, content: bytes) -> WatchlistImportResult:
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames or "name" not in {value.strip() for value in reader.fieldnames if value}:
        raise ValueError("CSV must include a name column")

    rows = list(reader)
    if not rows:
        raise ValueError("CSV has no product rows")
    if len(rows) > MAX_IMPORT_ROWS:
        raise ValueError(f"CSV exceeds the {MAX_IMPORT_ROWS}-row limit")

    result = WatchlistImportResult()
    for index, raw in enumerate(rows, start=2):
        row = {(key or "").strip(): (value or "").strip() for key, value in raw.items()}
        name = row.get("name", "")
        if not name:
            raise ValueError(f"Row {index}: name is required")

        product = db.query(models.Product).filter(models.Product.name == name).first()
        if product is None:
            product = models.Product(name=name)
            db.add(product)
            db.flush()
            result.created_products += 1
        else:
            result.updated_products += 1

        product.is_active = _bool_value(row.get("is_active"), default=product.is_active)
        product.archived_at = None if product.is_active else datetime.now(timezone.utc)
        for field_name in ("brand", "category", "mount_type", "sensor_format", "tags", "notes"):
            if row.get(field_name):
                setattr(product, field_name, row[field_name])
        if row.get("priority"):
            product.priority = _int_value(row["priority"], index, "priority")
        result.product_ids.add(product.id)

        source_url = row.get("source_url") or row.get("url")
        if source_url:
            if not source_url.startswith(("http://", "https://")):
                raise ValueError(f"Row {index}: source_url must start with http:// or https://")
            listing = (
                db.query(models.PlatformListing)
                .filter(models.PlatformListing.product_id == product.id, models.PlatformListing.url == source_url)
                .first()
            )
            if listing is None:
                listing = models.PlatformListing(
                    product_id=product.id,
                    platform=row.get("platform") or _infer_platform(source_url),
                    url=source_url,
                )
                db.add(listing)
                result.created_listings += 1
            else:
                result.updated_listings += 1
            listing.is_active = True
            if row.get("platform"):
                listing.platform = row["platform"]
            if row.get("seller_name"):
                listing.seller_name = row["seller_name"]
            if row.get("sku_id"):
                listing.sku_id = row["sku_id"]

        price_fields = {
            "trigger_price": _optional_float(row.get("trigger_price"), index, "trigger_price"),
            "strong_buy_price": _optional_float(row.get("strong_buy_price"), index, "strong_buy_price"),
            "watch_price": _optional_float(row.get("watch_price"), index, "watch_price"),
        }
        if any(value is not None for value in price_fields.values()):
            strategy = (
                db.query(models.Strategy)
                .filter(models.Strategy.product_id == product.id, models.Strategy.user_name == "ronin")
                .order_by(desc(models.Strategy.id))
                .first()
            )
            if strategy is None:
                strategy = models.Strategy(
                    user_name="ronin",
                    product_id=product.id,
                    strategy_name=row.get("strategy_name") or f"{product.name} Strategy",
                    currency=row.get("currency") or "CNY",
                    mode="user_defined",
                )
                db.add(strategy)
                result.created_strategies += 1
            else:
                result.updated_strategies += 1
            for field_name, value in price_fields.items():
                if value is not None:
                    setattr(strategy, field_name, value)
            if row.get("strategy_name"):
                strategy.strategy_name = row["strategy_name"]
            if row.get("currency"):
                strategy.currency = row["currency"].upper()
            strategy.is_active = True

    db.commit()
    return result


def export_watchlist_csv(db: Session, include_archived: bool = False) -> str:
    query = db.query(models.Product)
    if not include_archived:
        query = query.filter(models.Product.is_active.is_(True))
    products = query.order_by(desc(models.Product.priority), models.Product.id).all()

    output = io.StringIO(newline="")
    fieldnames = [
        "name", "brand", "category", "mount_type", "sensor_format", "priority", "tags", "notes",
        "is_active", "platform", "seller_name", "source_url", "sku_id", "strategy_name",
        "trigger_price", "strong_buy_price", "watch_price", "currency",
    ]
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    for product in products:
        listings = (
            db.query(models.PlatformListing)
            .filter(models.PlatformListing.product_id == product.id)
            .order_by(desc(models.PlatformListing.is_active), models.PlatformListing.id)
            .all()
        ) or [None]
        strategy = (
            db.query(models.Strategy)
            .filter(models.Strategy.product_id == product.id, models.Strategy.user_name == "ronin")
            .order_by(desc(models.Strategy.id))
            .first()
        )
        for listing in listings:
            writer.writerow({
                "name": product.name,
                "brand": product.brand or "",
                "category": product.category or "",
                "mount_type": product.mount_type or "",
                "sensor_format": product.sensor_format or "",
                "priority": product.priority,
                "tags": product.tags or "",
                "notes": product.notes or "",
                "is_active": str(product.is_active).lower(),
                "platform": listing.platform if listing else "",
                "seller_name": listing.seller_name if listing and listing.seller_name else "",
                "source_url": listing.url if listing else "",
                "sku_id": listing.sku_id if listing and listing.sku_id else "",
                "strategy_name": strategy.strategy_name if strategy else "",
                "trigger_price": strategy.trigger_price if strategy and strategy.trigger_price is not None else "",
                "strong_buy_price": strategy.strong_buy_price if strategy and strategy.strong_buy_price is not None else "",
                "watch_price": strategy.watch_price if strategy and strategy.watch_price is not None else "",
                "currency": strategy.currency if strategy else "CNY",
            })
    return output.getvalue()


def _optional_float(value: str | None, row: int, field_name: str) -> float | None:
    if not value:
        return None
    try:
        parsed = float(value)
    except ValueError as exc:
        raise ValueError(f"Row {row}: {field_name} must be a number") from exc
    if parsed < 0:
        raise ValueError(f"Row {row}: {field_name} cannot be negative")
    return parsed


def _int_value(value: str, row: int, field_name: str) -> int:
    try:
        return int(value)
    except ValueError as exc:
        raise ValueError(f"Row {row}: {field_name} must be an integer") from exc


def _bool_value(value: str | None, *, default: bool) -> bool:
    if not value:
        return default
    normalized = value.casefold()
    if normalized in {"true", "1", "yes", "y"}:
        return True
    if normalized in {"false", "0", "no", "n"}:
        return False
    raise ValueError("is_active must be true or false")
