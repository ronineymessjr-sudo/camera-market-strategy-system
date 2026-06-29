from __future__ import annotations

from .amazon import AmazonProductProvider
from .base import MarketplaceProvider
from .ebay import EbayBrowseProvider
from .jd import JDUnionProvider
from .pdd import PddDdkProvider
from .taobao import TaobaoAllianceProvider

_PROVIDERS: dict[str, MarketplaceProvider] = {
    "jd": JDUnionProvider(),
    "taobao": TaobaoAllianceProvider(),
    "pdd": PddDdkProvider(),
    "ebay": EbayBrowseProvider(),
    "amazon": AmazonProductProvider(),
}


def supported_providers() -> list[str]:
    return sorted(_PROVIDERS)


def get_provider(code: str) -> MarketplaceProvider:
    try:
        return _PROVIDERS[code.lower()]
    except KeyError as exc:
        raise ValueError(f"Unsupported provider: {code}") from exc


def provider_statuses() -> list[dict]:
    return [provider.status() for provider in _PROVIDERS.values()]
