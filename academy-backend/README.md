# Xinzuo Academy company backend

Cloudflare Worker + D1 backend for staff authentication, progress synchronization and management reporting.

## What it provides

- invitation-based employee registration;
- login/logout with revocable bearer sessions;
- password change and one-hour reset tokens;
- bootstrap of the first administrator;
- `staff`, `manager`, and `admin` roles;
- cross-device Academy progress persistence;
- active-time heartbeat for engagement measurement;
- activity events for question, mini-test and module completion;
- manager dashboard APIs for progress, engagement and current results;
- manager-created staff invitations;
- manager-created password-reset links;
- user enable/disable and team assignment;
- D1 migrations kept in Git.

## Security model

Passwords are never stored in plaintext. The Worker uses PBKDF2-HMAC-SHA256 with 600,000 iterations, a unique random salt per account and an optional server-side pepper. Session tokens and invitation/reset tokens are stored only as SHA-256 hashes in D1. Login attempts are temporarily locked after repeated failures.

The browser authenticates API requests with a bearer session token. The current GitHub Pages deployment can therefore call a separate Worker origin without relying on third-party cookies. For a later same-origin Academy deployment, the session transport can be migrated to an HttpOnly cookie without changing the D1 user/progress model.

## First deployment

1. Create a D1 database:
   `npx wrangler d1 create xinzuo-academy --location weur`
2. Copy `wrangler.example.jsonc` to `wrangler.jsonc` and insert the returned database ID.
3. Configure Worker secrets:
   - `BOOTSTRAP_TOKEN`: high-entropy one-time administrator bootstrap secret;
   - `PASSWORD_PEPPER`: high-entropy password pepper;
   - `IP_HASH_SALT`: random salt used before retaining hashed source-IP information.
4. Apply migrations:
   `npx wrangler d1 migrations apply DB --remote --config wrangler.jsonc`
5. Deploy:
   `npx wrangler deploy --config wrangler.jsonc`
6. Set repository variable `ACADEMY_API_BASE` to the Worker URL/custom domain. The Academy Pages workflow writes that value into the runtime `academy/config.js`.

Optional:
- `RESET_WEBHOOK_URL`: HTTPS endpoint that accepts password-reset notification JSON;
- `RESET_PAGE_URL`: public Academy URL used to build reset links;
- `ALLOWED_ORIGINS`: comma-separated browser origins allowed to call the API.

## Bootstrap the first administrator

Only when the database contains no users:

```bash
curl -X POST "$ACADEMY_API_BASE/api/bootstrap" \
  -H "Content-Type: application/json" \
  -H "X-Bootstrap-Token: $BOOTSTRAP_TOKEN" \
  -d '{
    "email": "admin@example.com",
    "firstName": "First",
    "lastName": "Last",
    "team": "Management",
    "password": "a-long-company-passphrase"
  }'
```

After that, the administrator creates manager/staff invitations from the Academy dashboard.

## Manager metrics

The dashboard exposes:
- total active learners;
- learners active in the last seven days;
- average Base completion;
- average completed mini-test score;
- average verified active time;
- acquired and weak/nearly-acquired concepts;
- per-person progress, interactions, results and recent activity.

Engagement is not "time logged in". The client sends one-minute heartbeat increments only while the Academy page is visible and the user has interacted recently.

## Certification boundary

The current mini-tests remain formative. Their results are useful for training operations, but the future pass/fail certification should be executed and scored server-side so a learner cannot alter a certification result by editing browser state.
