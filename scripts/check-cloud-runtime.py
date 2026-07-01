from __future__ import annotations

import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCAN_FILES = [
    ROOT / "docker-compose.yml",
    ROOT / "deploy" / "production" / "docker-compose.yml",
    ROOT / "deploy" / "production" / ".env.example",
    ROOT / "deploy" / "production" / "README.md",
    ROOT / "deploy" / "cloudflare-public" / "worker.js",
    ROOT / "deploy" / "cloudflare-public" / "wrangler.jsonc",
    ROOT / "frontend" / "next.config.mjs",
    ROOT / "scripts" / "deploy-cloud.ps1",
    ROOT / "scripts" / "verify-cloud.ps1",
]

FORBIDDEN = {
    "local tunnel URL": re.compile(r"https?://[^\\s'\"]*(?:loca\\.lt|trycloudflare\\.com)", re.IGNORECASE),
    "production sqlite default": re.compile(r"DATABASE_URL\s*[:=]\s*\$\{DATABASE_URL:-sqlite:", re.IGNORECASE),
    "sqlite production example": re.compile(r"^DATABASE_URL=sqlite:", re.IGNORECASE | re.MULTILINE),
    "localhost API fallback": re.compile(
        r"INTERNAL_API_BASE_URL[^\n]*\|\|[^\n]*['\"]http://(?:127\.0\.0\.1|localhost)",
        re.IGNORECASE,
    ),
}

REQUIRED = {
    "Supabase/Postgres env example": (
        ROOT / "deploy" / "production" / ".env.example",
        "postgresql+psycopg://",
    ),
    "Cloudflare APP_URL binding": (
        ROOT / "deploy" / "cloudflare-public" / "worker.js",
        "APP_URL",
    ),
    "Required production database URL": (
        ROOT / "docker-compose.yml",
        "DATABASE_URL must point to Supabase/Postgres",
    ),
    "Required deploy production database URL": (
        ROOT / "deploy" / "production" / "docker-compose.yml",
        "DATABASE_URL must point to Supabase/Postgres",
    ),
}


def main() -> None:
    findings: list[str] = []
    for path in SCAN_FILES:
        if not path.exists():
            findings.append(f"missing file: {path.relative_to(ROOT)}")
            continue
        text = path.read_text(encoding="utf-8")
        for label, pattern in FORBIDDEN.items():
            if pattern.search(text):
                findings.append(f"{path.relative_to(ROOT)}: {label}")

    for label, (path, needle) in REQUIRED.items():
        if not path.exists() or needle not in path.read_text(encoding="utf-8"):
            findings.append(f"{path.relative_to(ROOT)}: missing {label}")

    if findings:
        raise SystemExit("Cloud runtime check failed:\n- " + "\n- ".join(findings))
    print("Cloud runtime check passed")


if __name__ == "__main__":
    main()
