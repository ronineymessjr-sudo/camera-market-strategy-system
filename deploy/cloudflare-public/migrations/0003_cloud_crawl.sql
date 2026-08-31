CREATE TABLE IF NOT EXISTS cloud_crawl_runs (
    run_key TEXT PRIMARY KEY,
    github_run_id TEXT NOT NULL,
    github_run_attempt INTEGER NOT NULL,
    repository TEXT NOT NULL,
    ref TEXT NOT NULL,
    commit_sha TEXT NOT NULL,
    workflow_ref TEXT NOT NULL,
    event_name TEXT NOT NULL,
    actor TEXT NOT NULL DEFAULT '',
    local_run_id INTEGER,
    status TEXT NOT NULL CHECK (status IN ('SUCCESS', 'PARTIAL', 'FAILED')),
    started_at TEXT,
    finished_at TEXT,
    duration_seconds REAL,
    total_count INTEGER NOT NULL DEFAULT 0,
    success_count INTEGER NOT NULL DEFAULT 0,
    failure_count INTEGER NOT NULL DEFAULT 0,
    skipped_count INTEGER NOT NULL DEFAULT 0,
    received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cloud_price_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_key TEXT NOT NULL REFERENCES cloud_crawl_runs(run_key) ON DELETE CASCADE,
    product_id INTEGER,
    listing_id INTEGER,
    product_name TEXT NOT NULL,
    brand TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL DEFAULT '',
    platform TEXT NOT NULL DEFAULT '',
    source_url TEXT NOT NULL,
    list_price REAL,
    promotion_price REAL,
    currency TEXT NOT NULL DEFAULT '',
    stock_status TEXT NOT NULL DEFAULT '',
    verification_status TEXT NOT NULL CHECK (verification_status IN ('VISIBLE_PRICE', 'UNVERIFIED')),
    confidence_score REAL,
    extraction_method TEXT NOT NULL DEFAULT '',
    needs_review INTEGER NOT NULL DEFAULT 1 CHECK (needs_review = 1),
    captured_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cloud_crawl_runs_received
ON cloud_crawl_runs (received_at DESC);

CREATE INDEX IF NOT EXISTS idx_cloud_prices_source_captured
ON cloud_price_records (source_url, captured_at DESC, id DESC);