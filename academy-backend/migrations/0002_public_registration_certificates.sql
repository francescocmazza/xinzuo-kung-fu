PRAGMA foreign_keys = OFF;

CREATE TABLE users_v2 (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE COLLATE NOCASE,
  phone TEXT UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('staff','manager','admin')),
  team TEXT,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_iterations INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_login_at INTEGER,
  last_active_at INTEGER,
  failed_login_count INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER,
  email_verified_at INTEGER,
  phone_verified_at INTEGER,
  contact_preference TEXT CHECK (contact_preference IN ('email','sms')),
  registration_source TEXT NOT NULL DEFAULT 'public',
  terms_version TEXT,
  privacy_version TEXT,
  terms_accepted_at INTEGER,
  privacy_accepted_at INTEGER,
  marketing_email_consent INTEGER NOT NULL DEFAULT 0,
  marketing_sms_consent INTEGER NOT NULL DEFAULT 0,
  marketing_phone_consent INTEGER NOT NULL DEFAULT 0,
  marketing_consent_updated_at INTEGER,
  CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

INSERT INTO users_v2(
  id,email,phone,first_name,last_name,role,team,password_hash,password_salt,password_iterations,
  active,created_at,updated_at,last_login_at,last_active_at,failed_login_count,locked_until,
  email_verified_at,phone_verified_at,contact_preference,registration_source
)
SELECT
  id,email,NULL,first_name,last_name,role,team,password_hash,password_salt,password_iterations,
  active,created_at,updated_at,last_login_at,last_active_at,failed_login_count,locked_until,
  CASE WHEN email IS NOT NULL THEN created_at ELSE NULL END,NULL,
  CASE WHEN email IS NOT NULL THEN 'email' ELSE NULL END,'legacy'
FROM users;

DROP TABLE users;
ALTER TABLE users_v2 RENAME TO users;

CREATE INDEX users_role_idx_v2 ON users(role);
CREATE INDEX users_active_idx_v2 ON users(active, last_active_at);
CREATE INDEX users_phone_idx ON users(phone);
CREATE INDEX users_registration_idx ON users(registration_source, created_at);

ALTER TABLE password_reset_tokens ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0;


CREATE TABLE registration_rate_limits (
  key_hash TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  attempt_count INTEGER NOT NULL
);

CREATE INDEX registration_rate_window_idx ON registration_rate_limits(window_start);

CREATE TABLE verification_challenges (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email','sms')),
  destination TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  used_at INTEGER,
  sent_at INTEGER,
  provider_message_id TEXT
);

CREATE INDEX verification_user_idx ON verification_challenges(user_id, created_at DESC);
CREATE INDEX verification_expiry_idx ON verification_challenges(expires_at);

CREATE TABLE consent_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL,
  granted INTEGER NOT NULL,
  policy_version TEXT,
  source TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX consent_user_time_idx ON consent_events(user_id, created_at DESC);

CREATE TABLE certificates (
  id TEXT PRIMARY KEY,
  verification_code TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  certificate_name TEXT NOT NULL,
  course_id TEXT NOT NULL,
  course_level TEXT NOT NULL,
  course_version TEXT NOT NULL,
  assessment_version TEXT,
  score REAL,
  issued_at INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('valid','suspended','revoked','superseded')),
  updated_at INTEGER NOT NULL,
  revoked_at INTEGER,
  revocation_reason TEXT,
  superseded_by TEXT REFERENCES certificates(id),
  public_note TEXT
);

CREATE INDEX certificates_user_idx ON certificates(user_id, issued_at DESC);
CREATE INDEX certificates_status_idx ON certificates(status, issued_at DESC);

CREATE TABLE certificate_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  certificate_id TEXT NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
  actor_user_id TEXT REFERENCES users(id),
  event_type TEXT NOT NULL,
  detail TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX certificate_events_idx ON certificate_events(certificate_id, created_at DESC);

CREATE TABLE certification_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL,
  assessment_version TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  score REAL,
  critical_errors INTEGER,
  passed INTEGER,
  evidence_json TEXT,
  certificate_id TEXT REFERENCES certificates(id)
);

CREATE INDEX certification_user_idx ON certification_attempts(user_id, started_at DESC);

PRAGMA foreign_keys = ON;
