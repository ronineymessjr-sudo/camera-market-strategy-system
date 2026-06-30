from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCAN_ROOTS = [ROOT / 'frontend', ROOT / 'deploy' / 'cloudflare-public']
EXCLUDED_PARTS = {'node_modules', '.next', 'dist', 'build', '.git'}
TEXT_SUFFIXES = {'.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.json', '.html', '.css', '.md', '.env', '.example'}

PATTERNS = {
    'service role variable': re.compile(r'SUPABASE_SERVICE_ROLE_KEY', re.IGNORECASE),
    'service-role JWT claim': re.compile(r'"role"\s*:\s*"service_role"', re.IGNORECASE),
    'private key marker': re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----'),
}


def iter_files():
    for root in SCAN_ROOTS:
        if not root.exists():
            continue
        for path in root.rglob('*'):
            if not path.is_file() or any(part in EXCLUDED_PARTS for part in path.parts):
                continue
            if path.suffix.lower() in TEXT_SUFFIXES or path.name.startswith('.env'):
                yield path


def main() -> None:
    findings: list[str] = []
    for path in iter_files():
        try:
            text = path.read_text(encoding='utf-8')
        except UnicodeDecodeError:
            continue
        for label, pattern in PATTERNS.items():
            if pattern.search(text):
                findings.append(f'{path.relative_to(ROOT)}: {label}')

    if findings:
        raise SystemExit('Potential client-side secret exposure:\n- ' + '\n- '.join(findings))
    print('Client secret scan passed')


if __name__ == '__main__':
    main()
