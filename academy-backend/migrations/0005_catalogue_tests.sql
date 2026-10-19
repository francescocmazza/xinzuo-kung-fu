CREATE TABLE IF NOT EXISTS catalogue_series_settings (
 series_id TEXT PRIMARY KEY,
 enabled INTEGER NOT NULL CHECK(enabled IN (0,1)),
 updated_at INTEGER NOT NULL,
 updated_by TEXT NOT NULL REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS catalogue_attempts (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id),
 version TEXT NOT NULL,
 started_at INTEGER NOT NULL,
 completed_at INTEGER,
 state_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_catalogue_attempts_user ON catalogue_attempts(user_id, started_at DESC);
