from app.database import LISTING_TABLE_NAME, get_listing_table_name
from app.models import PlatformListing


def test_sqlite_runtime_uses_local_listing_table_name():
    assert LISTING_TABLE_NAME == "platform_listings"
    assert PlatformListing.__tablename__ == "platform_listings"


def test_postgres_runtime_uses_supabase_listing_table_name():
    assert get_listing_table_name("postgresql://user:pass@localhost:5432/app") == "product_listings"
    assert get_listing_table_name("postgres://user:pass@localhost:5432/app") == "product_listings"
