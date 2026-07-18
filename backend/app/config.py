from __future__ import annotations

from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = f"sqlite:///{(BACKEND_DIR / 'camera_market.db').as_posix()}"
    public_base_url: str = "http://127.0.0.1:8000"
    frontend_origins: str = "http://127.0.0.1:3000,http://localhost:3000"
    operator_api_token: str | None = None
    local_dev_auth_bypass: bool = False
    cloudflare_access_team_domain: str | None = None
    cloudflare_access_audience: str | None = None
    operator_email: str | None = None

    supabase_url: str | None = None
    supabase_service_role_key: str | None = None
    evidence_storage_bucket: str = "price-evidence"
    evidence_max_upload_bytes: int = 10 * 1024 * 1024

    crawler_concurrency: int = 3
    crawler_platform_concurrency: str = "taobao:2,pdd:2,jd:4,generic:6"
    crawler_timeout_ms: int = 45_000
    crawler_min_interval_minutes: int = 30
    crawler_retries: int = 1
    crawler_headless: bool = True

    scheduler_enabled: bool = False
    scheduler_interval_minutes: int = 60
    job_poll_interval_seconds: float = 2.0

    # Official affiliate/open-platform integrations. Secrets stay in environment variables.
    jd_api_url: str = "https://api.jd.com/routerjson"
    jd_app_key: str | None = None
    jd_app_secret: str | None = None
    jd_union_id: str | None = None
    jd_goods_query_method: str = "jd.union.open.goods.query"

    taobao_api_url: str = "https://eco.taobao.com/router/rest"
    taobao_app_key: str | None = None
    taobao_app_secret: str | None = None
    taobao_adzone_id: str | None = None
    taobao_goods_search_method: str = "taobao.tbk.dg.material.optional"

    pdd_api_url: str = "https://gw-api.pinduoduo.com/api/router"
    pdd_client_id: str | None = None
    pdd_client_secret: str | None = None
    pdd_pid: str | None = None
    pdd_goods_search_method: str = "pdd.ddk.goods.search"

    ebay_api_url: str = "https://api.ebay.com"
    ebay_client_id: str | None = None
    ebay_client_secret: str | None = None
    ebay_marketplace_id: str = "EBAY_US"

    amazon_creators_api_url: str = "https://creatorsapi.amazon"
    amazon_credential_id: str | None = None
    amazon_credential_secret: str | None = None
    amazon_credential_version: str = "3.1"
    amazon_marketplace: str = "www.amazon.com"
    amazon_partner_tag: str | None = None

    integration_timeout_seconds: float = 30.0
    integration_offer_ttl_hours: int = 12
    integration_auto_ingest: bool = True

    # Frontend/event integration hooks. No webhook is sent until explicitly configured.
    outbound_webhook_url: str | None = None
    outbound_webhook_secret: str | None = None

    @property
    def cors_origins(self) -> list[str]:
        return [item.strip() for item in self.frontend_origins.split(",") if item.strip()]


settings = Settings()
