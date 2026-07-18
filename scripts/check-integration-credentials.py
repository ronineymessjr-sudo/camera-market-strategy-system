from __future__ import annotations

import sys

sys.path.insert(0, "backend")

from app.config import settings
from app.integrations.registry import provider_statuses


REQUIRED = {
    "jd": ("JD_APP_KEY", "JD_APP_SECRET", "JD_UNION_ID"),
    "taobao": ("TAOBAO_APP_KEY", "TAOBAO_APP_SECRET", "TAOBAO_ADZONE_ID"),
    "pdd": ("PDD_CLIENT_ID", "PDD_CLIENT_SECRET", "PDD_PID"),
    "ebay": ("EBAY_CLIENT_ID", "EBAY_CLIENT_SECRET"),
    "amazon": (
        "AMAZON_CREDENTIAL_ID",
        "AMAZON_CREDENTIAL_SECRET",
        "AMAZON_CREDENTIAL_VERSION",
        "AMAZON_PARTNER_TAG",
    ),
}


def configured_env(name: str) -> bool:
    attr = name.lower()
    return bool(getattr(settings, attr, None))


def main() -> int:
    statuses = {item["provider"]: item for item in provider_statuses()}
    missing_any = False
    for provider, env_names in REQUIRED.items():
        status = statuses[provider]
        missing = [name for name in env_names if not configured_env(name)]
        print(f"{provider}: configured={status['configured']}, mode={status['mode']}")
        if missing:
            missing_any = True
            print("  missing:", ", ".join(missing))
        else:
            print("  ready for smoke sync")
    return 1 if missing_any else 0


if __name__ == "__main__":
    raise SystemExit(main())
