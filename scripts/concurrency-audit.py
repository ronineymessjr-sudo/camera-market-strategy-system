from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCAN_DIRS = [ROOT / "backend", ROOT / "supabase" / "functions"]
SKIP_PARTS = {".venv", "__pycache__", ".pytest_cache"}

PATTERNS = {
    "blocking sleep inside Python": re.compile(r"\btime\.sleep\s*\("),
    "thread creation": re.compile(r"\bThread\s*\(|threading\.Thread\s*\("),
    "unbounded gather": re.compile(r"asyncio\.gather\s*\("),
    "background task": re.compile(r"BackgroundTasks|create_task\s*\("),
    "read-modify-write candidate": re.compile(r"\.first\(\)|\.one_or_none\(\)|select\s*\("),
}

SUFFIXES = {".py", ".ts", ".tsx", ".js", ".mjs"}


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    findings: list[tuple[str, Path, int, str]] = []
    for base in SCAN_DIRS:
        if not base.exists():
            continue
        for path in base.rglob("*"):
            if SKIP_PARTS.intersection(path.parts):
                continue
            if path.suffix not in SUFFIXES or not path.is_file():
                continue
            try:
                lines = path.read_text(encoding="utf-8", errors="ignore").splitlines()
            except OSError:
                continue
            for number, line in enumerate(lines, 1):
                for label, pattern in PATTERNS.items():
                    if pattern.search(line):
                        findings.append((label, path.relative_to(ROOT), number, line.strip()))

    if not findings:
        print("Concurrency audit: no obvious hotspots found.")
        return 0

    print("Concurrency audit hotspots (manual review required):")
    for label, path, number, line in findings:
        print(f"- [{label}] {path}:{number}: {line[:180]}")
    print(f"Total findings: {len(findings)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
