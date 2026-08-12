from __future__ import annotations

import os
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

import psycopg


ROOT = Path(__file__).resolve().parents[1]
MIGRATION = ROOT / "supabase" / "migrations" / "20260811110000_purchase_confirmations.sql"
TEST_DATABASE = "camera_market_purchase_migration"


def database_url(name: str) -> str:
    raw = os.environ["DATABASE_URL"].replace("postgresql+psycopg://", "postgresql://", 1)
    parts = urlsplit(raw)
    return urlunsplit((parts.scheme, parts.netloc, f"/{name}", parts.query, parts.fragment))


def main() -> None:
    with psycopg.connect(database_url("postgres"), autocommit=True) as admin:
        exists = admin.execute("select 1 from pg_database where datname = %s", (TEST_DATABASE,)).fetchone()
        if exists:
            raise SystemExit(f"Refusing to reuse non-empty test database {TEST_DATABASE}")
        for role in ("anon", "authenticated", "service_role"):
            if not admin.execute("select 1 from pg_roles where rolname = %s", (role,)).fetchone():
                admin.execute(f'create role "{role}" nologin')
        admin.execute(f'create database "{TEST_DATABASE}"')

    with psycopg.connect(database_url(TEST_DATABASE)) as connection:
        connection.execute("create table public.products (id bigint primary key)")
        connection.execute("create table public.price_records (id bigint primary key)")
        connection.execute("insert into public.products values (1)")
        connection.execute("insert into public.price_records values (1)")
        connection.execute(MIGRATION.read_text(encoding="utf-8"))

        rls_enabled = connection.execute("""
            select relrowsecurity from pg_class
            where oid = 'public.purchase_confirmations'::regclass
        """).fetchone()[0]
        policies = connection.execute("""
            select policyname, roles, cmd from pg_policies
            where schemaname = 'public' and tablename = 'purchase_confirmations'
        """).fetchall()
        constraints = [row[0] for row in connection.execute("""
            select pg_get_constraintdef(oid) from pg_constraint
            where conrelid = 'public.purchase_confirmations'::regclass
        """).fetchall()]
        privileges = connection.execute("""
            select
              has_table_privilege('anon', 'public.purchase_confirmations', 'select'),
              has_table_privilege('authenticated', 'public.purchase_confirmations', 'select'),
              has_table_privilege('service_role', 'public.purchase_confirmations', 'select'),
              has_sequence_privilege('service_role', 'public.purchase_confirmations_id_seq', 'usage')
        """).fetchone()

        assert rls_enabled is True
        assert policies == [("purchase_confirmations_service_role_all", ["service_role"], "ALL")]
        assert any("checkout_price >" in item for item in constraints)
        assert any("CONFIRMED" in item and "COMPLETED" in item and "CANCELLED" in item for item in constraints)
        assert privileges == (False, False, True, True)

        connection.execute("set local role service_role")
        inserted = connection.execute("""
            insert into public.purchase_confirmations
              (product_id, price_record_id, product_name, checkout_price, confirmed_by)
            values (1, 1, 'test', 1, 'ci') returning id
        """).fetchone()[0]
        assert inserted == 1

    print("Purchase confirmation migration check passed")


if __name__ == "__main__":
    main()
