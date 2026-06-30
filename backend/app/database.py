from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import settings


connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, pool_pre_ping=True, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def get_listing_table_name(database_url: str | None = None) -> str:
    url = (database_url or settings.database_url).lower()
    return "product_listings" if url.startswith(("postgresql://", "postgres://")) else "platform_listings"


LISTING_TABLE_NAME = get_listing_table_name()


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    from . import models  # noqa: F401
    from .schema_upgrade import upgrade_local_schema

    Base.metadata.create_all(bind=engine)
    upgrade_local_schema(engine)
