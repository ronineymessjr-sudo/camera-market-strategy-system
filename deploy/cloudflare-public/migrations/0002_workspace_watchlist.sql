CREATE TABLE IF NOT EXISTS workspace_watchlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_key TEXT NOT NULL CHECK (length(workspace_key) = 32),
    name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 160),
    brand TEXT NOT NULL DEFAULT '',
    platform TEXT NOT NULL DEFAULT '',
    source_url TEXT NOT NULL DEFAULT '',
    current_price REAL,
    trigger_price REAL,
    strong_buy_price REAL,
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_workspace_watchlist_owner
ON workspace_watchlist (workspace_key, updated_at DESC);
