const enc = new TextEncoder();
const PASSWORD_ITERATIONS = 600000;
const SESSION_SHORT = 12 * 60 * 60;
const SESSION_LONG = 30 * 24 * 60 * 60;
const LOCK_SECONDS = 15 * 60;
const DEFAULT_ALLOWED_ORIGINS = ["https://francescocmazza.github.io", "http://localhost:8000", "http://127.0.0.1:8000"];

export default {
  async fetch(request, env) {
    try {
      if (request.method === "OPTIONS") return preflight(request, env);
      const url = new URL(request.url);
      if (!url.pathname.startsWith("/api/")) return apiError(request, env, 404, "not_found", "API endpoint not found.");

      if (url.pathname === "/api/health" && request.method === "GET") {
        return apiJson(request, env, { ok: true, service: "xinzuo-academy", now: new Date().toISOString() });
      }

      if (url.pathname === "/api/bootstrap" && request.method === "POST") return bootstrap(request, env);
      if (url.pathname === "/api/auth/register" && request.method === "POST") return register(request, env);
      if (url.pathname === "/api/auth/login" && request.method === "POST") return login(request, env);
      if (url.pathname === "/api/auth/logout" && request.method === "POST") return logout(request, env);
      if (url.pathname === "/api/auth/change-password" && request.method === "POST") return changePassword(request, env);
      if (url.pathname === "/api/auth/request-reset" && request.method === "POST") return requestPasswordReset(request, env);
      if (url.pathname === "/api/auth/reset-password" && request.method === "POST") return resetPassword(request, env);
      if (url.pathname === "/api/me" && request.method === "GET") return me(request, env);
      if (url.pathname === "/api/progress" && request.method === "GET") return getProgress(request, env);
      if (url.pathname === "/api/progress" && request.method === "PUT") return putProgress(request, env);
      if (url.pathname === "/api/activity/ping" && request.method === "POST") return activityPing(request, env);
      if (url.pathname === "/api/activity/event" && request.method === "POST") return activityEvent(request, env);
      if (url.pathname === "/api/manager/overview" && request.method === "GET") return managerOverview(request, env);
      if (url.pathname === "/api/manager/users" && request.method === "GET") return managerUsers(request, env);
      if (url.pathname === "/api/manager/invites" && request.method === "GET") return managerInvites(request, env);
      if (url.pathname === "/api/manager/invites" && request.method === "POST") return createInvite(request, env);

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

function publicUser(row) {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    role: row.role,
    team: row.team || "",
    active: Boolean(row.active),
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
    lastActiveAt: row.last_active_at
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
      `INSERT INTO users(id,email,first_name,last_name,role,team,password_hash,password_salt,password_iterations,active,created_at,updated_at,last_login_at,last_active_at)
       VALUES(?,?,?,?, 'admin', ?,?,?,?,1,?,?,?,?)`
    ).bind(id,email,firstName,lastName,String(body.team||"Management").slice(0,80),pass.hash,pass.salt,pass.iterations,ts,ts,ts,ts).run();
    const session = await createSession(request, env, id, true);
    const user = await env.DB.prepare("SELECT * FROM users WHERE id=?").bind(id).first();
    return apiJson(request, env, { ok:true, user:publicUser(user), ...session }, 201);
  });
}

async function register(request, env) {
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
        `INSERT INTO users(id,email,first_name,last_name,role,team,password_hash,password_salt,password_iterations,active,created_at,updated_at,last_login_at,last_active_at)
         VALUES(?,?,?,?,?,?,?,?,?,1,?,?,?,?)`
      ).bind(id,email,firstName,lastName,invite.role,team,pass.hash,pass.salt,pass.iterations,ts,ts,ts,ts),
      env.DB.prepare("UPDATE invites SET used_at=?,used_by=? WHERE token_hash=? AND used_at IS NULL").bind(ts,id,inviteHash)
    ]);
    const session = await createSession(request, env, id, Boolean(body.remember));
    const user = await env.DB.prepare("SELECT * FROM users WHERE id=?").bind(id).first();
    return apiJson(request, env, { ok:true, user:publicUser(user), ...session }, 201);
  });
}

async function login(request, env) {
  return withHttpErrors(request, env, async () => {
    const body = await bodyJson(request);
    const email = normalizeEmail(body.email);
    const password = String(body.password || "");
    const user = validateEmail(email) ? await env.DB.prepare("SELECT * FROM users WHERE email=?").bind(email).first() : null;
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
  const raw = randomToken(32);
  const hash = await sha256(raw);
  const ts = now();
  await env.DB.prepare(
    "INSERT INTO password_reset_tokens(token_hash,user_id,created_at,expires_at,used_at,created_by) VALUES(?,?,?,?,NULL,?)"
  ).bind(hash,userId,ts,ts + 60 * 60,createdBy).run();
  return raw;
}

async function requestPasswordReset(request, env) {
  return withHttpErrors(request, env, async () => {
    const body = await bodyJson(request);
    const email = normalizeEmail(body.email);
    const user = validateEmail(email) ? await env.DB.prepare("SELECT * FROM users WHERE email=? AND active=1").bind(email).first() : null;
    if (user) {
      const token = await createResetToken(env, user.id, null);
      if (env.RESET_WEBHOOK_URL) {
        const resetBase = String(env.RESET_PAGE_URL || "https://francescocmazza.github.io/xinzuo-kung-fu/academy/");
        const link = `${resetBase}?reset=${encodeURIComponent(token)}&email=${encodeURIComponent(user.email)}`;
        try {
          await fetch(env.RESET_WEBHOOK_URL, {
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body:JSON.stringify({ type:"xinzuo-academy-password-reset", email:user.email, firstName:user.first_name, resetLink:link })
          });
        } catch (error) {
          console.error("reset webhook failed", error);
        }
      }
    }
    return apiJson(request, env, { ok:true, message:"If the account exists, password reset instructions will be sent." });
  });
}

async function resetPassword(request, env) {
  return withHttpErrors(request, env, async () => {
    const body = await bodyJson(request);
    const email = normalizeEmail(body.email);
    const token = String(body.resetToken || "").trim();
    if (!validateEmail(email) || !token) throw new HttpError(400, "invalid_reset", "Invalid reset request.");
    const tokenHash = await sha256(token);
    const row = await env.DB.prepare(
      `SELECT r.*,u.email FROM password_reset_tokens r JOIN users u ON u.id=r.user_id
       WHERE r.token_hash=? AND u.email=?`
    ).bind(tokenHash,email).first();
    const ts = now();
    if (!row || row.used_at || row.expires_at <= ts) throw new HttpError(400, "invalid_reset", "Reset token is invalid or expired.");
    const pass = await newPasswordRecord(body.newPassword, env);
    await env.DB.batch([
      env.DB.prepare("UPDATE users SET password_hash=?,password_salt=?,password_iterations=?,updated_at=? WHERE id=?")
        .bind(pass.hash,pass.salt,pass.iterations,ts,row.user_id),
      env.DB.prepare("UPDATE password_reset_tokens SET used_at=? WHERE token_hash=?").bind(ts,tokenHash),
      env.DB.prepare("DELETE FROM sessions WHERE user_id=?").bind(row.user_id)
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
      `SELECT u.id,u.email,u.first_name,u.last_name,u.role,u.team,u.active,u.created_at,u.last_login_at,u.last_active_at,
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
    await authenticate(request, env, ["manager","admin"]);
    const user = await env.DB.prepare("SELECT * FROM users WHERE id=?").bind(userId).first();
    if (!user || user.role !== "staff") throw new HttpError(404, "not_found", "Learner not found.");
    const progress = await env.DB.prepare("SELECT * FROM learner_progress WHERE user_id=?").bind(userId).first();
    const events = await env.DB.prepare(
      "SELECT id,event_type,module_id,concept_id,score,correct,critical_errors,duration_seconds,metadata_json,created_at FROM activity_events WHERE user_id=? ORDER BY created_at DESC LIMIT 100"
    ).bind(userId).all();
    return apiJson(request, env, {
      ok:true,
      user:publicUser(user),
      progress:progress ? {...progress,progress_json:undefined,rawProgress:JSON.parse(progress.progress_json)} : null,
      events:events.results || []
    });
  });
}

async function managerInvites(request, env) {
  return withHttpErrors(request, env, async () => {
    await authenticate(request, env, ["manager","admin"]);
    const rows = await env.DB.prepare(
      `SELECT i.email,i.role,i.team,i.created_at,i.expires_at,i.used_at,u.first_name||' '||u.last_name created_by_name
       FROM invites i JOIN users u ON u.id=i.created_by ORDER BY i.created_at DESC LIMIT 100`
    ).all();
    return apiJson(request, env, { ok:true, invites:rows.results || [] });
  });
}

async function createInvite(request, env) {
  return withHttpErrors(request, env, async () => {
    const auth = await authenticate(request, env, ["manager","admin"]);
    const body = await bodyJson(request);
    const role = body.role === "manager" ? "manager" : "staff";
    if (role === "manager" && auth.user.role !== "admin") throw new HttpError(403, "forbidden", "Only an administrator can invite managers.");
    const email = normalizeEmail(body.email);
    if (email && !validateEmail(email)) throw new HttpError(400, "invalid_email", "Invalid email.");
    const days = Math.max(1,Math.min(30,Math.round(Number(body.days || 7))));
    const raw = randomToken(32);
    const hash = await sha256(raw);
    const ts = now();
    await env.DB.prepare(
      "INSERT INTO invites(token_hash,email,role,team,created_by,created_at,expires_at) VALUES(?,?,?,?,?,?,?)"
    ).bind(hash,email || null,role,String(body.team || "").trim().slice(0,80) || null,auth.user.id,ts,ts + days*86400).run();
    return apiJson(request, env, { ok:true, inviteToken:raw, expiresAt:ts + days*86400, email:email || null, role, team:String(body.team || "").trim() }, 201);
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
    return apiJson(request, env, { ok:true, resetToken:token, email:target.email, expiresAt:now()+3600 });
  });
}
