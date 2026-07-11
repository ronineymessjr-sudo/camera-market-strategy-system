from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import settings


def normalize_database_url(database_url: str) -> str:
    if database_url.startswith("postgresql://"):
        return database_url.replace("postgresql://", "postgresql+psycopg://", 1)
    if database_url.startswith("postgres://"):
        return database_url.replace("postgres://", "postgresql+psycopg://", 1)
    return database_url


normalized_database_url = normalize_database_url(settings.database_url)
connect_args = {"check_same_thread": False} if normalized_database_url.startswith("sqlite") else {}
engine_options = {"pool_pre_ping": True, "connect_args": connect_args}
if normalized_database_url.startswith("postgresql"):
    engine_options.update({"pool_size": 5, "max_overflow": 5, "pool_timeout": 10, "pool_recycle": 1800})
engine = create_engine(normalized_database_url, **engine_options)
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

    if engine.dialect.name == "sqlite":
        Base.metadata.create_all(bind=engine)
        upgrade_local_schema(engine)
