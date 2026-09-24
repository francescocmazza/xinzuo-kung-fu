-- Xinzuo Academy company backend — initial schema
PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('staff','manager','admin')),
  team TEXT,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_iterations INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_login_at INTEGER,
  last_active_at INTEGER,
  failed_login_count INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER
);

CREATE INDEX users_role_idx ON users(role);
CREATE INDEX users_active_idx ON users(active, last_active_at);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  user_agent TEXT,
  ip_hash TEXT
);

CREATE INDEX sessions_user_idx ON sessions(user_id);
CREATE INDEX sessions_expiry_idx ON sessions(expires_at);

CREATE TABLE invites (
  token_hash TEXT PRIMARY KEY,
  email TEXT COLLATE NOCASE,
  role TEXT NOT NULL CHECK (role IN ('staff','manager')),
  team TEXT,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  used_by TEXT REFERENCES users(id)
);

CREATE INDEX invites_expiry_idx ON invites(expires_at);

CREATE TABLE learner_progress (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  course_version TEXT NOT NULL,
  progress_json TEXT NOT NULL,
  lessons_completed INTEGER NOT NULL DEFAULT 0,
  lessons_total INTEGER NOT NULL DEFAULT 0,
  concepts_acquired INTEGER NOT NULL DEFAULT 0,
  concepts_weak INTEGER NOT NULL DEFAULT 0,
  interactions INTEGER NOT NULL DEFAULT 0,
  mini_tests_completed INTEGER NOT NULL DEFAULT 0,
  mini_test_avg REAL NOT NULL DEFAULT 0,
  critical_errors INTEGER NOT NULL DEFAULT 0,
  modules_completed INTEGER NOT NULL DEFAULT 0,
  engagement_seconds INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

CREATE INDEX learner_progress_updated_idx ON learner_progress(updated_at);

CREATE TABLE activity_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  module_id TEXT,
  concept_id TEXT,
  score REAL,
  correct INTEGER,
  critical_errors INTEGER,
  duration_seconds INTEGER,
  metadata_json TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX activity_user_time_idx ON activity_events(user_id, created_at DESC);
CREATE INDEX activity_type_time_idx ON activity_events(event_type, created_at DESC);
