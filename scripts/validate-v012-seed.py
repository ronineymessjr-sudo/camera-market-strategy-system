from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JSON_SEED = ROOT / 'supabase' / 'seeds' / 'local_v012_seed.json'
SQL_SEED = ROOT / 'supabase' / 'seeds' / 'local_v012_seed.sql'
EXPECTED_COUNTS = {
    'products': 20,
    'product_listings': 23,
    'price_records': 148,
    'strategies': 20,
    'signals': 24,
}


def fail(message: str) -> None:
    raise SystemExit(message)


def main() -> None:
    if not JSON_SEED.is_file() or JSON_SEED.stat().st_size == 0:
        fail(f'Missing or empty JSON seed: {JSON_SEED}')
    if not SQL_SEED.is_file() or SQL_SEED.stat().st_size == 0:
        fail(f'Missing or empty SQL seed: {SQL_SEED}')

    payload = json.loads(JSON_SEED.read_text(encoding='utf-8'))
    if payload.get('version') != 'v0.15-strict':
        fail(f"Unexpected seed version: {payload.get('version')!r}")

    tables = payload.get('tables')
    if not isinstance(tables, list):
        fail('JSON seed must contain a tables array')

    by_target: dict[str, list[dict]] = {}
    for table in tables:
        if not isinstance(table, dict):
            fail('Every tables entry must be an object')
        target = table.get('target')
        rows = table.get('rows')
        if not isinstance(target, str) or not isinstance(rows, list):
            fail(f'Invalid table entry: {table!r}')
        if target in by_target:
            fail(f'Duplicate target table in JSON seed: {target}')
        by_target[target] = rows

    actual = {name: len(by_target.get(name, [])) for name in EXPECTED_COUNTS}
    if actual != EXPECTED_COUNTS:
        fail(f'Seed count mismatch: expected={EXPECTED_COUNTS}, actual={actual}')

    for target, rows in by_target.items():
        ids = [row.get('id') for row in rows if isinstance(row, dict) and 'id' in row]
        if len(ids) != len(set(ids)):
            fail(f'Duplicate IDs detected in {target}')

    unproven_verified = [
        row for row in by_target.get('price_records', [])
        if row.get('verification_status') == 'VERIFIED_CHECKOUT'
    ]
    if unproven_verified:
        fail('Strict seed must not contain VERIFIED_CHECKOUT rows without exported trusted evidence')
    triggered = [row for row in by_target.get('signals', []) if row.get('triggered')]
    if triggered:
        fail('Strict seed must not contain triggered signals without exported trusted evidence')

    sql = SQL_SEED.read_text(encoding='utf-8').lower()
    required_sql_fragments = ['begin;', 'commit;', 'on conflict']
    missing = [fragment for fragment in required_sql_fragments if fragment not in sql]
    if missing:
        fail(f'SQL seed is missing required fragments: {missing}')

    print('V0.15 strict seed validation passed')
    for key, value in actual.items():
        print(f'- {key}: {value}')


if __name__ == '__main__':
    main()
