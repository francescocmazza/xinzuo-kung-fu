(() => {
  "use strict";

  const cfg = window.XINZUO_ACADEMY_CONFIG || {};
  const API_BASE = String(cfg.apiBase || "").replace(/\/$/, "");
  const REQUIRE_AUTH = cfg.requireAuth !== false;
  const TOKEN_SESSION = "xinzuo-academy-session-token";
  const TOKEN_LOCAL = "xinzuo-academy-remember-token";
  const USER_CACHE = "xinzuo-academy-user";
  const HEARTBEAT_SECONDS = 60;

  let currentUser = null;
  let syncTimer = null;
  let queuedProgress = null;
  let lastInteractionAt = Date.now();
  let heartbeatTimer = null;

  const el = {
    authGate: document.getElementById("authGate"),
    learnerArea: document.getElementById("learnerArea"),
    managerView: document.getElementById("managerView"),
    backendStatus: document.getElementById("backendStatus"),
    loginTab: document.getElementById("loginTab"),
    registerTab: document.getElementById("registerTab"),
    resetTab: document.getElementById("resetTab"),
    loginForm: document.getElementById("loginForm"),
    registerForm: document.getElementById("registerForm"),
    resetRequestForm: document.getElementById("resetRequestForm"),
    resetCompleteForm: document.getElementById("resetCompleteForm"),
    offlineButton: document.getElementById("offlineButton"),
    userChip: document.getElementById("userChip"),
    managerButton: document.getElementById("managerButton"),
    accountButton: document.getElementById("accountButton"),
    logoutButton: document.getElementById("logoutButton"),
    accountDialog: document.getElementById("accountDialog"),
    accountProfile: document.getElementById("accountProfile"),
    changePasswordForm: document.getElementById("changePasswordForm"),
    managerBack: document.getElementById("managerBack"),
    managerRefresh: document.getElementById("managerRefresh"),
    managerOverview: document.getElementById("managerOverview"),
    managerUsers: document.getElementById("managerUsers"),
    managerDetail: document.getElementById("managerDetail"),
    inviteForm: document.getElementById("inviteForm"),
    inviteResult: document.getElementById("inviteResult"),
    managerLegend: document.getElementById("managerLegend")
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function apiAvailable() {
    return Boolean(API_BASE);
  }

  function token() {
    return sessionStorage.getItem(TOKEN_SESSION) || localStorage.getItem(TOKEN_LOCAL) || "";
  }

  function rememberToken(raw, remember) {
    sessionStorage.removeItem(TOKEN_SESSION);
    localStorage.removeItem(TOKEN_LOCAL);
    if (!raw) return;
    (remember ? localStorage : sessionStorage).setItem(remember ? TOKEN_LOCAL : TOKEN_SESSION, raw);
  }

  function clearSession() {
    sessionStorage.removeItem(TOKEN_SESSION);
    localStorage.removeItem(TOKEN_LOCAL);
    localStorage.removeItem(USER_CACHE);
    currentUser = null;
  }

  async function api(path, options = {}) {
    if (!API_BASE) throw new Error("Backend aziendale non configurato.");
    const headers = new Headers(options.headers || {});
    headers.set("Content-Type", "application/json");
    const authToken = token();
    if (authToken) headers.set("Authorization", `Bearer ${authToken}`);
    const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = { ok: false, message: `HTTP ${response.status}` };
    }
    if (!response.ok) {
      const error = new Error(payload?.message || "Backend request failed.");
      error.code = payload?.error;
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  function formStatus(form, text, kind = "") {
    const node = form.querySelector("[data-status]");
    if (!node) return;
    node.textContent = text || "";
    node.className = `form-status ${kind ? `form-status--${kind}` : ""}`;
  }

  function setBusy(form, busy) {
    form.querySelectorAll("button,input,select").forEach(node => {
      node.disabled = Boolean(busy);
    });
  }

  function showAuthTab(name) {
    const forms = {
      login: el.loginForm,
      register: el.registerForm,
      reset: el.resetRequestForm
    };
    Object.entries(forms).forEach(([key, form]) => { form.hidden = key !== name; });
    el.resetCompleteForm.hidden = true;
    [
      [el.loginTab, "login"],
      [el.registerTab, "register"],
      [el.resetTab, "reset"]
    ].forEach(([button, key]) => {
      const active = key === name;
      button.classList.toggle("auth-tab--active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    });
  }

  function setUser(user) {
    currentUser = user || null;
    if (user) localStorage.setItem(USER_CACHE, JSON.stringify(user));
    else localStorage.removeItem(USER_CACHE);

    const authenticated = Boolean(user);
    el.userChip.hidden = !authenticated;
    el.accountButton.hidden = !authenticated;
    el.logoutButton.hidden = !authenticated;
    el.managerButton.hidden = !authenticated || !["manager", "admin"].includes(user.role);

    if (authenticated) {
      el.userChip.textContent = `${user.firstName} ${user.lastName} · ${roleLabel(user.role)}`;
      el.authGate.hidden = true;
      el.learnerArea.hidden = false;
      renderAccountProfile();
      dispatchAuth(user);
      startHeartbeat();
    } else {
      el.userChip.textContent = "";
      el.managerView.hidden = true;
      if (REQUIRE_AUTH && apiAvailable()) {
        el.authGate.hidden = false;
        el.learnerArea.hidden = true;
      } else if (REQUIRE_AUTH && !apiAvailable()) {
        el.authGate.hidden = false;
        el.learnerArea.hidden = true;
      } else {
        el.authGate.hidden = true;
        el.learnerArea.hidden = false;
      }
      stopHeartbeat();
      dispatchAuth(null);
    }
  }

  function roleLabel(role) {
    return role === "admin" ? "Admin" : role === "manager" ? "Manager" : "Staff";
  }

  function dispatchAuth(user) {
    window.dispatchEvent(new CustomEvent("academy-auth-state", { detail: { user } }));
  }

  function renderAccountProfile() {
    if (!currentUser) {
      el.accountProfile.innerHTML = "";
      return;
    }
    el.accountProfile.innerHTML = `
      <dl class="profile-list">
        <div><dt>Nome</dt><dd>${escapeHtml(currentUser.firstName)} ${escapeHtml(currentUser.lastName)}</dd></div>
        <div><dt>Email</dt><dd>${escapeHtml(currentUser.email)}</dd></div>
        <div><dt>Ruolo</dt><dd>${escapeHtml(roleLabel(currentUser.role))}</dd></div>
        <div><dt>Team</dt><dd>${escapeHtml(currentUser.team || "—")}</dd></div>
      </dl>
    `;
  }

  async function restoreSession() {
    if (!apiAvailable()) {
      el.backendStatus.innerHTML = `
        <strong>Backend aziendale pronto nel progetto, ma non ancora collegato a questo sito.</strong>
        <span>Configura <code>ACADEMY_API_BASE</code> dopo il deploy Cloudflare. Nel frattempo puoi continuare in modalità locale.</span>
      `;
      el.offlineButton.hidden = false;
      setUser(null);
      return;
    }

    el.backendStatus.textContent = "Connessione al backend aziendale…";
    el.offlineButton.hidden = true;

    try {
      await api("/api/health", { method: "GET" });
      el.backendStatus.textContent = "Backend aziendale online.";
    } catch (error) {
      el.backendStatus.textContent = `Backend non raggiungibile: ${error.message}`;
      el.offlineButton.hidden = false;
      setUser(null);
      return;
    }

    if (!token()) {
      setUser(null);
      return;
    }

    try {
      const result = await api("/api/me", { method: "GET" });
      setUser(result.user);
      trackEvent("login", { metadata: { restored: true } });
    } catch {
      clearSession();
      setUser(null);
    }
  }

  async function authenticateWith(path, body, remember) {
    const result = await api(path, { method: "POST", body: JSON.stringify(body) });
    rememberToken(result.token, remember);
    setUser(result.user);
    await hydrateRemoteProgress();
    trackEvent("login", { metadata: { registration: path.includes("register") } });
    return result;
  }

  async function hydrateRemoteProgress() {
    if (!currentUser || !window.XinzuoAcademy) return;
    try {
      const result = await api("/api/progress", { method: "GET" });
      if (result.progress) window.XinzuoAcademy.mergeRemoteProgress(result.progress);
      else syncProgress(window.XinzuoAcademy.getProgress(), window.XinzuoAcademy.getCourseVersion());
    } catch (error) {
      console.warn("Progress hydration failed", error);
    }
  }

  function syncProgress(progress, courseVersion = "0.1.0") {
    if (!currentUser || !apiAvailable()) return;
    queuedProgress = { progress, courseVersion };
    clearTimeout(syncTimer);
    syncTimer = setTimeout(async () => {
      const payload = queuedProgress;
      queuedProgress = null;
      try {
        await api("/api/progress", {
          method: "PUT",
          body: JSON.stringify(payload)
        });
      } catch (error) {
        console.warn("Progress sync failed", error);
      }
    }, 500);
  }

  async function trackEvent(type, data = {}) {
    if (!currentUser || !apiAvailable()) return;
    try {
      await api("/api/activity/event", {
        method: "POST",
        body: JSON.stringify({ type, ...data })
      });
    } catch (error) {
      console.warn("Activity event failed", error);
    }
  }

  function markInteraction() {
    lastInteractionAt = Date.now();
  }

  function startHeartbeat() {
    stopHeartbeat();
    ["pointerdown", "keydown", "touchstart", "scroll"].forEach(name => {
      document.addEventListener(name, markInteraction, { passive: true });
    });
    heartbeatTimer = setInterval(async () => {
      if (!currentUser || document.visibilityState !== "visible") return;
      if (Date.now() - lastInteractionAt > 90_000) return;
      try {
        await api("/api/activity/ping", {
          method: "POST",
          body: JSON.stringify({
            seconds: HEARTBEAT_SECONDS,
            courseVersion: window.XinzuoAcademy?.getCourseVersion?.() || "0.1.0",
            page: el.managerView.hidden ? "academy" : "manager"
          })
        });
      } catch (error) {
        console.warn("Engagement heartbeat failed", error);
      }
    }, HEARTBEAT_SECONDS * 1000);
  }

  function stopHeartbeat() {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = null;
    ["pointerdown", "keydown", "touchstart", "scroll"].forEach(name => {
      document.removeEventListener(name, markInteraction);
    });
  }

  async function openManager() {
    if (!currentUser || !["manager", "admin"].includes(currentUser.role)) return;
    el.learnerArea.hidden = true;
    el.authGate.hidden = true;
    el.managerView.hidden = false;
    el.managerDetail.hidden = true;
    window.scrollTo({ top: 0, behavior: "smooth" });
    await refreshManager();
  }

  function closeManager() {
    el.managerView.hidden = true;
    el.learnerArea.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function pct(value) {
    return `${Math.round(Number(value || 0) * 100)}%`;
  }

  function humanMinutes(seconds) {
    const minutes = Math.round(Number(seconds || 0) / 60);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `${hours} h ${rest} min` : `${hours} h`;
  }

  function when(ts) {
    if (!ts) return "—";
    const date = new Date(Number(ts) * 1000);
    return date.toLocaleString(document.documentElement.lang || "it", { dateStyle: "short", timeStyle: "short" });
  }

  async function refreshManager() {
    el.managerOverview.innerHTML = "<p>Caricamento…</p>";
    el.managerUsers.innerHTML = '<tr><td colspan="8">Caricamento…</td></tr>';
    try {
      const [overviewResult, usersResult] = await Promise.all([
        api("/api/manager/overview", { method: "GET" }),
        api("/api/manager/users", { method: "GET" })
      ]);
      renderManagerOverview(overviewResult.overview);
      renderManagerUsers(usersResult.users || []);
      renderManagerLegend();
    } catch (error) {
      el.managerOverview.innerHTML = `<p class="form-status form-status--error">${escapeHtml(error.message)}</p>`;
      el.managerUsers.innerHTML = `<tr><td colspan="8">${escapeHtml(error.message)}</td></tr>`;
    }
  }

  function renderManagerOverview(data) {
    const items = [
      ["Personale", data.learners],
      ["Attivi 7 gg", data.active7d],
      ["Progresso medio", pct(data.progressAvg)],
      ["Media mini-test", pct(data.miniTestAvg)],
      ["Impegno medio", humanMinutes(data.engagementAvgSeconds)],
      ["Concetti da consolidare", data.weakConcepts]
    ];
    el.managerOverview.innerHTML = items.map(([label, value]) => `
      <article class="metric-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>
    `).join("");
  }

  function renderManagerLegend() {
    el.managerLegend.innerHTML = `
      <dl class="legend-list">
        <div><dt>Progresso</dt><dd>Lezioni Base completate / lezioni Base attive.</dd></div>
        <div><dt>Concetti</dt><dd>Acquisiti e ancora deboli/quasi acquisiti.</dd></div>
        <div><dt>Mini-test</dt><dd>Media dei mini-test informativi completati.</dd></div>
        <div><dt>Impegno</dt><dd>Tempo attivo verificato tramite heartbeat, non semplice sessione aperta.</dd></div>
      </dl>
    `;
  }

  function renderManagerUsers(users) {
    if (!users.length) {
      el.managerUsers.innerHTML = '<tr><td colspan="8">Nessun utente staff registrato.</td></tr>';
      return;
    }
    el.managerUsers.innerHTML = users.map(user => {
      const progress = user.lessons_total ? Number(user.lessons_completed || 0) / Number(user.lessons_total) : 0;
      const score = Number(user.mini_tests_completed || 0) ? pct(user.mini_test_avg) : "—";
      return `
        <tr>
          <td><strong>${escapeHtml(user.first_name)} ${escapeHtml(user.last_name)}</strong><small>${escapeHtml(user.email)}</small></td>
          <td>${escapeHtml(user.team || "—")}</td>
          <td><span class="table-progress"><i style="width:${Math.round(progress * 100)}%"></i></span><b>${pct(progress)}</b></td>
          <td>${Number(user.concepts_acquired || 0)} acquisiti<br><small>${Number(user.concepts_weak || 0)} da rivedere</small></td>
          <td>${score}<br><small>${Number(user.mini_tests_completed || 0)} test</small></td>
          <td>${humanMinutes(user.engagement_seconds)}</td>
          <td>${when(user.last_active_at)}</td>
          <td><button class="button button--quiet detail-button" type="button" data-user-id="${escapeHtml(user.id)}">Dettaglio</button></td>
        </tr>
      `;
    }).join("");
    el.managerUsers.querySelectorAll(".detail-button").forEach(button => {
      button.addEventListener("click", () => openUserDetail(button.dataset.userId));
    });
  }

  async function openUserDetail(userId) {
    el.managerDetail.hidden = false;
    el.managerDetail.innerHTML = "<p>Caricamento dettaglio…</p>";
    el.managerDetail.scrollIntoView({ behavior: "smooth", block: "start" });
    try {
      const result = await api(`/api/manager/users/${encodeURIComponent(userId)}`, { method: "GET" });
      const p = result.progress;
      const events = result.events || [];
      el.managerDetail.innerHTML = `
        <div class="section-heading">
          <div>
            <p class="eyebrow">Learner detail</p>
            <h2>${escapeHtml(result.user.firstName)} ${escapeHtml(result.user.lastName)}</h2>
            <p>${escapeHtml(result.user.email)} · ${escapeHtml(result.user.team || "Nessun team")}</p>
          </div>
          <div class="learning-actions">
            <button id="generateReset" class="button button--quiet" type="button">Genera reset password</button>
            <button id="toggleUser" class="button button--quiet" type="button">${result.user.active ? "Disabilita account" : "Riattiva account"}</button>
          </div>
        </div>
        <div class="manager-metrics manager-metrics--detail">
          <article class="metric-card"><span>Lezioni</span><strong>${p ? `${p.lessons_completed}/${p.lessons_total}` : "0"}</strong></article>
          <article class="metric-card"><span>Concetti acquisiti</span><strong>${p?.concepts_acquired || 0}</strong></article>
          <article class="metric-card"><span>Da consolidare</span><strong>${p?.concepts_weak || 0}</strong></article>
          <article class="metric-card"><span>Media test</span><strong>${p?.mini_tests_completed ? pct(p.mini_test_avg) : "—"}</strong></article>
          <article class="metric-card"><span>Interazioni</span><strong>${p?.interactions || 0}</strong></article>
          <article class="metric-card"><span>Impegno</span><strong>${humanMinutes(p?.engagement_seconds || 0)}</strong></article>
        </div>
        <div id="detailActionResult" class="invite-result" hidden></div>
        <h3>Attività recente</h3>
        <div class="activity-list">
          ${events.slice(0, 30).map(event => `
            <div class="activity-row">
              <strong>${escapeHtml(eventLabel(event.event_type))}</strong>
              <span>${escapeHtml(event.module_id || event.concept_id || "")}</span>
              <time>${when(event.created_at)}</time>
            </div>
          `).join("") || "<p>Nessuna attività registrata.</p>"}
        </div>
      `;
      document.getElementById("generateReset").addEventListener("click", () => generateManagerReset(userId));
      document.getElementById("toggleUser").addEventListener("click", async () => {
        await api(`/api/manager/users/${encodeURIComponent(userId)}`, {
          method: "PATCH",
          body: JSON.stringify({ active: !result.user.active })
        });
        await refreshManager();
        await openUserDetail(userId);
      });
    } catch (error) {
      el.managerDetail.innerHTML = `<p class="form-status form-status--error">${escapeHtml(error.message)}</p>`;
    }
  }

  function eventLabel(type) {
    return ({
      question_answered: "Risposta",
      mini_test_completed: "Mini-test",
      module_completed: "Modulo completato",
      engagement: "Attività",
      login: "Accesso",
      course_opened: "Apertura corso"
    })[type] || type;
  }

  async function generateManagerReset(userId) {
    const box = document.getElementById("detailActionResult");
    try {
      const result = await api(`/api/manager/users/${encodeURIComponent(userId)}/password-reset`, { method: "POST", body: "{}" });
      const url = new URL(window.location.href);
      url.search = "";
      url.searchParams.set("reset", result.resetToken);
      url.searchParams.set("email", result.email);
      box.hidden = false;
      box.innerHTML = `
        <strong>Reset valido per 1 ora</strong>
        <label>Link da consegnare all'utente
          <input type="text" readonly value="${escapeHtml(url.toString())}">
        </label>
      `;
    } catch (error) {
      box.hidden = false;
      box.textContent = error.message;
    }
  }

  el.loginTab.addEventListener("click", () => showAuthTab("login"));
  el.registerTab.addEventListener("click", () => showAuthTab("register"));
  el.resetTab.addEventListener("click", () => showAuthTab("reset"));

  el.loginForm.addEventListener("submit", async event => {
    event.preventDefault();
    const data = new FormData(el.loginForm);
    setBusy(el.loginForm, true);
    formStatus(el.loginForm, "Accesso…");
    try {
      await authenticateWith("/api/auth/login", {
        email: data.get("email"),
        password: data.get("password"),
        remember: data.get("remember") === "on"
      }, data.get("remember") === "on");
      el.loginForm.reset();
      formStatus(el.loginForm, "");
    } catch (error) {
      formStatus(el.loginForm, error.message, "error");
    } finally {
      setBusy(el.loginForm, false);
    }
  });

  el.registerForm.addEventListener("submit", async event => {
    event.preventDefault();
    const data = new FormData(el.registerForm);
    setBusy(el.registerForm, true);
    formStatus(el.registerForm, "Creazione account…");
    try {
      await authenticateWith("/api/auth/register", {
        inviteToken: data.get("inviteToken"),
        firstName: data.get("firstName"),
        lastName: data.get("lastName"),
        email: data.get("email"),
        password: data.get("password"),
        remember: data.get("remember") === "on"
      }, data.get("remember") === "on");
      el.registerForm.reset();
      formStatus(el.registerForm, "");
    } catch (error) {
      formStatus(el.registerForm, error.message, "error");
    } finally {
      setBusy(el.registerForm, false);
    }
  });

  el.resetRequestForm.addEventListener("submit", async event => {
    event.preventDefault();
    const data = new FormData(el.resetRequestForm);
    setBusy(el.resetRequestForm, true);
    try {
      const result = await api("/api/auth/request-reset", {
        method: "POST",
        body: JSON.stringify({ email: data.get("email") })
      });
      formStatus(el.resetRequestForm, result.message || "Richiesta inviata.", "success");
    } catch (error) {
      formStatus(el.resetRequestForm, error.message, "error");
    } finally {
      setBusy(el.resetRequestForm, false);
    }
  });

  el.resetCompleteForm.addEventListener("submit", async event => {
    event.preventDefault();
    const data = new FormData(el.resetCompleteForm);
    setBusy(el.resetCompleteForm, true);
    try {
      await api("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          email: data.get("email"),
          resetToken: data.get("resetToken"),
          newPassword: data.get("newPassword")
        })
      });
      formStatus(el.resetCompleteForm, "Password aggiornata. Ora puoi accedere.", "success");
      setTimeout(() => showAuthTab("login"), 800);
    } catch (error) {
      formStatus(el.resetCompleteForm, error.message, "error");
    } finally {
      setBusy(el.resetCompleteForm, false);
    }
  });

  el.logoutButton.addEventListener("click", async () => {
    try {
      if (apiAvailable() && token()) await api("/api/auth/logout", { method: "POST", body: "{}" });
    } catch {}
    clearSession();
    setUser(null);
    showAuthTab("login");
  });

  el.accountButton.addEventListener("click", () => {
    renderAccountProfile();
    el.accountDialog.showModal();
  });

  el.changePasswordForm.addEventListener("submit", async event => {
    event.preventDefault();
    const data = new FormData(el.changePasswordForm);
    setBusy(el.changePasswordForm, true);
    try {
      const result = await api("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: data.get("currentPassword"),
          newPassword: data.get("newPassword")
        })
      });
      rememberToken(result.token, true);
      el.changePasswordForm.reset();
      formStatus(el.changePasswordForm, "Password aggiornata. Le altre sessioni sono state revocate.", "success");
    } catch (error) {
      formStatus(el.changePasswordForm, error.message, "error");
    } finally {
      setBusy(el.changePasswordForm, false);
    }
  });

  el.managerButton.addEventListener("click", openManager);
  el.managerBack.addEventListener("click", closeManager);
  el.managerRefresh.addEventListener("click", refreshManager);

  el.inviteForm.addEventListener("submit", async event => {
    event.preventDefault();
    const data = new FormData(el.inviteForm);
    setBusy(el.inviteForm, true);
    formStatus(el.inviteForm, "Creazione invito…");
    try {
      const result = await api("/api/manager/invites", {
        method: "POST",
        body: JSON.stringify({
          email: data.get("email"),
          role: data.get("role"),
          team: data.get("team"),
          days: Number(data.get("days"))
        })
      });
      const url = new URL(window.location.href);
      url.search = "";
      url.searchParams.set("invite", result.inviteToken);
      if (result.email) url.searchParams.set("email", result.email);
      el.inviteResult.hidden = false;
      el.inviteResult.innerHTML = `
        <strong>Invito creato</strong>
        <p>Ruolo: ${escapeHtml(roleLabel(result.role))} · scade ${when(result.expiresAt)}</p>
        <label>Link di registrazione
          <input type="text" readonly value="${escapeHtml(url.toString())}">
        </label>
      `;
      formStatus(el.inviteForm, "Invito pronto.", "success");
      el.inviteForm.reset();
    } catch (error) {
      formStatus(el.inviteForm, error.message, "error");
    } finally {
      setBusy(el.inviteForm, false);
    }
  });

  el.offlineButton.addEventListener("click", () => {
    el.authGate.hidden = true;
    el.learnerArea.hidden = false;
    window.dispatchEvent(new CustomEvent("academy-offline-mode"));
  });

  function applyQueryActions() {
    const params = new URLSearchParams(location.search);
    const invite = params.get("invite");
    const email = params.get("email");
    const reset = params.get("reset");
    if (invite) {
      showAuthTab("register");
      el.registerForm.elements.inviteToken.value = invite;
      if (email) el.registerForm.elements.email.value = email;
    }
    if (reset) {
      el.loginForm.hidden = true;
      el.registerForm.hidden = true;
      el.resetRequestForm.hidden = true;
      el.resetCompleteForm.hidden = false;
      [el.loginTab, el.registerTab, el.resetTab].forEach(b => b.classList.remove("auth-tab--active"));
      el.resetTab.classList.add("auth-tab--active");
      el.resetCompleteForm.elements.resetToken.value = reset;
      if (email) el.resetCompleteForm.elements.email.value = email;
    }
  }

  window.AcademyAccount = Object.freeze({
    apiAvailable,
    getUser: () => currentUser,
    isAuthenticated: () => Boolean(currentUser),
    syncProgress,
    trackEvent,
    fetchProgress: () => api("/api/progress", { method: "GET" }),
    refreshManager
  });

  applyQueryActions();
  restoreSession();
})();
