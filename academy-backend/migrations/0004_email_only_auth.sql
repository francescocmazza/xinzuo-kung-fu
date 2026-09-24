PRAGMA foreign_keys = OFF;

CREATE TABLE verification_challenges_email (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel = 'email'),
  destination TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  used_at INTEGER,
  sent_at INTEGER,
  provider_message_id TEXT
);

INSERT INTO verification_challenges_email(
  id,user_id,channel,destination,code_hash,created_at,expires_at,attempts,used_at,sent_at,provider_message_id
)
SELECT
  id,user_id,'email',destination,code_hash,created_at,expires_at,attempts,used_at,sent_at,provider_message_id
FROM verification_challenges
WHERE channel='email';

DROP TABLE verification_challenges;
ALTER TABLE verification_challenges_email RENAME TO verification_challenges;

CREATE INDEX verification_user_idx_email ON verification_challenges(user_id, created_at DESC);
CREATE INDEX verification_expiry_idx_email ON verification_challenges(expires_at);

UPDATE users
SET contact_preference='email'
WHERE email IS NOT NULL AND contact_preference IS NOT NULL;

UPDATE users
SET marketing_whatsapp_consent=0
WHERE marketing_whatsapp_consent <> 0;

PRAGMA foreign_keys = ON;
