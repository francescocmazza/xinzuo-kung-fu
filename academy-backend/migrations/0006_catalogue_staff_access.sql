CREATE TABLE IF NOT EXISTS catalogue_user_access (
 user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
 updated_at INTEGER NOT NULL,
 updated_by TEXT NOT NULL REFERENCES users(id)
);
