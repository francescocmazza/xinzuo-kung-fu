# Xinzuo Academy public backend

Cloudflare Worker + D1 backend for public registration, verified contact data, learner progress, consent history, management reporting and certificate lifecycle.

## Public account model

Public learners do **not** need an invitation.

Registration requires:

- first name and last name;
- password;
- at least one contact between email and mobile phone;
- verification of the selected contact with a six-digit OTP;
- confirmation that the user is at least 18;
- acceptance of the current Academy Terms and Privacy Notice.

Marketing consent is deliberately separate and optional:

- email marketing;
- SMS marketing;
- telephone marketing / loyalty contact.

A user may refuse or later withdraw all marketing permissions without losing the Academy account, learning progress or certificate rights.

Internal `manager` accounts remain invitation-only and can be created by an `admin`.

## Verification delivery

The Worker supports three delivery patterns:

1. **Email with Resend**
   - secret: `RESEND_API_KEY`
   - variable: `VERIFICATION_EMAIL_FROM`
2. **SMS with Twilio**
   - secrets: `TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY`, `TWILIO_API_SECRET`
   - one of: `TWILIO_FROM_NUMBER` or `TWILIO_MESSAGING_SERVICE_SID`
   - optional variable: `TWILIO_API_BASE` (the default is the standard Twilio API URL; an EU regional endpoint can be supplied)
3. **Company webhook**
   - secret: `VERIFICATION_WEBHOOK_URL`
   - receives JSON containing `type`, `channel`, `destination`, `code`, and expiry.

`GET /api/health` reports which verification channels are currently usable so the browser can disable unavailable options.

## Authentication and security

- password storage: PBKDF2-HMAC-SHA256, 600,000 iterations, unique random salt and optional server-side pepper;
- session, invitation and reset tokens stored as hashes;
- verification challenges expire after ten minutes and have a bounded attempt count;
- password reset codes expire after 30 minutes;
- temporary lockout after repeated failed logins;
- CORS allowlist;
- bearer session transport for the current cross-origin GitHub Pages + Worker deployment.

## Data and reporting

D1 stores:

- accounts and verified contacts;
- consent state plus an immutable consent-event history;
- sessions and verification challenges;
- adaptive learner progress;
- active engagement time;
- learning activity events;
- certification attempts;
- certificates and certificate lifecycle events.

The management dashboard can inspect registrations, progress, activity, engagement, results and certificates. The admin-only audience endpoint exposes verified contact details and current marketing permissions for approved company workflows.

## Certificates

Certificates have:

- internal UUID;
- public verification code;
- learner name snapshot;
- course/level/version;
- optional assessment version and score;
- issue date;
- status: `valid`, `suspended`, `revoked`, or `superseded`;
- lifecycle event log.

Public verification is available through:

`GET /api/certificates/verify/:verificationCode`

The public certificate page exposes only certificate information needed for verification and never publishes the learner's email, phone, password, detailed progress or marketing preferences.

Manual admin issuance is available as a temporary operational seam. The intended production path is to connect issuance to a server-side final certification assessment rather than to the formative browser mini-tests.

## Legal configuration before public launch

The Academy legal identity is now preconfigured as:

- **Data controller:** FCM SRLS
- **Registered office:** Via Benvenuto Cellini 15G, 04100 Latina (LT), Italy
- **Italian VAT number:** 03086390592
- **Privacy / Academy contact:** Dott. Francesco Claudio Mazza
- **Contact email:** f.mazza@xinzuo-europe.com

Repository variables with the corresponding `ACADEMY_PRIVACY_*` names may still override these defaults if the legal identity changes.

Before registration is enabled, the deployment still requires:

- `ACADEMY_PUBLIC_URL`
- `ACADEMY_API_BASE`
- `ACADEMY_PUBLIC_REGISTRATION_ENABLED=true` only after Worker/D1 and at least one OTP delivery channel are operational.

The browser intentionally blocks public registration if the full controller identity/contact configuration is incomplete.

The bundled Privacy Notice and Terms are an operational draft and should receive final legal review for the actual controller, processors, international transfers, retention decisions and launch jurisdictions.

## Cloudflare deployment

Required GitHub secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `ACADEMY_D1_DATABASE_ID`
- `ACADEMY_BOOTSTRAP_TOKEN`
- `ACADEMY_PASSWORD_PEPPER`
- `ACADEMY_IP_HASH_SALT`

Recommended:

- `ACADEMY_VERIFICATION_PEPPER`

Then configure at least one verification delivery path listed above.

Run the manual GitHub Action:

**Deploy Xinzuo Academy public backend**

It applies all D1 migrations, configures Worker secrets and deploys the Worker.

## First administrator

Only while the database contains no users:

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

The administrator can then create internal manager invitations and manage public learners/certificates.

## Privacy model

Necessary Academy processing and optional marketing are intentionally separated.

Necessary service communications can include account security, contact verification, material course changes and certificate status. Promotional, loyalty and marketing contact is controlled by separate user choices and can be changed later from the account panel.

No third-party marketing transfer is implemented by this backend.
