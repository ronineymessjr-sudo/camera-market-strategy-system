from __future__ import annotations

from dataclasses import dataclass, field
from urllib.parse import urlparse


@dataclass(frozen=True, slots=True)
class ParserProfile:
    name: str
    domains: tuple[str, ...]
    price_selectors: tuple[str, ...] = field(default_factory=tuple)
    seller_selectors: tuple[str, ...] = field(default_factory=tuple)
    stock_selectors: tuple[str, ...] = field(default_factory=tuple)
    wait_ms: int = 1800


PROFILES = (
    ParserProfile(
        name="apple",
        domains=("apple.com",),
        price_selectors=("[data-autom='full-price']", ".rc-prices-fullprice", "[itemprop='price']"),
        wait_ms=1400,
    ),
    ParserProfile(
        name="dji",
        domains=("dji.com", "store.dji.com"),
        price_selectors=("[data-testid*='price']", "[class*='price']", "[itemprop='price']"),
        wait_ms=1800,
    ),
    ParserProfile(
        name="viltrox",
        domains=("viltrox.com", "store.viltrox.com"),
        price_selectors=(".price-item--sale", ".price-item--regular", "[itemprop='price']"),
    ),
    ParserProfile(
        name="sigma",
        domains=("sigma-global.com",),
        price_selectors=("[itemprop='price']", "[class*='price']"),
    ),
    ParserProfile(
        name="tamron",
        domains=("tamron.com", "tamron-americas.com"),
        price_selectors=("[itemprop='price']", "[class*='price']"),
    ),
    ParserProfile(
        name="sony",
        domains=("sony.com", "sony.com.cn", "electronics.sony.com"),
        price_selectors=("[itemprop='price']", "[class*='price']"),
        wait_ms=2200,
    ),
    ParserProfile(
        name="jd",
        domains=("jd.com", "item.jd.com"),
        price_selectors=(".p-price .price", ".summary-price .p-price", "[class*='price']"),
        seller_selectors=(".name a", "#popbox .name"),
        wait_ms=2600,
    ),
    ParserProfile(
        name="taobao",
        domains=("taobao.com", "tmall.com"),
        price_selectors=("[class*='Price']", "[class*='price']"),
        wait_ms=2800,
    ),
    ParserProfile(
        name="pdd",
        domains=("pinduoduo.com", "yangkeduo.com"),
        price_selectors=("[class*='price']",),
        wait_ms=2800,
    ),
    ParserProfile(
        name="xianyu",
        domains=("goofish.com", "2.taobao.com"),
        price_selectors=("[class*='price']",),
        wait_ms=2800,
    ),
)

DEFAULT_PROFILE = ParserProfile(name="generic", domains=(), price_selectors=("[itemprop='price']", "[class*='price']"))


def profile_for_url(url: str) -> ParserProfile:
    host = urlparse(url).netloc.lower()
    for profile in PROFILES:
        if any(host == domain or host.endswith(f".{domain}") for domain in profile.domains):
            return profile
    return DEFAULT_PROFILE
