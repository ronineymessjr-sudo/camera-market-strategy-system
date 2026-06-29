from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime, timezone
from urllib.parse import urlparse

from sqlalchemy.orm import Session

from app import models


@dataclass(slots=True)
class WatchlistCommandResult:
    action: str
    message: str
    product: models.Product | None = None
    strategy: models.Strategy | None = None
    listing: models.PlatformListing | None = None


ADD_WORDS = ("添加", "加入", "关注", "监控", "盯住", "新增")
REMOVE_WORDS = ("移除", "删除", "取消关注", "停止监控", "不再监控")
PAUSE_WORDS = ("暂停", "停用")
RESTORE_WORDS = ("恢复", "启用", "重新监控")


def _normalize(text: str) -> str:
    return re.sub(r"[^0-9a-zA-Z\u4e00-\u9fff]+", "", text).lower()


def _find_product(db: Session, name: str) -> models.Product | None:
    wanted = _normalize(name)
    products = db.query(models.Product).all()
    exact = [product for product in products if _normalize(product.name) == wanted]
    if exact:
        return exact[0]
    candidates = [
        product for product in products
        if wanted and (wanted in _normalize(product.name) or _normalize(product.name) in wanted)
    ]
    return max(candidates, key=lambda product: len(_normalize(product.name)), default=None)


def _infer_platform(url: str) -> str:
    host = urlparse(url).netloc.lower()
    if "jd.com" in host:
        return "jd"
    if "taobao.com" in host or "tmall.com" in host:
        return "taobao"
    if "yangkeduo.com" in host or "pinduoduo.com" in host:
        return "pdd"
    if "goofish.com" in host or "2.taobao.com" in host:
        return "xianyu"
    if "dji.com" in host:
        return "dji_official"
    if "apple.com" in host:
        return "apple_official"
    if "sigma" in host:
        return "sigma_official"
    if "tamron" in host:
        return "tamron_official"
    if "viltrox" in host:
        return "viltrox_official"
    return host or "web"


def _extract_price(command: str, labels: tuple[str, ...]) -> float | None:
    label = "|".join(re.escape(value) for value in labels)
    match = re.search(rf"(?:{label})\s*[：:=]?\s*[¥￥]?\s*(\d+(?:\.\d+)?)", command, re.IGNORECASE)
    return float(match.group(1)) if match else None


def _extract_url(command: str) -> str | None:
    match = re.search(r"https?://[^\s，。；;]+", command)
    return match.group(0).rstrip(")】]>,，。；;") if match else None


def _strip_control_words(command: str) -> str:
    text = command
    for word in (*ADD_WORDS, *REMOVE_WORDS, *PAUSE_WORDS, *RESTORE_WORDS):
        text = text.replace(word, " ")
    text = re.sub(r"https?://[^\s，。；;]+", " ", text)
    text = re.sub(r"(?:触发价|目标价|买入价|强买价|神价|观察价)\s*[：:=]?\s*[¥￥]?\s*\d+(?:\.\d+)?", " ", text)
    text = re.sub(r"[，,。；;]+", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def execute_watchlist_command(db: Session, command: str) -> WatchlistCommandResult:
    raw = command.strip()
    if not raw:
        raise ValueError("Command cannot be empty")

    action = "ADD"
    if any(word in raw for word in REMOVE_WORDS):
        action = "REMOVE"
    elif any(word in raw for word in PAUSE_WORDS):
        action = "PAUSE"
    elif any(word in raw for word in RESTORE_WORDS):
        action = "RESTORE"
    elif any(word in raw for word in ADD_WORDS):
        action = "ADD"

    product_name = _strip_control_words(raw)
    if not product_name:
        raise ValueError("无法识别商品名称；请使用“添加 商品名 链接...”或“移除 商品名”。")

    product = _find_product(db, product_name)
    now = datetime.now(timezone.utc)

    if action in {"REMOVE", "PAUSE"}:
        if product is None:
            result = WatchlistCommandResult(action=action, message=f"未找到商品：{product_name}")
        else:
            product.is_active = False
            product.archived_at = now
            for listing in db.query(models.PlatformListing).filter(models.PlatformListing.product_id == product.id).all():
                listing.is_active = False
            for strategy in db.query(models.Strategy).filter(models.Strategy.product_id == product.id).all():
                strategy.is_active = False
            result = WatchlistCommandResult(action=action, product=product, message=f"已暂停监控：{product.name}")
        _log(db, raw, result)
        db.commit()
        return result

    if action == "RESTORE":
        if product is None:
            result = WatchlistCommandResult(action=action, message=f"未找到商品：{product_name}")
        else:
            product.is_active = True
            product.archived_at = None
            result = WatchlistCommandResult(action=action, product=product, message=f"已恢复商品池：{product.name}；请确认来源链接和策略是否启用。")
        _log(db, raw, result)
        db.commit()
        return result

    created = False
    if product is None:
        product = models.Product(name=product_name, priority=0, is_active=True)
        db.add(product)
        db.flush()
        created = True
    else:
        product.is_active = True
        product.archived_at = None

    url = _extract_url(raw)
    listing = None
    if url:
        listing = (
            db.query(models.PlatformListing)
            .filter(models.PlatformListing.product_id == product.id, models.PlatformListing.url == url)
            .first()
        )
        if listing is None:
            listing = models.PlatformListing(
                product_id=product.id,
                platform=_infer_platform(url),
                url=url,
                is_active=True,
            )
            db.add(listing)
        else:
            listing.is_active = True

    trigger = _extract_price(raw, ("触发价", "目标价", "买入价"))
    strong = _extract_price(raw, ("强买价", "神价"))
    watch = _extract_price(raw, ("观察价",))
    strategy = None
    if any(value is not None for value in (trigger, strong, watch)):
        strategy = (
            db.query(models.Strategy)
            .filter(models.Strategy.product_id == product.id, models.Strategy.user_name == "ronin")
            .order_by(models.Strategy.id.desc())
            .first()
        )
        if strategy is None:
            strategy = models.Strategy(
                user_name="ronin",
                product_id=product.id,
                strategy_name=f"{product.name} Strategy",
                trigger_price=trigger,
                strong_buy_price=strong,
                watch_price=watch,
                currency="CNY",
                mode="user_defined",
                max_price_age_hours=24,
                near_target_pct=5.0,
                is_active=True,
            )
            db.add(strategy)
        else:
            strategy.trigger_price = trigger if trigger is not None else strategy.trigger_price
            strategy.strong_buy_price = strong if strong is not None else strategy.strong_buy_price
            strategy.watch_price = watch if watch is not None else strategy.watch_price
            strategy.is_active = True

    parts = ["已新增" if created else "已更新", product.name]
    if listing:
        parts.append(f"来源={listing.platform}")
    elif created:
        parts.append("尚未提供来源链接")
    if strategy:
        parts.append("已同步用户策略")
    result = WatchlistCommandResult(
        action="ADD",
        product=product,
        strategy=strategy,
        listing=listing,
        message="；".join(parts),
    )
    _log(db, raw, result)
    db.commit()
    if product:
        db.refresh(product)
    if listing:
        db.refresh(listing)
    if strategy:
        db.refresh(strategy)
    return result


def _log(db: Session, command: str, result: WatchlistCommandResult) -> None:
    db.add(models.WatchlistCommandLog(
        command_text=command,
        action=result.action,
        product_id=result.product.id if result.product else None,
        result_message=result.message,
    ))
