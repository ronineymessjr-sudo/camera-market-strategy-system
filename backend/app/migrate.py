from __future__ import annotations

import argparse
from pathlib import Path

import psycopg

from app.config import settings


def _psycopg_url() -> str:
    url = settings.database_url.replace("postgresql+psycopg://", "postgresql://", 1)
    if not url.startswith("postgresql://"):
        raise SystemExit("Production migrations require a PostgreSQL DATABASE_URL")
    return url


def apply_migrations(directory: Path, start_at: str | None = None) -> list[str]:
    paths = sorted(directory.glob("*.sql"))
    if start_at:
        paths = [path for path in paths if path.name >= start_at]
    applied: list[str] = []
    with psycopg.connect(_psycopg_url()) as connection:
        connection.execute("""
            create table if not exists public.camera_market_schema_migrations (
              name text primary key,
              applied_at timestamptz not null default now()
            )
        """)
        connection.commit()
        existing = {row[0] for row in connection.execute(
            "select name from public.camera_market_schema_migrations"
        ).fetchall()}
        for path in paths:
            if path.name in existing:
                continue
            with connection.transaction():
                connection.execute(path.read_text(encoding="utf-8"))
                connection.execute(
                    "insert into public.camera_market_schema_migrations(name) values (%s)",
                    (path.name,),
                )
            applied.append(path.name)
    return applied


def verify_trust_invariants() -> None:
    with psycopg.connect(_psycopg_url()) as connection:
        bad_signals = connection.execute("""
            select count(*)
            from public.signals s
            left join public.price_records p on p.id = s.price_record_id
            where s.triggered = true
              and (
                p.verification_status <> 'VERIFIED_CHECKOUT'
                or p.valid_until is null
                or p.valid_until < now()
                or not exists (
                  select 1 from public.price_evidence e
                  where e.price_record_id = p.id and e.trusted_for_strategy = true
                )
              )
        """).fetchone()[0]
        if bad_signals:
            raise SystemExit(f"Trust verification failed: {bad_signals} invalid triggered signals")
        missing = connection.execute("""
            select count(*) from (values
              (to_regclass('public.evidence_uploads')),
              (to_regclass('public.background_jobs')),
              (to_regclass('public.price_evidence'))
            ) as required(table_name)
            where table_name is null
        """).fetchone()[0]
        if missing:
            raise SystemExit(f"Schema verification failed: {missing} required tables are missing")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("directory", type=Path)
    parser.add_argument("--from", dest="start_at")
    parser.add_argument("--verify", action="store_true")
    args = parser.parse_args()
    applied = apply_migrations(args.directory, args.start_at)
    if args.verify:
        verify_trust_invariants()
    print(f"Applied {len(applied)} migration(s): {', '.join(applied) or 'none'}")


if __name__ == "__main__":
    main()
