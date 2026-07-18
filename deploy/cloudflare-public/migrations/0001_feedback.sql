CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message TEXT NOT NULL CHECK (length(message) BETWEEN 10 AND 2000),
    locale TEXT NOT NULL CHECK (locale IN ('en', 'zh')),
    category TEXT NOT NULL CHECK (category IN ('general', 'data', 'usability', 'translation')),
    page TEXT NOT NULL DEFAULT '/',
    status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'REVIEWED', 'PLANNED', 'DONE', 'DISMISSED')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_feedback_status_created
ON feedback (status, created_at DESC);
