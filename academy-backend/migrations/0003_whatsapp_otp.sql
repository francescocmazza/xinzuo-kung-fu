PRAGMA foreign_keys = OFF;

CREATE TABLE users_v3 (
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
  contact_preference TEXT CHECK (contact_preference IN ('email','whatsapp')),
  registration_source TEXT NOT NULL DEFAULT 'public',
  terms_version TEXT,
  privacy_version TEXT,
  terms_accepted_at INTEGER,
  privacy_accepted_at INTEGER,
  marketing_email_consent INTEGER NOT NULL DEFAULT 0,
  marketing_sms_consent INTEGER NOT NULL DEFAULT 0,
  marketing_whatsapp_consent INTEGER NOT NULL DEFAULT 0,
  marketing_phone_consent INTEGER NOT NULL DEFAULT 0,
  marketing_consent_updated_at INTEGER,
  CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

INSERT INTO users_v3(
  id,email,phone,first_name,last_name,role,team,password_hash,password_salt,password_iterations,
  active,created_at,updated_at,last_login_at,last_active_at,failed_login_count,locked_until,
  email_verified_at,phone_verified_at,contact_preference,registration_source,
  terms_version,privacy_version,terms_accepted_at,privacy_accepted_at,
  marketing_email_consent,marketing_sms_consent,marketing_whatsapp_consent,marketing_phone_consent,marketing_consent_updated_at
)
SELECT
  id,email,phone,first_name,last_name,role,team,password_hash,password_salt,password_iterations,
  active,created_at,updated_at,last_login_at,last_active_at,failed_login_count,locked_until,
  email_verified_at,phone_verified_at,
  CASE contact_preference WHEN 'sms' THEN 'whatsapp' ELSE contact_preference END,
  registration_source,terms_version,privacy_version,terms_accepted_at,privacy_accepted_at,
  marketing_email_consent,marketing_sms_consent,0,marketing_phone_consent,marketing_consent_updated_at
FROM users;

DROP TABLE users;
ALTER TABLE users_v3 RENAME TO users;

CREATE INDEX users_role_idx_v3 ON users(role);
CREATE INDEX users_active_idx_v3 ON users(active, last_active_at);
CREATE INDEX users_phone_idx_v3 ON users(phone);
CREATE INDEX users_registration_idx_v3 ON users(registration_source, created_at);

CREATE TABLE verification_challenges_v3 (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email','whatsapp')),
  destination TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  used_at INTEGER,
  sent_at INTEGER,
  provider_message_id TEXT
);

INSERT INTO verification_challenges_v3(
  id,user_id,channel,destination,code_hash,created_at,expires_at,attempts,used_at,sent_at,provider_message_id
)
SELECT
  id,user_id,CASE channel WHEN 'sms' THEN 'whatsapp' ELSE channel END,destination,code_hash,created_at,expires_at,attempts,used_at,sent_at,provider_message_id
FROM verification_challenges;

DROP TABLE verification_challenges;
ALTER TABLE verification_challenges_v3 RENAME TO verification_challenges;

CREATE INDEX verification_user_idx_v3 ON verification_challenges(user_id, created_at DESC);
CREATE INDEX verification_expiry_idx_v3 ON verification_challenges(expires_at);

PRAGMA foreign_keys = ON;
