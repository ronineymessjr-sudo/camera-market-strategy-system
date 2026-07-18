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

_SETUP_GUIDE_URL = (
    "https://github.com/ronineymessjr-sudo/camera-market-strategy-system/"
    "blob/main/docs/API_KEY_APPLICATION_GUIDE.md"
)

_REQUIRED_ENV: dict[str, list[str]] = {
    "jd": ["JD_APP_KEY", "JD_APP_SECRET", "JD_UNION_ID"],
    "taobao": ["TAOBAO_APP_KEY", "TAOBAO_APP_SECRET", "TAOBAO_ADZONE_ID"],
    "pdd": ["PDD_CLIENT_ID", "PDD_CLIENT_SECRET", "PDD_PID"],
    "ebay": ["EBAY_CLIENT_ID", "EBAY_CLIENT_SECRET"],
    "amazon": ["AMAZON_CREDENTIAL_ID", "AMAZON_CREDENTIAL_SECRET", "AMAZON_PARTNER_TAG"],
}


def supported_providers() -> list[str]:
    return sorted(_PROVIDERS)


def get_provider(code: str) -> MarketplaceProvider:
    try:
        return _PROVIDERS[code.lower()]
    except KeyError as exc:
        raise ValueError(f"Unsupported provider: {code}") from exc


def provider_statuses() -> list[dict]:
    return [
        {
            **provider.status(),
            "credential_mode": "bring_your_own",
            "secret_storage": "private_backend_environment",
            "required_env": _REQUIRED_ENV[provider.code],
            "setup_guide": _SETUP_GUIDE_URL,
        }
        for provider in _PROVIDERS.values()
    ]
