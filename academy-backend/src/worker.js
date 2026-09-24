import { BASE_CERTIFICATION_BANK, BASE_CERTIFICATION_VERSION } from "./certification-bank.js";

const enc = new TextEncoder();
const PASSWORD_ITERATIONS = 600000;
const SESSION_SHORT = 12 * 60 * 60;
const SESSION_LONG = 30 * 24 * 60 * 60;
const LOCK_SECONDS = 15 * 60;
const VERIFICATION_TTL = 10 * 60;
const VERIFICATION_MAX_ATTEMPTS = 6;
const TERMS_VERSION = "2026-09-24-v1";
const PRIVACY_VERSION = "2026-09-24-v1";
const DEFAULT_ALLOWED_ORIGINS = ["https://francescocmazza.github.io", "http://localhost:8000", "http://127.0.0.1:8000"];

export default {
  async fetch(request, env) {
    try {
      if (request.method === "OPTIONS") return preflight(request, env);
      const url = new URL(request.url);
      if (!url.pathname.startsWith("/api/")) return apiError(request, env, 404, "not_found", "API endpoint not found.");

      if (url.pathname === "/api/health" && request.method === "GET") {
        return apiJson(request, env, {
          ok:true,
          service:"xinzuo-academy",
          now:new Date().toISOString(),
          publicRegistration:publicRegistrationEnabled(env),
          verificationChannels:{
            email:canSendVerification("email",env),
            whatsapp:canSendVerification("whatsapp",env)
          },
          termsVersion:TERMS_VERSION,
          privacyVersion:PRIVACY_VERSION
        });
      }

      if (url.pathname === "/api/bootstrap" && request.method === "POST") return bootstrap(request, env);
      if (url.pathname === "/api/auth/register/start" && request.method === "POST") return publicRegisterStart(request, env);
      if (url.pathname === "/api/auth/register/verify" && request.method === "POST") return publicRegisterVerify(request, env);
      if (url.pathname === "/api/auth/register/resend" && request.method === "POST") return publicRegisterResend(request, env);
      if (url.pathname === "/api/auth/register" && request.method === "POST") return registerByInvite(request, env);
      if (url.pathname === "/api/auth/login" && request.method === "POST") return login(request, env);
      if (url.pathname === "/api/auth/logout" && request.method === "POST") return logout(request, env);
      if (url.pathname === "/api/auth/change-password" && request.method === "POST") return changePassword(request, env);
      if (url.pathname === "/api/auth/request-reset" && request.method === "POST") return requestPasswordReset(request, env);
      if (url.pathname === "/api/auth/reset-password" && request.method === "POST") return resetPassword(request, env);
      if (url.pathname === "/api/me" && request.method === "GET") return me(request, env);
      if (url.pathname === "/api/privacy/consents" && request.method === "GET") return getConsents(request, env);
      if (url.pathname === "/api/privacy/consents" && request.method === "PATCH") return updateConsents(request, env);
      if (url.pathname === "/api/certificates/mine" && request.method === "GET") return myCertificates(request, env);
      if (url.pathname === "/api/certification/base/status" && request.method === "GET") return certificationStatus(request, env);
      if (url.pathname === "/api/certification/base/start" && request.method === "POST") return startBaseCertification(request, env);
      if (url.pathname === "/api/certification/base/submit" && request.method === "POST") return submitBaseCertification(request, env);
      if (url.pathname === "/api/progress" && request.method === "GET") return getProgress(request, env);
      if (url.pathname === "/api/progress" && request.method === "PUT") return putProgress(request, env);
      if (url.pathname === "/api/activity/ping" && request.method === "POST") return activityPing(request, env);
      if (url.pathname === "/api/activity/event" && request.method === "POST") return activityEvent(request, env);
      if (url.pathname === "/api/manager/overview" && request.method === "GET") return managerOverview(request, env);
      if (url.pathname === "/api/manager/users" && request.method === "GET") return managerUsers(request, env);
      if (url.pathname === "/api/manager/invites" && request.method === "GET") return managerInvites(request, env);
      if (url.pathname === "/api/manager/invites" && request.method === "POST") return createInvite(request, env);
      if (url.pathname === "/api/admin/audience" && request.method === "GET") return adminAudience(request, env);
      if (url.pathname === "/api/admin/certificates/issue" && request.method === "POST") return issueCertificate(request, env);

      const certVerify = url.pathname.match(/^\/api\/certificates\/verify\/([^/]+)$/);
      if (certVerify && request.method === "GET") return verifyCertificatePublic(request, env, decodeURIComponent(certVerify[1]));

      const certManage = url.pathname.match(/^\/api\/admin\/certificates\/([^/]+)$/);
      if (certManage && request.method === "PATCH") return updateCertificateStatus(request, env, decodeURIComponent(certManage[1]));

      const detail = url.pathname.match(/^\/api\/manager\/users\/([^/]+)$/);
      if (detail && request.method === "GET") return managerUserDetail(request, env, decodeURIComponent(detail[1]));
      if (detail && request.method === "PATCH") return updateManagedUser(request, env, decodeURIComponent(detail[1]));

      const reset = url.pathname.match(/^\/api\/manager\/users\/([^/]+)\/password-reset$/);
      if (reset && request.method === "POST") return managerPasswordReset(request, env, decodeURIComponent(reset[1]));

      return apiError(request, env, 404, "not_found", "API endpoint not found.");
    } catch (error) {
      console.error(error);
      return apiError(request, env, 500, "server_error", "Unexpected server error.");
    }
  }
};

function now() {
  return Math.floor(Date.now() / 1000);
}

function publicRegistrationEnabled(env) {
  return String(env.PUBLIC_REGISTRATION_ENABLED || "").toLowerCase() === "true";
}

function allowedOrigins(env) {
  const configured = String(env.ALLOWED_ORIGINS || "").split(",").map(v => v.trim()).filter(Boolean);
  return configured.length ? configured : DEFAULT_ALLOWED_ORIGINS;
}

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  const headers = {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "Vary": "Origin"
  };
  if (origin && allowedOrigins(env).includes(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function preflight(request, env) {
  const origin = request.headers.get("Origin");
  if (origin && !allowedOrigins(env).includes(origin)) {
    return new Response(null, { status: 403, headers: { "Vary": "Origin" } });
  }
  const headers = corsHeaders(request, env);
  headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,PATCH,OPTIONS";
  headers["Access-Control-Allow-Headers"] = "Authorization,Content-Type,X-Bootstrap-Token";
  headers["Access-Control-Max-Age"] = "86400";
  delete headers["Content-Type"];
  return new Response(null, { status: 204, headers });
}

function apiJson(request, env, value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: corsHeaders(request, env) });
}

function apiError(request, env, status, code, message) {
  return apiJson(request, env, { ok: false, error: code, message }, status);
}

async function bodyJson(request, maxBytes = 150000) {
  const raw = await request.text();
  if (raw.length > maxBytes) throw new HttpError(413, "payload_too_large", "Request body is too large.");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new HttpError(400, "invalid_json", "Invalid JSON body.");
  }
}

class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function validateEmail(email) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizePhone(value) {
  let phone = String(value || "").trim().replace(/[\s().-]/g, "");
  if (phone.startsWith("00")) phone = "+" + phone.slice(2);
  return phone;
}

function validatePhone(phone) {
  return /^\+[1-9]\d{7,14}$/.test(phone);
}

function maskedDestination(channel, value) {
  if (channel === "email") {
    const [local, domain] = String(value).split("@");
    if (!domain) return "***";
    return `${local.slice(0,2)}***@${domain}`;
  }
  const text = String(value);
  return text.length > 6 ? `${text.slice(0,3)}***${text.slice(-3)}` : "***";
}

function validatePassword(password) {
  if (typeof password !== "string" || password.length < 12) {
    throw new HttpError(400, "weak_password", "Password must contain at least 12 characters.");
  }
  if (password.length > 256) throw new HttpError(400, "password_too_long", "Password is too long.");
}

function cleanName(value, field) {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  if (!text || text.length > 80) throw new HttpError(400, "invalid_profile", `Invalid ${field}.`);
  return text;
}

function bytesToBase64url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64urlToBytes(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
  const binary = atob(base64);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

function randomToken(bytes = 32) {
  const out = new Uint8Array(bytes);
  crypto.getRandomValues(out);
  return bytesToBase64url(out);
}

async function sha256(value) {
  return bytesToBase64url(new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(value))));
}

async function passwordHash(password, saltB64, iterations, pepper = "") {
  const material = enc.encode(`${password}\u0000${pepper}`);
  const key = await crypto.subtle.importKey("raw", material, "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({
    name: "PBKDF2",
    hash: "SHA-256",
    salt: base64urlToBytes(saltB64),
    iterations
  }, key, 256);
  return bytesToBase64url(new Uint8Array(bits));
}

async function newPasswordRecord(password, env) {
  validatePassword(password);
  const salt = randomToken(18);
  const hash = await passwordHash(password, salt, PASSWORD_ITERATIONS, env.PASSWORD_PEPPER || "");
  return { salt, hash, iterations: PASSWORD_ITERATIONS };
}

async function verifyPassword(password, user, env) {
  const candidate = await passwordHash(password, user.password_salt, user.password_iterations, env.PASSWORD_PEPPER || "");
  const a = base64urlToBytes(candidate);
  const b = base64urlToBytes(user.password_hash);
  if (a.length !== b.length) return false;
  if (crypto.subtle.timingSafeEqual) return crypto.subtle.timingSafeEqual(a, b);
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function dummyPasswordWork(password, env) {
  const salt = "AAAAAAAAAAAAAAAAAAAAAAAA";
  await passwordHash(String(password || ""), salt, PASSWORD_ITERATIONS, env.PASSWORD_PEPPER || "");
}

async function ipHash(request, env) {
  const ip = request.headers.get("CF-Connecting-IP") || "";
  return ip ? sha256(`${ip}\u0000${env.IP_HASH_SALT || ""}`) : null;
}

async function enforceRegistrationRateLimit(request, env) {
  const ts = now();
  const windowSeconds = 15 * 60;
  const maxAttempts = Math.max(1,Math.min(30,Number(env.REGISTRATION_RATE_LIMIT || 5)));
  const keyHash = await ipHash(request,env) || await sha256(`${request.headers.get("User-Agent") || "unknown"}\u0000${env.IP_HASH_SALT || ""}`);
  const row = await env.DB.prepare("SELECT window_start,attempt_count FROM registration_rate_limits WHERE key_hash=?").bind(keyHash).first();
  if (!row || ts - Number(row.window_start) >= windowSeconds) {
    await env.DB.prepare(
      "INSERT INTO registration_rate_limits(key_hash,window_start,attempt_count) VALUES(?,?,1) ON CONFLICT(key_hash) DO UPDATE SET window_start=excluded.window_start,attempt_count=1"
    ).bind(keyHash,ts).run();
    return;
  }
  if (Number(row.attempt_count) >= maxAttempts) {
    throw new HttpError(429,"registration_rate_limited","Too many registration attempts. Try again later.");
  }
  await env.DB.prepare("UPDATE registration_rate_limits SET attempt_count=attempt_count+1 WHERE key_hash=?").bind(keyHash).run();
}

function publicUser(row) {
  return {
    id: row.id,
    email: row.email || "",
    phone: row.phone || "",
    emailVerified: Boolean(row.email_verified_at),
    phoneVerified: Boolean(row.phone_verified_at),
    firstName: row.first_name,
    lastName: row.last_name,
    role: row.role,
    team: row.team || "",
    active: Boolean(row.active),
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
    lastActiveAt: row.last_active_at,
    marketingEmailConsent: Boolean(row.marketing_email_consent),
    marketingWhatsappConsent: Boolean(row.marketing_whatsapp_consent),
    marketingPhoneConsent: Boolean(row.marketing_phone_consent),
    termsVersion: row.terms_version || "",
    privacyVersion: row.privacy_version || ""
  };
}

async function createSession(request, env, userId, remember) {
  const token = randomToken(32);
  const tokenHash = await sha256(token);
  const ts = now();
  const ttl = remember ? SESSION_LONG : SESSION_SHORT;
  await env.DB.prepare(
    "INSERT INTO sessions(token_hash,user_id,created_at,expires_at,last_seen_at,user_agent,ip_hash) VALUES(?,?,?,?,?,?,?)"
  ).bind(
    tokenHash,
    userId,
    ts,
    ts + ttl,
    ts,
    String(request.headers.get("User-Agent") || "").slice(0, 300),
    await ipHash(request, env)
  ).run();
  return { token, expiresAt: ts + ttl };
}

function bearer(request) {
  const value = request.headers.get("Authorization") || "";
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

async function authenticate(request, env, roles = null) {
  const token = bearer(request);
  if (!token) throw new HttpError(401, "unauthorized", "Sign in required.");
  const tokenHash = await sha256(token);
  const row = await env.DB.prepare(
    `SELECT s.token_hash,s.expires_at,s.last_seen_at,u.*
     FROM sessions s JOIN users u ON u.id=s.user_id
     WHERE s.token_hash=?`
  ).bind(tokenHash).first();
  if (!row || !row.active) throw new HttpError(401, "unauthorized", "Session is not valid.");
  const ts = now();
  if (row.expires_at <= ts) {
    await env.DB.prepare("DELETE FROM sessions WHERE token_hash=?").bind(tokenHash).run();
    throw new HttpError(401, "session_expired", "Session expired.");
  }
  if (roles && !roles.includes(row.role)) throw new HttpError(403, "forbidden", "Insufficient permissions.");
  if (ts - Number(row.last_seen_at || 0) > 60) {
    await env.DB.batch([
      env.DB.prepare("UPDATE sessions SET last_seen_at=? WHERE token_hash=?").bind(ts, tokenHash),
      env.DB.prepare("UPDATE users SET last_active_at=?,updated_at=? WHERE id=?").bind(ts, ts, row.id)
    ]);
  }
  return { user: row, tokenHash };
}

async function withHttpErrors(request, env, fn) {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof HttpError) return apiError(request, env, error.status, error.code, error.message);
    throw error;
  }
}

async function bootstrap(request, env) {
  return withHttpErrors(request, env, async () => {
    if (!env.BOOTSTRAP_TOKEN) throw new HttpError(503, "bootstrap_disabled", "Bootstrap is not configured.");
    if (request.headers.get("X-Bootstrap-Token") !== env.BOOTSTRAP_TOKEN) {
      throw new HttpError(403, "forbidden", "Invalid bootstrap token.");
    }
    const count = await env.DB.prepare("SELECT COUNT(*) AS n FROM users").first();
    if (Number(count?.n || 0) > 0) throw new HttpError(409, "already_bootstrapped", "An administrator already exists.");
    const body = await bodyJson(request);
    const email = normalizeEmail(body.email);
    if (!validateEmail(email)) throw new HttpError(400, "invalid_email", "Invalid email.");
    const firstName = cleanName(body.firstName, "first name");
    const lastName = cleanName(body.lastName, "last name");
    const pass = await newPasswordRecord(body.password, env);
    const id = crypto.randomUUID();
    const ts = now();
    await env.DB.prepare(
      `INSERT INTO users(id,email,first_name,last_name,role,team,password_hash,password_salt,password_iterations,active,created_at,updated_at,last_login_at,last_active_at,email_verified_at,registration_source)
       VALUES(?,?,?,?, 'admin', ?,?,?,?,1,?,?,?,?,?,'bootstrap')`
    ).bind(id,email,firstName,lastName,String(body.team||"Management").slice(0,80),pass.hash,pass.salt,pass.iterations,ts,ts,ts,ts,ts).run();
    const session = await createSession(request, env, id, true);
    const user = await env.DB.prepare("SELECT * FROM users WHERE id=?").bind(id).first();
    return apiJson(request, env, { ok:true, user:publicUser(user), ...session }, 201);
  });
}

async function registerByInvite(request, env) {
  return withHttpErrors(request, env, async () => {
    const body = await bodyJson(request);
    const inviteToken = String(body.inviteToken || "").trim();
    if (!inviteToken) throw new HttpError(400, "invite_required", "A company invitation is required.");
    const inviteHash = await sha256(inviteToken);
    const invite = await env.DB.prepare("SELECT * FROM invites WHERE token_hash=?").bind(inviteHash).first();
    const ts = now();
    if (!invite || invite.used_at || invite.expires_at <= ts) throw new HttpError(400, "invalid_invite", "Invitation is invalid or expired.");

    const email = normalizeEmail(body.email);
    if (!validateEmail(email)) throw new HttpError(400, "invalid_email", "Invalid email.");
    if (invite.email && normalizeEmail(invite.email) !== email) throw new HttpError(400, "invite_email_mismatch", "Invitation is assigned to another email.");
    const exists = await env.DB.prepare("SELECT id FROM users WHERE email=?").bind(email).first();
    if (exists) throw new HttpError(409, "email_exists", "An account already exists for this email.");

    const firstName = cleanName(body.firstName, "first name");
    const lastName = cleanName(body.lastName, "last name");
    const pass = await newPasswordRecord(body.password, env);
    const id = crypto.randomUUID();
    const team = String(invite.team || "").trim().slice(0,80);
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO users(id,email,first_name,last_name,role,team,password_hash,password_salt,password_iterations,active,created_at,updated_at,last_login_at,last_active_at,email_verified_at,registration_source)
         VALUES(?,?,?,?,?,?,?,?,?,1,?,?,?,?,?,'internal-invite')`
      ).bind(id,email,firstName,lastName,invite.role,team,pass.hash,pass.salt,pass.iterations,ts,ts,ts,ts,ts),
      env.DB.prepare("UPDATE invites SET used_at=?,used_by=? WHERE token_hash=? AND used_at IS NULL").bind(ts,id,inviteHash)
    ]);
    const session = await createSession(request, env, id, Boolean(body.remember));
    const user = await env.DB.prepare("SELECT * FROM users WHERE id=?").bind(id).first();
    return apiJson(request, env, { ok:true, user:publicUser(user), ...session }, 201);
  });
}


function canSendVerification(channel, env) {
  if (env.VERIFICATION_WEBHOOK_URL) return true;
  if (channel === "email") return Boolean(env.RESEND_API_KEY && env.VERIFICATION_EMAIL_FROM);
  if (channel === "whatsapp") {
    return Boolean(
      env.WHATSAPP_ACCESS_TOKEN &&
      env.WHATSAPP_PHONE_NUMBER_ID &&
      env.WHATSAPP_TEMPLATE_NAME &&
      env.WHATSAPP_TEMPLATE_LANGUAGE
    );
  }
  return false;
}

function verificationCode() {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return String(bytes[0] % 1000000).padStart(6, "0");
}

async function verificationHash(challengeId, code, env) {
  return sha256(`${challengeId}\u0000${code}\u0000${env.VERIFICATION_PEPPER || env.PASSWORD_PEPPER || ""}`);
}

async function sendVerification(channel, destination, code, env) {
  if (env.VERIFICATION_WEBHOOK_URL) {
    const response = await fetch(env.VERIFICATION_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "xinzuo-academy-verification",
        channel,
        destination,
        code,
        expiresMinutes: VERIFICATION_TTL / 60
      })
    });
    if (!response.ok) throw new HttpError(503, "verification_delivery_failed", "Unable to send verification code.");
    return { providerMessageId: response.headers.get("X-Message-Id") || null };
  }

  if (channel === "email") {
    if (!env.RESEND_API_KEY || !env.VERIFICATION_EMAIL_FROM) {
      throw new HttpError(503, "verification_delivery_unavailable", "Email verification is not configured.");
    }
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: env.VERIFICATION_EMAIL_FROM,
        to: [destination],
        subject: "Xinzuo Academy — verification code",
        html: `<p>Your Xinzuo Academy verification code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:.18em">${code}</p><p>The code expires in ${VERIFICATION_TTL / 60} minutes.</p>`
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("Resend verification error", payload);
      throw new HttpError(503, "verification_delivery_failed", "Unable to send verification email.");
    }
    return { providerMessageId: payload.id || null };
  }

  if (channel === "whatsapp") {
    if (!canSendVerification("whatsapp", env)) {
      throw new HttpError(503, "verification_delivery_unavailable", "WhatsApp verification is not configured.");
    }
    const version = String(env.WHATSAPP_GRAPH_VERSION || "v26.0");
    const url = `https://graph.facebook.com/${version}/${encodeURIComponent(env.WHATSAPP_PHONE_NUMBER_ID)}/messages`;
    const templateName = String(env.WHATSAPP_TEMPLATE_NAME);
    const languageCode = String(env.WHATSAPP_TEMPLATE_LANGUAGE);
    const response = await fetch(url, {
      method:"POST",
      headers:{
        "Authorization":`Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        messaging_product:"whatsapp",
        recipient_type:"individual",
        to:String(destination).replace(/^\+/,""),
        type:"template",
        template:{
          name:templateName,
          language:{code:languageCode},
          components:[
            {
              type:"body",
              parameters:[{type:"text",text:code}]
            },
            {
              type:"button",
              sub_type:"url",
              index:"0",
              parameters:[{type:"text",text:code}]
            }
          ]
        }
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("WhatsApp verification error", payload);
      throw new HttpError(503, "verification_delivery_failed", "Unable to send verification code on WhatsApp.");
    }
    return { providerMessageId: payload?.messages?.[0]?.id || null };
  }

  throw new HttpError(400, "invalid_channel", "Invalid verification channel.");
}

async function createVerificationChallenge(env, userId, channel, destination) {
  if (!canSendVerification(channel, env)) {
    throw new HttpError(503, "verification_delivery_unavailable", `${channel === "email" ? "Email" : "WhatsApp"} verification is not configured.`);
  }
  const challengeId = crypto.randomUUID();
  const code = verificationCode();
  const codeHash = await verificationHash(challengeId, code, env);
  const ts = now();
  await env.DB.prepare(
    `INSERT INTO verification_challenges(id,user_id,channel,destination,code_hash,created_at,expires_at,attempts,used_at,sent_at,provider_message_id)
     VALUES(?,?,?,?,?,?,?,0,NULL,NULL,NULL)`
  ).bind(challengeId,userId,channel,destination,codeHash,ts,ts+VERIFICATION_TTL).run();

  try {
    const sent = await sendVerification(channel, destination, code, env);
    await env.DB.prepare("UPDATE verification_challenges SET sent_at=?,provider_message_id=? WHERE id=?")
      .bind(now(),sent.providerMessageId,challengeId).run();
  } catch (error) {
    await env.DB.prepare("DELETE FROM verification_challenges WHERE id=?").bind(challengeId).run();
    throw error;
  }

  return { challengeId, expiresAt: ts + VERIFICATION_TTL, destination: maskedDestination(channel,destination) };
}

async function recordConsent(env, userId, type, granted, version, source = "registration") {
  await env.DB.prepare(
    "INSERT INTO consent_events(user_id,consent_type,granted,policy_version,source,created_at) VALUES(?,?,?,?,?,?)"
  ).bind(userId,type,granted ? 1 : 0,version || null,source,now()).run();
}

async function publicRegisterStart(request, env) {
  return withHttpErrors(request, env, async () => {
    if (!publicRegistrationEnabled(env)) {
      throw new HttpError(503,"registration_closed","Public registration is not open yet.");
    }
    await enforceRegistrationRateLimit(request,env);
    const body = await bodyJson(request);
    if (body.ageConfirmed !== true) {
      throw new HttpError(400, "age_required", "Public registration is currently available to adults aged 18 or over.");
    }
    if (body.acceptTerms !== true || body.acceptPrivacy !== true) {
      throw new HttpError(400, "required_acceptance", "Terms and privacy notice must be accepted.");
    }

    const firstName = cleanName(body.firstName, "first name");
    const lastName = cleanName(body.lastName, "last name");
    const email = normalizeEmail(body.email);
    const phone = normalizePhone(body.phone);

    const hasEmail = Boolean(email);
    const hasPhone = Boolean(phone);
    if (!hasEmail && !hasPhone) throw new HttpError(400, "contact_required", "Provide at least one email address or mobile number.");
    if (hasEmail && !validateEmail(email)) throw new HttpError(400, "invalid_email", "Invalid email.");
    if (hasPhone && !validatePhone(phone)) throw new HttpError(400, "invalid_phone", "Mobile number must use international format, for example +393331234567.");

    const channel = String(body.verificationChannel || (hasEmail ? "email" : "whatsapp"));
    if (channel === "email" && !hasEmail) throw new HttpError(400, "verification_contact_missing", "Email is required for email verification.");
    if (channel === "whatsapp" && !hasPhone) throw new HttpError(400, "verification_contact_missing", "Mobile number is required for WhatsApp verification.");
    if (channel === "whatsapp" && body.whatsappServiceConsent !== true) {
      throw new HttpError(400, "whatsapp_consent_required", "Consent to receive necessary Academy messages on WhatsApp is required for WhatsApp verification.");
    }
    if (!["email","whatsapp"].includes(channel)) throw new HttpError(400, "invalid_channel", "Invalid verification channel.");
    if (!canSendVerification(channel, env)) {
      throw new HttpError(503, "verification_delivery_unavailable", `${channel === "email" ? "Email" : "WhatsApp"} verification is not configured.`);
    }

    const existing = await env.DB.prepare(
      "SELECT id,active FROM users WHERE (? IS NOT NULL AND email=?) OR (? IS NOT NULL AND phone=?) LIMIT 1"
    ).bind(hasEmail ? email : null,hasEmail ? email : null,hasPhone ? phone : null,hasPhone ? phone : null).first();
    if (existing?.active) throw new HttpError(409, "account_exists", "An account already exists for this email or mobile number.");
    if (existing && !existing.active) {
      await env.DB.prepare("DELETE FROM users WHERE id=?").bind(existing.id).run();
    }

    const pass = await newPasswordRecord(body.password, env);
    const id = crypto.randomUUID();
    const ts = now();
    const marketingEmail = Boolean(body.marketingEmailConsent && hasEmail);
    const marketingWhatsapp = Boolean(body.marketingWhatsappConsent && hasPhone);
    const marketingPhone = Boolean(body.marketingPhoneConsent && hasPhone);

    await env.DB.prepare(
      `INSERT INTO users(
        id,email,phone,first_name,last_name,role,team,password_hash,password_salt,password_iterations,active,
        created_at,updated_at,last_login_at,last_active_at,email_verified_at,phone_verified_at,contact_preference,
        registration_source,terms_version,privacy_version,terms_accepted_at,privacy_accepted_at,
        marketing_email_consent,marketing_sms_consent,marketing_whatsapp_consent,marketing_phone_consent,marketing_consent_updated_at
       ) VALUES(?,?,?,?,?,'staff',NULL,?,?,?,0,?,?,NULL,NULL,NULL,NULL,?,'public',?,?,?,?,?,?,?,?,?)`
    ).bind(
      id,hasEmail ? email : null,hasPhone ? phone : null,firstName,lastName,pass.hash,pass.salt,pass.iterations,
      ts,ts,channel,TERMS_VERSION,PRIVACY_VERSION,ts,ts,
      marketingEmail ? 1 : 0,0,marketingWhatsapp ? 1 : 0,marketingPhone ? 1 : 0,ts
    ).run();

    await Promise.all([
      recordConsent(env,id,"terms",true,TERMS_VERSION),
      recordConsent(env,id,"privacy",true,PRIVACY_VERSION),
      recordConsent(env,id,"marketing_email",marketingEmail,PRIVACY_VERSION),
      recordConsent(env,id,"whatsapp_service",channel === "whatsapp",PRIVACY_VERSION),
      recordConsent(env,id,"marketing_whatsapp",marketingWhatsapp,PRIVACY_VERSION),
      recordConsent(env,id,"marketing_phone",marketingPhone,PRIVACY_VERSION)
    ]);

    const destination = channel === "email" ? email : phone;
    const challenge = await createVerificationChallenge(env,id,channel,destination);
    return apiJson(request, env, {
      ok:true,
      registrationId:id,
      verificationChannel:channel,
      maskedDestination:challenge.destination,
      expiresAt:challenge.expiresAt,
      termsVersion:TERMS_VERSION,
      privacyVersion:PRIVACY_VERSION
    }, 201);
  });
}

async function publicRegisterVerify(request, env) {
  return withHttpErrors(request, env, async () => {
    const body = await bodyJson(request);
    const registrationId = String(body.registrationId || "").trim();
    const code = String(body.code || "").trim();
    if (!registrationId || !/^\d{6}$/.test(code)) throw new HttpError(400, "invalid_verification", "Enter the six-digit verification code.");

    const user = await env.DB.prepare("SELECT * FROM users WHERE id=?").bind(registrationId).first();
    if (!user || user.active) throw new HttpError(400, "invalid_verification", "Registration is not awaiting verification.");

    const challenge = await env.DB.prepare(
      "SELECT * FROM verification_challenges WHERE user_id=? AND used_at IS NULL ORDER BY created_at DESC LIMIT 1"
    ).bind(registrationId).first();
    const ts = now();
    if (!challenge || challenge.expires_at <= ts) throw new HttpError(400, "verification_expired", "Verification code expired.");
    if (Number(challenge.attempts || 0) >= VERIFICATION_MAX_ATTEMPTS) {
      throw new HttpError(429, "verification_locked", "Too many incorrect verification attempts.");
    }

    const expected = await verificationHash(challenge.id,code,env);
    if (expected !== challenge.code_hash) {
      await env.DB.prepare("UPDATE verification_challenges SET attempts=attempts+1 WHERE id=?").bind(challenge.id).run();
      throw new HttpError(400, "invalid_verification", "Verification code is incorrect.");
    }

    const verifiedField = challenge.channel === "email" ? "email_verified_at" : "phone_verified_at";
    await env.DB.batch([
      env.DB.prepare(`UPDATE verification_challenges SET used_at=?,attempts=attempts+1 WHERE id=?`).bind(ts,challenge.id),
      env.DB.prepare(`UPDATE users SET active=1,${verifiedField}=?,last_login_at=?,last_active_at=?,updated_at=? WHERE id=?`)
        .bind(ts,ts,ts,ts,registrationId)
    ]);

    const session = await createSession(request,env,registrationId,Boolean(body.remember));
    const fresh = await env.DB.prepare("SELECT * FROM users WHERE id=?").bind(registrationId).first();
    return apiJson(request, env, { ok:true, user:publicUser(fresh), ...session });
  });
}

async function publicRegisterResend(request, env) {
  return withHttpErrors(request, env, async () => {
    const body = await bodyJson(request);
    const registrationId = String(body.registrationId || "").trim();
    const user = await env.DB.prepare("SELECT * FROM users WHERE id=?").bind(registrationId).first();
    if (!user || user.active) throw new HttpError(400, "invalid_registration", "Registration is not awaiting verification.");

    const recent = await env.DB.prepare(
      "SELECT created_at FROM verification_challenges WHERE user_id=? ORDER BY created_at DESC LIMIT 1"
    ).bind(registrationId).first();
    if (recent && now() - Number(recent.created_at) < 60) {
      throw new HttpError(429, "resend_too_soon", "Wait before requesting another code.");
    }

    const channel = String(body.verificationChannel || user.contact_preference || (user.email ? "email" : "whatsapp"));
    const destination = channel === "email" ? user.email : user.phone;
    if (!destination) throw new HttpError(400, "verification_contact_missing", "Verification contact is unavailable.");
    const challenge = await createVerificationChallenge(env,registrationId,channel,destination);
    return apiJson(request, env, {
      ok:true,
      registrationId,
      verificationChannel:channel,
      maskedDestination:challenge.destination,
      expiresAt:challenge.expiresAt
    });
  });
}

async function getConsents(request, env) {
  return withHttpErrors(request, env, async () => {
    const auth = await authenticate(request,env);
    return apiJson(request, env, {
      ok:true,
      consents:{
        marketingEmail:Boolean(auth.user.marketing_email_consent),
        marketingWhatsapp:Boolean(auth.user.marketing_whatsapp_consent),
        marketingPhone:Boolean(auth.user.marketing_phone_consent),
        termsVersion:auth.user.terms_version || "",
        privacyVersion:auth.user.privacy_version || ""
      }
    });
  });
}

async function updateConsents(request, env) {
  return withHttpErrors(request, env, async () => {
    const auth = await authenticate(request,env);
    const body = await bodyJson(request);
    const emailConsent = Boolean(body.marketingEmail && auth.user.email);
    const whatsappConsent = Boolean(body.marketingWhatsapp && auth.user.phone);
    const phoneConsent = Boolean(body.marketingPhone && auth.user.phone);
    const ts = now();
    await env.DB.prepare(
      "UPDATE users SET marketing_email_consent=?,marketing_whatsapp_consent=?,marketing_phone_consent=?,marketing_consent_updated_at=?,updated_at=? WHERE id=?"
    ).bind(emailConsent?1:0,whatsappConsent?1:0,phoneConsent?1:0,ts,ts,auth.user.id).run();
    await Promise.all([
      recordConsent(env,auth.user.id,"marketing_email",emailConsent,PRIVACY_VERSION,"account"),
      recordConsent(env,auth.user.id,"marketing_whatsapp",whatsappConsent,PRIVACY_VERSION,"account"),
      recordConsent(env,auth.user.id,"marketing_phone",phoneConsent,PRIVACY_VERSION,"account")
    ]);
    const fresh = await env.DB.prepare("SELECT * FROM users WHERE id=?").bind(auth.user.id).first();
    return apiJson(request,env,{ok:true,user:publicUser(fresh)});
  });
}

async function login(request, env) {
  return withHttpErrors(request, env, async () => {
    const body = await bodyJson(request);
    const contact = String(body.contact || body.email || "").trim();
    const email = normalizeEmail(contact);
    const phone = normalizePhone(contact);
    const password = String(body.password || "");
    let user = null;
    if (validateEmail(email)) user = await env.DB.prepare("SELECT * FROM users WHERE email=?").bind(email).first();
    else if (validatePhone(phone)) user = await env.DB.prepare("SELECT * FROM users WHERE phone=?").bind(phone).first();
    const ts = now();

    if (!user) {
      await dummyPasswordWork(password, env);
      throw new HttpError(401, "invalid_credentials", "Invalid email or password.");
    }
    if (!user.active) throw new HttpError(403, "account_disabled", "This account is disabled.");
    if (user.locked_until && user.locked_until > ts) throw new HttpError(429, "account_locked", "Too many failed attempts. Try again later.");

    const valid = await verifyPassword(password, user, env);
    if (!valid) {
      const failures = Number(user.failed_login_count || 0) + 1;
      const lockedUntil = failures >= 5 ? ts + LOCK_SECONDS : null;
      await env.DB.prepare("UPDATE users SET failed_login_count=?,locked_until=?,updated_at=? WHERE id=?")
        .bind(failures >= 5 ? 0 : failures, lockedUntil, ts, user.id).run();
      throw new HttpError(401, "invalid_credentials", "Invalid email or password.");
    }

    await env.DB.prepare("UPDATE users SET failed_login_count=0,locked_until=NULL,last_login_at=?,last_active_at=?,updated_at=? WHERE id=?")
      .bind(ts,ts,ts,user.id).run();
    const session = await createSession(request, env, user.id, Boolean(body.remember));
    const fresh = await env.DB.prepare("SELECT * FROM users WHERE id=?").bind(user.id).first();
    return apiJson(request, env, { ok:true, user:publicUser(fresh), ...session });
  });
}

async function logout(request, env) {
  return withHttpErrors(request, env, async () => {
    const auth = await authenticate(request, env);
    await env.DB.prepare("DELETE FROM sessions WHERE token_hash=?").bind(auth.tokenHash).run();
    return apiJson(request, env, { ok:true });
  });
}

async function me(request, env) {
  return withHttpErrors(request, env, async () => {
    const auth = await authenticate(request, env);
    return apiJson(request, env, { ok:true, user:publicUser(auth.user) });
  });
}

async function changePassword(request, env) {
  return withHttpErrors(request, env, async () => {
    const auth = await authenticate(request, env);
    const body = await bodyJson(request);
    if (!await verifyPassword(String(body.currentPassword || ""), auth.user, env)) {
      throw new HttpError(400, "invalid_current_password", "Current password is incorrect.");
    }
    const pass = await newPasswordRecord(body.newPassword, env);
    const ts = now();
    await env.DB.batch([
      env.DB.prepare("UPDATE users SET password_hash=?,password_salt=?,password_iterations=?,updated_at=? WHERE id=?")
        .bind(pass.hash,pass.salt,pass.iterations,ts,auth.user.id),
      env.DB.prepare("DELETE FROM sessions WHERE user_id=?").bind(auth.user.id)
    ]);
    const session = await createSession(request, env, auth.user.id, true);
    return apiJson(request, env, { ok:true, ...session });
  });
}

async function createResetToken(env, userId, createdBy = null) {
  const raw = verificationCode();
  const hash = await sha256(raw);
  const ts = now();
  await env.DB.prepare(
    "INSERT INTO password_reset_tokens(token_hash,user_id,created_at,expires_at,used_at,created_by,attempts) VALUES(?,?,?,?,NULL,?,0)"
  ).bind(hash,userId,ts,ts + 30 * 60,createdBy).run();
  return raw;
}

async function sendResetCode(user, channel, code, env) {
  const destination = channel === "email" ? user.email : user.phone;
  if (!destination) throw new HttpError(400, "reset_contact_missing", "Reset contact is unavailable.");

  if (env.VERIFICATION_WEBHOOK_URL) {
    const response = await fetch(env.VERIFICATION_WEBHOOK_URL, {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        type:"xinzuo-academy-password-reset-code",
        channel,
        destination,
        code,
        expiresMinutes:30
      })
    });
    if (!response.ok) throw new HttpError(503,"reset_delivery_failed","Unable to send password reset code.");
    return;
  }

  if (channel === "email") {
    if (!env.RESEND_API_KEY || !env.VERIFICATION_EMAIL_FROM) {
      throw new HttpError(503,"reset_delivery_unavailable","Email delivery is not configured.");
    }
    const response = await fetch("https://api.resend.com/emails", {
      method:"POST",
      headers:{
        "Authorization":`Bearer ${env.RESEND_API_KEY}`,
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        from:env.VERIFICATION_EMAIL_FROM,
        to:[destination],
        subject:"Xinzuo Academy — password reset code",
        html:`<p>Your Xinzuo Academy password reset code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:.18em">${code}</p><p>The code expires in 30 minutes.</p>`
      })
    });
    if (!response.ok) throw new HttpError(503,"reset_delivery_failed","Unable to send password reset email.");
    return;
  }

  if (!canSendVerification("whatsapp",env)) {
    throw new HttpError(503,"reset_delivery_unavailable","WhatsApp delivery is not configured.");
  }
  await sendVerification("whatsapp", destination, code, env);
}

async function requestPasswordReset(request, env) {
  return withHttpErrors(request, env, async () => {
    const body = await bodyJson(request);
    const contact = String(body.contact || body.email || "").trim();
    const email = normalizeEmail(contact);
    const phone = normalizePhone(contact);
    let user = null;
    let channel = null;
    if (validateEmail(email)) {
      user = await env.DB.prepare("SELECT * FROM users WHERE email=? AND active=1").bind(email).first();
      channel = "email";
    } else if (validatePhone(phone)) {
      user = await env.DB.prepare("SELECT * FROM users WHERE phone=? AND active=1").bind(phone).first();
      channel = "whatsapp";
    }

    if (user && channel && canSendVerification(channel,env)) {
      const recent = await env.DB.prepare(
        "SELECT created_at FROM password_reset_tokens WHERE user_id=? ORDER BY created_at DESC LIMIT 1"
      ).bind(user.id).first();
      if (!recent || now() - Number(recent.created_at) >= 60) {
        const code = await createResetToken(env,user.id,null);
        await sendResetCode(user,channel,code,env);
      }
    }
    return apiJson(request, env, { ok:true, message:"If the account exists and the selected channel is available, a reset code will be sent." });
  });
}

async function resetPassword(request, env) {
  return withHttpErrors(request, env, async () => {
    const body = await bodyJson(request);
    const contact = String(body.contact || body.email || "").trim();
    const email = normalizeEmail(contact);
    const phone = normalizePhone(contact);
    const token = String(body.resetToken || "").trim();
    if (!/^\d{6}$/.test(token)) throw new HttpError(400,"invalid_reset","Enter the six-digit reset code.");

    let user = null;
    if (validateEmail(email)) user = await env.DB.prepare("SELECT * FROM users WHERE email=?").bind(email).first();
    else if (validatePhone(phone)) user = await env.DB.prepare("SELECT * FROM users WHERE phone=?").bind(phone).first();
    if (!user) throw new HttpError(400,"invalid_reset","Reset code is invalid or expired.");

    const row = await env.DB.prepare(
      "SELECT * FROM password_reset_tokens WHERE user_id=? AND used_at IS NULL ORDER BY created_at DESC LIMIT 1"
    ).bind(user.id).first();
    const ts = now();
    if (!row || row.expires_at <= ts || Number(row.attempts || 0) >= VERIFICATION_MAX_ATTEMPTS) {
      throw new HttpError(400,"invalid_reset","Reset code is invalid or expired.");
    }

    const tokenHash = await sha256(token);
    if (tokenHash !== row.token_hash) {
      await env.DB.prepare("UPDATE password_reset_tokens SET attempts=attempts+1 WHERE token_hash=?").bind(row.token_hash).run();
      throw new HttpError(400,"invalid_reset","Reset code is invalid or expired.");
    }

    const pass = await newPasswordRecord(body.newPassword, env);
    await env.DB.batch([
      env.DB.prepare("UPDATE users SET password_hash=?,password_salt=?,password_iterations=?,updated_at=? WHERE id=?")
        .bind(pass.hash,pass.salt,pass.iterations,ts,user.id),
      env.DB.prepare("UPDATE password_reset_tokens SET used_at=?,attempts=attempts+1 WHERE token_hash=?").bind(ts,row.token_hash),
      env.DB.prepare("DELETE FROM sessions WHERE user_id=?").bind(user.id)
    ]);
    return apiJson(request, env, { ok:true });
  });
}

function progressMetrics(progress, env) {
  const lessons = progress && typeof progress.lessons === "object" ? progress.lessons : {};
  const concepts = progress && typeof progress.concepts === "object" ? progress.concepts : {};
  const miniTests = progress && typeof progress.miniTests === "object" ? progress.miniTests : {};
  const modules = progress && typeof progress.moduleCompleted === "object" ? progress.moduleCompleted : {};
  const miniRows = Object.values(miniTests).filter(v => v && Number.isFinite(Number(v.score)));
  const miniAvg = miniRows.length ? miniRows.reduce((sum,v) => sum + Number(v.score),0) / miniRows.length : 0;
  const criticalErrors = miniRows.reduce((sum,v) => sum + Math.max(0, Number(v.criticalErrors || 0)),0);
  const conceptRows = Object.values(concepts).filter(Boolean);
  const lessonsTotal = Math.max(1, Math.min(500, Number(env.ACTIVE_LESSON_TOTAL || 27)));
  return {
    lessonsCompleted:Object.values(lessons).filter(Boolean).length,
    lessonsTotal,
    conceptsAcquired:conceptRows.filter(v => v.state === "acquired").length,
    conceptsWeak:conceptRows.filter(v => v.state === "weak" || v.state === "nearly_acquired").length,
    interactions:Math.max(0, Math.min(1000000, Number(progress?.interactions || 0))),
    miniTestsCompleted:miniRows.length,
    miniTestAvg:Math.max(0, Math.min(1, miniAvg)),
    criticalErrors,
    modulesCompleted:Object.values(modules).filter(Boolean).length
  };
}

async function getProgress(request, env) {
  return withHttpErrors(request, env, async () => {
    const auth = await authenticate(request, env);
    const row = await env.DB.prepare("SELECT * FROM learner_progress WHERE user_id=?").bind(auth.user.id).first();
    return apiJson(request, env, {
      ok:true,
      progress:row ? JSON.parse(row.progress_json) : null,
      metrics:row ? {
        lessonsCompleted:row.lessons_completed,
        lessonsTotal:row.lessons_total,
        conceptsAcquired:row.concepts_acquired,
        conceptsWeak:row.concepts_weak,
        interactions:row.interactions,
        miniTestsCompleted:row.mini_tests_completed,
        miniTestAvg:row.mini_test_avg,
        criticalErrors:row.critical_errors,
        modulesCompleted:row.modules_completed,
        engagementSeconds:row.engagement_seconds,
        updatedAt:row.updated_at
      } : null
    });
  });
}

async function putProgress(request, env) {
  return withHttpErrors(request, env, async () => {
    const auth = await authenticate(request, env);
    const body = await bodyJson(request);
    const progress = body.progress;
    if (!progress || typeof progress !== "object" || Array.isArray(progress)) throw new HttpError(400, "invalid_progress", "Progress payload is invalid.");
    const metrics = progressMetrics(progress, env);
    const json = JSON.stringify(progress);
    if (json.length > 120000) throw new HttpError(413, "progress_too_large", "Progress payload is too large.");
    const ts = now();
    const version = String(body.courseVersion || "0.1.0").slice(0,40);
    await env.DB.prepare(
      `INSERT INTO learner_progress(
        user_id,course_version,progress_json,lessons_completed,lessons_total,concepts_acquired,concepts_weak,interactions,
        mini_tests_completed,mini_test_avg,critical_errors,modules_completed,engagement_seconds,updated_at
       ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,0,?)
       ON CONFLICT(user_id) DO UPDATE SET
        course_version=excluded.course_version,progress_json=excluded.progress_json,lessons_completed=excluded.lessons_completed,
        lessons_total=excluded.lessons_total,concepts_acquired=excluded.concepts_acquired,concepts_weak=excluded.concepts_weak,
        interactions=excluded.interactions,mini_tests_completed=excluded.mini_tests_completed,mini_test_avg=excluded.mini_test_avg,
        critical_errors=excluded.critical_errors,modules_completed=excluded.modules_completed,updated_at=excluded.updated_at`
    ).bind(
      auth.user.id,version,json,metrics.lessonsCompleted,metrics.lessonsTotal,metrics.conceptsAcquired,metrics.conceptsWeak,
      metrics.interactions,metrics.miniTestsCompleted,metrics.miniTestAvg,metrics.criticalErrors,metrics.modulesCompleted,ts
    ).run();
    return apiJson(request, env, { ok:true, metrics:{...metrics,updatedAt:ts} });
  });
}

async function activityPing(request, env) {
  return withHttpErrors(request, env, async () => {
    const auth = await authenticate(request, env);
    const body = await bodyJson(request);
    const seconds = Math.max(1, Math.min(300, Math.round(Number(body.seconds || 0))));
    const ts = now();
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO learner_progress(user_id,course_version,progress_json,lessons_total,engagement_seconds,updated_at)
         VALUES(?,?,'{}',?, ?,?)
         ON CONFLICT(user_id) DO UPDATE SET engagement_seconds=engagement_seconds+excluded.engagement_seconds,updated_at=excluded.updated_at`
      ).bind(auth.user.id,String(body.courseVersion || "0.1.0").slice(0,40),Number(env.ACTIVE_LESSON_TOTAL || 27),seconds,ts),
      env.DB.prepare(
        "INSERT INTO activity_events(user_id,event_type,duration_seconds,metadata_json,created_at) VALUES(?, 'engagement', ?, ?, ?)"
      ).bind(auth.user.id,seconds,JSON.stringify({ page:String(body.page || "academy").slice(0,80) }),ts)
    ]);
    return apiJson(request, env, { ok:true });
  });
}

async function activityEvent(request, env) {
  return withHttpErrors(request, env, async () => {
    const auth = await authenticate(request, env);
    const body = await bodyJson(request);
    const allowed = new Set(["question_answered","mini_test_completed","module_completed","login","course_opened"]);
    const type = String(body.type || "");
    if (!allowed.has(type)) throw new HttpError(400, "invalid_event", "Unsupported activity event.");
    const ts = now();
    await env.DB.prepare(
      `INSERT INTO activity_events(user_id,event_type,module_id,concept_id,score,correct,critical_errors,duration_seconds,metadata_json,created_at)
       VALUES(?,?,?,?,?,?,?,?,?,?)`
    ).bind(
      auth.user.id,type,nullableText(body.moduleId,80),nullableText(body.conceptId,100),
      finiteOrNull(body.score),body.correct == null ? null : (body.correct ? 1 : 0),
      body.criticalErrors == null ? null : Math.max(0,Math.round(Number(body.criticalErrors))),
      null,body.metadata ? JSON.stringify(body.metadata).slice(0,2000) : null,ts
    ).run();
    return apiJson(request, env, { ok:true });
  });
}

function nullableText(value, max) {
  const text = String(value || "").trim();
  return text ? text.slice(0,max) : null;
}

function finiteOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function managerOverview(request, env) {
  return withHttpErrors(request, env, async () => {
    await authenticate(request, env, ["manager","admin"]);
    const ts = now();
    const since = ts - 7 * 24 * 60 * 60;
    const [learners, active, agg, activity] = await Promise.all([
      env.DB.prepare("SELECT COUNT(*) AS n FROM users WHERE role='staff' AND active=1").first(),
      env.DB.prepare("SELECT COUNT(*) AS n FROM users WHERE role='staff' AND active=1 AND last_active_at>=?").bind(since).first(),
      env.DB.prepare(
        `SELECT AVG(CASE WHEN lessons_total>0 THEN 1.0*lessons_completed/lessons_total ELSE 0 END) AS progress_avg,
                AVG(CASE WHEN mini_tests_completed>0 THEN mini_test_avg ELSE NULL END) AS score_avg,
                AVG(engagement_seconds) AS engagement_avg,
                SUM(concepts_weak) AS weak_total,
                SUM(concepts_acquired) AS acquired_total
         FROM learner_progress lp JOIN users u ON u.id=lp.user_id WHERE u.role='staff' AND u.active=1`
      ).first(),
      env.DB.prepare("SELECT COUNT(*) AS n FROM activity_events WHERE created_at>=?").bind(since).first()
    ]);
    return apiJson(request, env, { ok:true, overview:{
      learners:Number(learners?.n || 0),
      active7d:Number(active?.n || 0),
      progressAvg:Number(agg?.progress_avg || 0),
      miniTestAvg:Number(agg?.score_avg || 0),
      engagementAvgSeconds:Number(agg?.engagement_avg || 0),
      weakConcepts:Number(agg?.weak_total || 0),
      acquiredConcepts:Number(agg?.acquired_total || 0),
      events7d:Number(activity?.n || 0)
    }});
  });
}

async function managerUsers(request, env) {
  return withHttpErrors(request, env, async () => {
    await authenticate(request, env, ["manager","admin"]);
    const rows = await env.DB.prepare(
      `SELECT u.id,u.email,u.phone,u.email_verified_at,u.phone_verified_at,u.first_name,u.last_name,u.role,u.team,u.active,u.created_at,u.last_login_at,u.last_active_at,
              COALESCE(lp.lessons_completed,0) lessons_completed,COALESCE(lp.lessons_total,?) lessons_total,
              COALESCE(lp.concepts_acquired,0) concepts_acquired,COALESCE(lp.concepts_weak,0) concepts_weak,
              COALESCE(lp.interactions,0) interactions,COALESCE(lp.mini_tests_completed,0) mini_tests_completed,
              COALESCE(lp.mini_test_avg,0) mini_test_avg,COALESCE(lp.critical_errors,0) critical_errors,
              COALESCE(lp.modules_completed,0) modules_completed,COALESCE(lp.engagement_seconds,0) engagement_seconds,
              lp.updated_at progress_updated_at
       FROM users u LEFT JOIN learner_progress lp ON lp.user_id=u.id
       WHERE u.role='staff' ORDER BY u.active DESC,u.last_active_at DESC,u.last_name,u.first_name`
    ).bind(Number(env.ACTIVE_LESSON_TOTAL || 27)).all();
    return apiJson(request, env, { ok:true, users:rows.results || [] });
  });
}

async function managerUserDetail(request, env, userId) {
  return withHttpErrors(request, env, async () => {
    const auth = await authenticate(request, env, ["manager","admin"]);
    const user = await env.DB.prepare("SELECT * FROM users WHERE id=?").bind(userId).first();
    if (!user || user.role !== "staff") throw new HttpError(404, "not_found", "Learner not found.");
    const [progress,events,certificates,consents] = await Promise.all([
      env.DB.prepare("SELECT * FROM learner_progress WHERE user_id=?").bind(userId).first(),
      env.DB.prepare(
        "SELECT id,event_type,module_id,concept_id,score,correct,critical_errors,duration_seconds,metadata_json,created_at FROM activity_events WHERE user_id=? ORDER BY created_at DESC LIMIT 100"
      ).bind(userId).all(),
      env.DB.prepare("SELECT * FROM certificates WHERE user_id=? ORDER BY issued_at DESC").bind(userId).all(),
      auth.user.role === "admin"
        ? env.DB.prepare("SELECT consent_type,granted,policy_version,source,created_at FROM consent_events WHERE user_id=? ORDER BY created_at DESC LIMIT 100").bind(userId).all()
        : Promise.resolve({results:[]})
    ]);
    return apiJson(request, env, {
      ok:true,
      user:publicUser(user),
      progress:progress ? {...progress,progress_json:undefined,rawProgress:JSON.parse(progress.progress_json)} : null,
      events:events.results || [],
      certificates:(certificates.results || []).map(publicCertificate),
      consents:consents.results || [],
      admin:auth.user.role === "admin"
    });
  });
}

async function managerInvites(request, env) {
  return withHttpErrors(request, env, async () => {
    await authenticate(request, env, ["admin"]);
    const rows = await env.DB.prepare(
      `SELECT i.email,i.role,i.team,i.created_at,i.expires_at,i.used_at,u.first_name||' '||u.last_name created_by_name
       FROM invites i JOIN users u ON u.id=i.created_by ORDER BY i.created_at DESC LIMIT 100`
    ).all();
    return apiJson(request, env, { ok:true, invites:rows.results || [] });
  });
}

async function createInvite(request, env) {
  return withHttpErrors(request, env, async () => {
    const auth = await authenticate(request, env, ["admin"]);
    const body = await bodyJson(request);
    const role = "manager";
    const email = normalizeEmail(body.email);
    if (!validateEmail(email)) throw new HttpError(400, "invalid_email", "A valid manager email is required.");
    const days = Math.max(1,Math.min(30,Math.round(Number(body.days || 7))));
    const raw = randomToken(32);
    const hash = await sha256(raw);
    const ts = now();
    await env.DB.prepare(
      "INSERT INTO invites(token_hash,email,role,team,created_by,created_at,expires_at) VALUES(?,?,?,?,?,?,?)"
    ).bind(hash,email,role,String(body.team || "Management").trim().slice(0,80) || null,auth.user.id,ts,ts + days*86400).run();
    return apiJson(request, env, { ok:true, inviteToken:raw, expiresAt:ts + days*86400, email, role, team:String(body.team || "Management").trim() }, 201);
  });
}

async function updateManagedUser(request, env, userId) {
  return withHttpErrors(request, env, async () => {
    const auth = await authenticate(request, env, ["manager","admin"]);
    const target = await env.DB.prepare("SELECT * FROM users WHERE id=?").bind(userId).first();
    if (!target) throw new HttpError(404, "not_found", "User not found.");
    if (target.role !== "staff" && auth.user.role !== "admin") throw new HttpError(403, "forbidden", "Managers can modify staff accounts only.");
    const body = await bodyJson(request);
    let active = target.active;
    let role = target.role;
    let team = target.team;
    if (body.active != null) active = body.active ? 1 : 0;
    if (body.team != null) team = String(body.team || "").trim().slice(0,80) || null;
    if (body.role != null) {
      if (auth.user.role !== "admin") throw new HttpError(403, "forbidden", "Only administrators can change roles.");
      if (!["staff","manager","admin"].includes(body.role)) throw new HttpError(400, "invalid_role", "Invalid role.");
      role = body.role;
    }
    const ts = now();
    await env.DB.prepare("UPDATE users SET active=?,role=?,team=?,updated_at=? WHERE id=?").bind(active,role,team,ts,userId).run();
    if (!active) await env.DB.prepare("DELETE FROM sessions WHERE user_id=?").bind(userId).run();
    const fresh = await env.DB.prepare("SELECT * FROM users WHERE id=?").bind(userId).first();
    return apiJson(request, env, { ok:true, user:publicUser(fresh) });
  });
}

async function managerPasswordReset(request, env, userId) {
  return withHttpErrors(request, env, async () => {
    const auth = await authenticate(request, env, ["manager","admin"]);
    const target = await env.DB.prepare("SELECT * FROM users WHERE id=?").bind(userId).first();
    if (!target || target.role !== "staff") throw new HttpError(404, "not_found", "Learner not found.");
    const token = await createResetToken(env, target.id, auth.user.id);
    return apiJson(request, env, {
      ok:true,
      resetToken:token,
      contact:target.email || target.phone || "",
      expiresAt:now()+30*60
    });
  });
}


function certificateVerificationCode() {
  return `XZA-${new Date().getUTCFullYear()}-${randomToken(9).replace(/[-_]/g,"").toUpperCase().slice(0,12)}`;
}

function publicCertificate(row) {
  return {
    id:row.id,
    verificationCode:row.verification_code,
    certificateName:row.certificate_name,
    courseId:row.course_id,
    courseLevel:row.course_level,
    courseVersion:row.course_version,
    assessmentVersion:row.assessment_version || "",
    score:row.score,
    issuedAt:row.issued_at,
    status:row.status,
    updatedAt:row.updated_at,
    revokedAt:row.revoked_at,
    revocationReason:row.revocation_reason || "",
    supersededBy:row.superseded_by || "",
    publicNote:row.public_note || ""
  };
}

async function myCertificates(request, env) {
  return withHttpErrors(request,env,async()=>{
    const auth = await authenticate(request,env);
    const rows = await env.DB.prepare(
      "SELECT * FROM certificates WHERE user_id=? ORDER BY issued_at DESC"
    ).bind(auth.user.id).all();
    return apiJson(request,env,{ok:true,certificates:(rows.results||[]).map(publicCertificate)});
  });
}

async function verifyCertificatePublic(request, env, code) {
  return withHttpErrors(request,env,async()=>{
    const normalized = String(code || "").trim().toUpperCase();
    if (!/^XZA-[A-Z0-9-]{6,40}$/.test(normalized)) {
      throw new HttpError(404,"certificate_not_found","Certificate not found.");
    }
    const row = await env.DB.prepare(
      "SELECT * FROM certificates WHERE verification_code=?"
    ).bind(normalized).first();
    if (!row) throw new HttpError(404,"certificate_not_found","Certificate not found.");
    return apiJson(request,env,{ok:true,certificate:publicCertificate(row)});
  });
}

async function issueCertificate(request, env) {
  return withHttpErrors(request,env,async()=>{
    const auth = await authenticate(request,env,["admin"]);
    const body = await bodyJson(request);
    const userId = String(body.userId || "").trim();
    const user = await env.DB.prepare("SELECT * FROM users WHERE id=? AND active=1").bind(userId).first();
    if (!user || user.role !== "staff") throw new HttpError(404,"not_found","Learner not found.");

    const courseId = String(body.courseId || "xinzuo-academy-base").trim().slice(0,80);
    const courseLevel = String(body.courseLevel || "Base").trim().slice(0,80);
    const courseVersion = String(body.courseVersion || "0.1.0").trim().slice(0,40);
    const assessmentVersion = nullableText(body.assessmentVersion,80);
    const score = body.score == null ? null : Math.max(0,Math.min(1,Number(body.score)));
    if (score != null && !Number.isFinite(score)) throw new HttpError(400,"invalid_score","Invalid certificate score.");

    const id = crypto.randomUUID();
    let verificationCode = certificateVerificationCode();
    for (let i=0;i<4;i+=1) {
      const collision = await env.DB.prepare("SELECT id FROM certificates WHERE verification_code=?").bind(verificationCode).first();
      if (!collision) break;
      verificationCode = certificateVerificationCode();
    }

    const ts = now();
    const name = `${user.first_name} ${user.last_name}`.trim();
    await env.DB.prepare(
      `INSERT INTO certificates(
        id,verification_code,user_id,certificate_name,course_id,course_level,course_version,assessment_version,score,
        issued_at,status,updated_at,revoked_at,revocation_reason,superseded_by,public_note
       ) VALUES(?,?,?,?,?,?,?,?,?,?,'valid',?,NULL,NULL,NULL,?)`
    ).bind(
      id,verificationCode,user.id,name,courseId,courseLevel,courseVersion,assessmentVersion,score,ts,ts,
      nullableText(body.publicNote,500)
    ).run();

    await env.DB.prepare(
      "INSERT INTO certificate_events(certificate_id,actor_user_id,event_type,detail,created_at) VALUES(?,?,'issued',?,?)"
    ).bind(id,auth.user.id,nullableText(body.basis,500),ts).run();

    if (body.supersedeCertificateId) {
      const oldId = String(body.supersedeCertificateId);
      const old = await env.DB.prepare("SELECT id FROM certificates WHERE id=? AND user_id=?").bind(oldId,user.id).first();
      if (old) {
        await env.DB.batch([
          env.DB.prepare("UPDATE certificates SET status='superseded',superseded_by=?,updated_at=? WHERE id=?").bind(id,ts,oldId),
          env.DB.prepare("INSERT INTO certificate_events(certificate_id,actor_user_id,event_type,detail,created_at) VALUES(?,?,'superseded',?,?)")
            .bind(oldId,auth.user.id,`Superseded by ${verificationCode}`,ts)
        ]);
      }
    }

    const row = await env.DB.prepare("SELECT * FROM certificates WHERE id=?").bind(id).first();
    return apiJson(request,env,{ok:true,certificate:publicCertificate(row)},201);
  });
}

async function updateCertificateStatus(request, env, certificateId) {
  return withHttpErrors(request,env,async()=>{
    const auth = await authenticate(request,env,["admin"]);
    const body = await bodyJson(request);
    const status = String(body.status || "");
    if (!["valid","suspended","revoked","superseded"].includes(status)) {
      throw new HttpError(400,"invalid_status","Invalid certificate status.");
    }
    const row = await env.DB.prepare("SELECT * FROM certificates WHERE id=?").bind(certificateId).first();
    if (!row) throw new HttpError(404,"certificate_not_found","Certificate not found.");
    const ts = now();
    const reason = nullableText(body.reason,500);
    const revokedAt = status === "revoked" ? ts : null;
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE certificates SET status=?,updated_at=?,revoked_at=?,revocation_reason=?,public_note=COALESCE(?,public_note) WHERE id=?"
      ).bind(status,ts,revokedAt,status==="revoked"?reason:null,nullableText(body.publicNote,500),certificateId),
      env.DB.prepare(
        "INSERT INTO certificate_events(certificate_id,actor_user_id,event_type,detail,created_at) VALUES(?,?,?,?,?)"
      ).bind(certificateId,auth.user.id,status,reason,ts)
    ]);
    const fresh = await env.DB.prepare("SELECT * FROM certificates WHERE id=?").bind(certificateId).first();
    return apiJson(request,env,{ok:true,certificate:publicCertificate(fresh)});
  });
}

async function adminAudience(request, env) {
  return withHttpErrors(request,env,async()=>{
    await authenticate(request,env,["admin"]);
    const rows = await env.DB.prepare(
      `SELECT id,email,phone,first_name,last_name,created_at,last_active_at,email_verified_at,phone_verified_at,
              marketing_email_consent,marketing_whatsapp_consent,marketing_phone_consent,marketing_consent_updated_at
       FROM users
       WHERE role='staff' AND active=1
       ORDER BY created_at DESC
       LIMIT 5000`
    ).all();
    return apiJson(request,env,{ok:true,audience:(rows.results||[]).map(row=>({
      id:row.id,
      email:row.email || "",
      phone:row.phone || "",
      firstName:row.first_name,
      lastName:row.last_name,
      createdAt:row.created_at,
      lastActiveAt:row.last_active_at,
      emailVerified:Boolean(row.email_verified_at),
      phoneVerified:Boolean(row.phone_verified_at),
      marketingEmail:Boolean(row.marketing_email_consent),
      marketingWhatsapp:Boolean(row.marketing_whatsapp_consent),
      marketingPhone:Boolean(row.marketing_phone_consent),
      consentUpdatedAt:row.marketing_consent_updated_at
    }))});
  });
}


function randomShuffle(items) {
  const out = [...items];
  const random = new Uint32Array(Math.max(1,out.length));
  crypto.getRandomValues(random);
  for (let i=out.length-1;i>0;i-=1) {
    const j = random[i] % (i+1);
    [out[i],out[j]] = [out[j],out[i]];
  }
  return out;
}

function publicAssessmentQuestion(question, locale) {
  const lang = locale === "it" ? "it" : "en";
  return {
    id:question.id,
    conceptId:question.conceptId,
    critical:Boolean(question.critical),
    prompt:question.prompt[lang] || question.prompt.en,
    options:question.options.map(option=>({
      id:option.id,
      text:option[lang] || option.en
    }))
  };
}

async function certificationStatus(request, env) {
  return withHttpErrors(request,env,async()=>{
    const auth = await authenticate(request,env);
    const [progress,attempts,certificates] = await Promise.all([
      env.DB.prepare("SELECT * FROM learner_progress WHERE user_id=?").bind(auth.user.id).first(),
      env.DB.prepare(
        "SELECT id,assessment_version,started_at,completed_at,score,critical_errors,passed,certificate_id FROM certification_attempts WHERE user_id=? AND course_id='xinzuo-academy-base' ORDER BY started_at DESC LIMIT 10"
      ).bind(auth.user.id).all(),
      env.DB.prepare("SELECT * FROM certificates WHERE user_id=? AND course_id='xinzuo-academy-base' ORDER BY issued_at DESC").bind(auth.user.id).all()
    ]);
    const eligible = Boolean(
      progress &&
      Number(progress.lessons_completed||0) >= 27 &&
      Number(progress.modules_completed||0) >= 6 &&
      Number(progress.mini_tests_completed||0) >= 6
    );
    return apiJson(request,env,{
      ok:true,
      eligible,
      requirements:{
        minimumScore:0.80,
        maximumCriticalErrors:0,
        lessonsRequired:27,
        modulesRequired:6,
        miniTestsRequired:6
      },
      progress:progress ? {
        lessonsCompleted:progress.lessons_completed,
        modulesCompleted:progress.modules_completed,
        miniTestsCompleted:progress.mini_tests_completed,
        interactions:progress.interactions
      } : null,
      attempts:attempts.results || [],
      certificates:(certificates.results||[]).map(publicCertificate)
    });
  });
}

async function startBaseCertification(request, env) {
  return withHttpErrors(request,env,async()=>{
    const auth = await authenticate(request,env);
    const body = await bodyJson(request);
    const locale = body.locale === "it" ? "it" : "en";
    const progress = await env.DB.prepare("SELECT * FROM learner_progress WHERE user_id=?").bind(auth.user.id).first();
    if (!progress ||
        Number(progress.lessons_completed||0) < 27 ||
        Number(progress.modules_completed||0) < 6 ||
        Number(progress.mini_tests_completed||0) < 6) {
      throw new HttpError(409,"certification_not_ready","Complete all Base lessons, modules and mini-tests before the final assessment.");
    }

    const latestFailed = await env.DB.prepare(
      "SELECT * FROM certification_attempts WHERE user_id=? AND course_id='xinzuo-academy-base' AND completed_at IS NOT NULL AND passed=0 ORDER BY completed_at DESC LIMIT 1"
    ).bind(auth.user.id).first();
    if (latestFailed) {
      let evidence = {};
      try { evidence = JSON.parse(latestFailed.evidence_json || "{}"); } catch {}
      const baseline = Number(evidence.interactionBaseline || 0);
      const remediationRequired = Math.max(3,Number(evidence.remediationInteractionsRequired || 3));
      if (Number(progress.interactions || 0) < baseline + remediationRequired ||
          Number(progress.updated_at || 0) <= Number(latestFailed.completed_at || 0)) {
        throw new HttpError(
          409,
          "remediation_required",
          `Review the course and complete at least ${remediationRequired} additional learning interactions before retrying.`
        );
      }
    }

    const active = await env.DB.prepare(
      "SELECT * FROM certification_attempts WHERE user_id=? AND course_id='xinzuo-academy-base' AND completed_at IS NULL ORDER BY started_at DESC LIMIT 1"
    ).bind(auth.user.id).first();
    if (active && now() - Number(active.started_at) < 60*60) {
      let evidence = {};
      try { evidence = JSON.parse(active.evidence_json || "{}"); } catch {}
      const ids = Array.isArray(evidence.questionIds) ? evidence.questionIds : BASE_CERTIFICATION_BANK.map(q=>q.id);
      const questions = ids.map(id=>BASE_CERTIFICATION_BANK.find(q=>q.id===id)).filter(Boolean);
      return apiJson(request,env,{
        ok:true,
        attemptId:active.id,
        assessmentVersion:active.assessment_version,
        expiresAt:Number(active.started_at)+60*60,
        rules:{minimumScore:0.80,maximumCriticalErrors:0},
        questions:questions.map(q=>publicAssessmentQuestion(q,evidence.locale || locale))
      });
    }

    const ordered = randomShuffle(BASE_CERTIFICATION_BANK);
    const attemptId = crypto.randomUUID();
    const ts = now();
    const evidence = {
      questionIds:ordered.map(q=>q.id),
      locale,
      interactionBaseline:Number(progress.interactions || 0),
      remediationInteractionsRequired:3
    };
    await env.DB.prepare(
      `INSERT INTO certification_attempts(
        id,user_id,course_id,assessment_version,started_at,completed_at,score,critical_errors,passed,evidence_json,certificate_id
       ) VALUES(?,?, 'xinzuo-academy-base', ?, ?, NULL,NULL,NULL,NULL,?,NULL)`
    ).bind(attemptId,auth.user.id,BASE_CERTIFICATION_VERSION,ts,JSON.stringify(evidence)).run();

    return apiJson(request,env,{
      ok:true,
      attemptId,
      assessmentVersion:BASE_CERTIFICATION_VERSION,
      expiresAt:ts+60*60,
      rules:{minimumScore:0.80,maximumCriticalErrors:0},
      questions:ordered.map(q=>publicAssessmentQuestion(q,locale))
    },201);
  });
}

async function submitBaseCertification(request, env) {
  return withHttpErrors(request,env,async()=>{
    const auth = await authenticate(request,env);
    const body = await bodyJson(request);
    const attemptId = String(body.attemptId || "").trim();
    const answers = body.answers;
    if (!attemptId || !answers || typeof answers !== "object" || Array.isArray(answers)) {
      throw new HttpError(400,"invalid_assessment","Assessment submission is invalid.");
    }

    const attempt = await env.DB.prepare(
      "SELECT * FROM certification_attempts WHERE id=? AND user_id=? AND course_id='xinzuo-academy-base'"
    ).bind(attemptId,auth.user.id).first();
    if (!attempt) throw new HttpError(404,"assessment_not_found","Assessment attempt not found.");
    if (attempt.completed_at) throw new HttpError(409,"assessment_completed","This assessment attempt has already been submitted.");
    if (now() - Number(attempt.started_at) > 60*60) {
      await env.DB.prepare(
        "UPDATE certification_attempts SET completed_at=?,score=0,critical_errors=0,passed=0 WHERE id=?"
      ).bind(now(),attempt.id).run();
      throw new HttpError(408,"assessment_expired","Assessment time expired. Review the course before starting another attempt.");
    }

    let evidence = {};
    try { evidence = JSON.parse(attempt.evidence_json || "{}"); } catch {}
    const ids = Array.isArray(evidence.questionIds) ? evidence.questionIds : [];
    if (ids.length !== BASE_CERTIFICATION_BANK.length) {
      throw new HttpError(500,"assessment_corrupt","Assessment question set is incomplete.");
    }

    const questions = ids.map(id=>BASE_CERTIFICATION_BANK.find(q=>q.id===id)).filter(Boolean);
    if (questions.length !== ids.length) throw new HttpError(500,"assessment_corrupt","Assessment question set is invalid.");

    let correctCount = 0;
    let criticalErrors = 0;
    const failedConcepts = [];
    const answerAudit = {};
    for (const q of questions) {
      const answer = String(answers[q.id] || "");
      if (!q.options.some(option=>option.id===answer)) {
        throw new HttpError(400,"assessment_incomplete","Answer every certification question before submitting.");
      }
      answerAudit[q.id] = answer;
      if (answer === q.correct) {
        correctCount += 1;
      } else {
        if (q.critical) criticalErrors += 1;
        if (!failedConcepts.includes(q.conceptId)) failedConcepts.push(q.conceptId);
      }
    }

    const score = correctCount / questions.length;
    const passed = score >= 0.80 && criticalErrors === 0;
    const ts = now();
    const completedEvidence = {
      ...evidence,
      answers:answerAudit,
      failedConcepts,
      correctCount,
      totalQuestions:questions.length,
      completedAt:ts
    };

    let certificate = null;
    if (passed) {
      const existing = await env.DB.prepare(
        "SELECT * FROM certificates WHERE user_id=? AND course_id='xinzuo-academy-base' AND status='valid' ORDER BY issued_at DESC LIMIT 1"
      ).bind(auth.user.id).first();
      if (existing) {
        certificate = publicCertificate(existing);
      } else {
        const user = await env.DB.prepare("SELECT * FROM users WHERE id=?").bind(auth.user.id).first();
        const certificateId = crypto.randomUUID();
        let verificationCode = certificateVerificationCode();
        for (let i=0;i<4;i+=1) {
          const collision = await env.DB.prepare("SELECT id FROM certificates WHERE verification_code=?").bind(verificationCode).first();
          if (!collision) break;
          verificationCode = certificateVerificationCode();
        }
        await env.DB.prepare(
          `INSERT INTO certificates(
            id,verification_code,user_id,certificate_name,course_id,course_level,course_version,assessment_version,score,
            issued_at,status,updated_at,revoked_at,revocation_reason,superseded_by,public_note
           ) VALUES(?,?,?,?, 'xinzuo-academy-base','Base',?,?,?,?,'valid',?,NULL,NULL,NULL,?)`
        ).bind(
          certificateId,verificationCode,user.id,`${user.first_name} ${user.last_name}`.trim(),
          String(body.courseVersion || "0.1.0").slice(0,40),
          BASE_CERTIFICATION_VERSION,score,ts,ts,
          "Issued automatically after passing the Xinzuo Academy Base final assessment."
        ).run();
        await env.DB.prepare(
          "INSERT INTO certificate_events(certificate_id,actor_user_id,event_type,detail,created_at) VALUES(?,NULL,'issued',?,?)"
        ).bind(certificateId,`Automatic issuance from assessment ${attempt.id}`,ts).run();
        const certRow = await env.DB.prepare("SELECT * FROM certificates WHERE id=?").bind(certificateId).first();
        certificate = publicCertificate(certRow);
      }
    }

    await env.DB.prepare(
      "UPDATE certification_attempts SET completed_at=?,score=?,critical_errors=?,passed=?,evidence_json=?,certificate_id=? WHERE id=?"
    ).bind(
      ts,score,criticalErrors,passed?1:0,JSON.stringify(completedEvidence),certificate?.id || null,attempt.id
    ).run();

    return apiJson(request,env,{
      ok:true,
      passed,
      score,
      correct:correctCount,
      total:questions.length,
      criticalErrors,
      failedConcepts,
      remediationRequired:!passed,
      remediationInteractionsRequired:passed ? 0 : 3,
      certificate
    });
  });
}
