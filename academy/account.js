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
  let pendingRegistration = null;
  let verificationChannels = { email: true, whatsapp: true };
  let publicRegistrationOpen = false;
  let certificationAttempt = null;
  let certificationTimerHandle = null;

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
    verificationForm: document.getElementById("verificationForm"),
    verificationDestination: document.getElementById("verificationDestination"),
    resendVerification: document.getElementById("resendVerification"),
    resetRequestForm: document.getElementById("resetRequestForm"),
    resetCompleteForm: document.getElementById("resetCompleteForm"),
    offlineButton: document.getElementById("offlineButton"),
    userChip: document.getElementById("userChip"),
    managerButton: document.getElementById("managerButton"),
    accountButton: document.getElementById("accountButton"),
    logoutButton: document.getElementById("logoutButton"),
    accountDialog: document.getElementById("accountDialog"),
    accountProfile: document.getElementById("accountProfile"),
    consentForm: document.getElementById("consentForm"),
    myCertificates: document.getElementById("myCertificates"),
    changePasswordForm: document.getElementById("changePasswordForm"),
    managerBack: document.getElementById("managerBack"),
    managerRefresh: document.getElementById("managerRefresh"),
    managerOverview: document.getElementById("managerOverview"),
    managerUsers: document.getElementById("managerUsers"),
    managerDetail: document.getElementById("managerDetail"),
    inviteForm: document.getElementById("inviteForm"),
    internalInvitePanel: document.getElementById("internalInvitePanel"),
    inviteResult: document.getElementById("inviteResult"),
    managerLegend: document.getElementById("managerLegend"),
    certificationPanel: document.getElementById("certificationPanel"),
    certificationStatusSummary: document.getElementById("certificationStatusSummary"),
    startCertification: document.getElementById("startCertification"),
    certificationView: document.getElementById("certificationView"),
    certificationBack: document.getElementById("certificationBack"),
    certificationTimer: document.getElementById("certificationTimer"),
    certificationSurface: document.getElementById("certificationSurface")
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

  function legalConfigured() {
    return Boolean(
      String(cfg.privacyControllerName || "").trim() &&
      String(cfg.privacyControllerAddress || "").trim() &&
      String(cfg.privacyControllerVat || "").trim() &&
      String(cfg.privacyContactName || "").trim() &&
      String(cfg.privacyContactEmail || "").trim()
    );
  }

  function applyVerificationAvailability() {
    const select = el.registerForm?.elements?.verificationChannel;
    if (!select) return;
    const emailOption = select.querySelector('option[value="email"]');
    const whatsappOption = select.querySelector('option[value="whatsapp"]');
    if (emailOption) emailOption.disabled = !verificationChannels.email;
    if (whatsappOption) whatsappOption.disabled = !verificationChannels.whatsapp;
    if (select.value === "email" && !verificationChannels.email && verificationChannels.whatsapp) select.value = "whatsapp";
    if (select.value === "whatsapp" && !verificationChannels.whatsapp && verificationChannels.email) select.value = "email";
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
    el.verificationForm.hidden = true;
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
      if (el.certificationPanel) {
        el.certificationPanel.hidden = false;
        loadCertificationStatus();
      }
    } else {
      el.userChip.textContent = "";
      el.managerView.hidden = true;
      if (el.certificationPanel) el.certificationPanel.hidden = true;
      if (el.certificationView) el.certificationView.hidden = true;
      stopCertificationTimer();
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
    return role === "admin" ? "Admin" : role === "manager" ? "Manager" : "Learner";
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
        <div><dt>Email</dt><dd>${escapeHtml(currentUser.email || "—")} ${currentUser.emailVerified ? "✓" : ""}</dd></div>
        <div><dt>Cellulare</dt><dd>${escapeHtml(currentUser.phone || "—")} ${currentUser.phoneVerified ? "✓" : ""}</dd></div>
        <div><dt>Ruolo</dt><dd>${escapeHtml(roleLabel(currentUser.role))}</dd></div>
      </dl>
    `;
  }


  function certificateUrl(code) {
    const base = String(cfg.academyPublicUrl || new URL("./", window.location.href)).replace(/\/$/,"");
    return `${base}/certificate.html?code=${encodeURIComponent(code)}`;
  }

  function renderMyCertificates(certificates) {
    if (!el.myCertificates) return;
    if (!certificates.length) {
      el.myCertificates.innerHTML = '<p class="password-hint">Nessun certificato emesso.</p>';
      return;
    }
    el.myCertificates.innerHTML = certificates.map(cert => `
      <article class="certificate-list-item">
        <div>
          <strong>${escapeHtml(cert.courseLevel)} · ${escapeHtml(cert.verificationCode)}</strong>
          <span>${escapeHtml(cert.status)} · ${when(cert.issuedAt)}</span>
        </div>
        <a class="button button--quiet" href="${escapeHtml(certificateUrl(cert.verificationCode))}" target="_blank" rel="noopener">Apri</a>
      </article>
    `).join("");
  }

  async function loadAccountExtras() {
    if (!currentUser || !apiAvailable()) return;
    try {
      const [consentResult,certificateResult] = await Promise.all([
        api("/api/privacy/consents",{method:"GET"}),
        api("/api/certificates/mine",{method:"GET"})
      ]);
      const c = consentResult.consents || {};
      el.consentForm.elements.marketingEmail.checked = Boolean(c.marketingEmail);
      el.consentForm.elements.marketingWhatsapp.checked = Boolean(c.marketingWhatsapp);
      el.consentForm.elements.marketingPhone.checked = Boolean(c.marketingPhone);
      el.consentForm.elements.marketingEmail.disabled = !currentUser.email;
      el.consentForm.elements.marketingWhatsapp.disabled = !currentUser.phone;
      el.consentForm.elements.marketingPhone.disabled = !currentUser.phone;
      renderMyCertificates(certificateResult.certificates || []);
    } catch (error) {
      formStatus(el.consentForm,error.message,"error");
    }
  }

  async function restoreSession() {
    if (!apiAvailable()) {
      el.backendStatus.innerHTML = `
        <strong>Il backend pubblico di Academy non è ancora collegato a questo sito.</strong>
        <span>Configura <code>ACADEMY_API_BASE</code> dopo il deploy Cloudflare. La modalità locale resta disponibile solo come anteprima senza account o certificati.</span>
      `;
      el.offlineButton.hidden = false;
      setUser(null);
      return;
    }

    el.backendStatus.textContent = "Connessione al backend Xinzuo Academy…";
    el.offlineButton.hidden = true;

    try {
      const health = await api("/api/health", { method: "GET" });
      verificationChannels = {
        email:Boolean(health.verificationChannels?.email),
        whatsapp:Boolean(health.verificationChannels?.whatsapp)
      };
      publicRegistrationOpen = Boolean(health.publicRegistration);
      applyVerificationAvailability();
      el.registerTab.disabled = !publicRegistrationOpen || !legalConfigured();
      const channelText = [
        verificationChannels.email ? "email" : null,
        verificationChannels.whatsapp ? "WhatsApp" : null
      ].filter(Boolean).join(" + ");
      el.backendStatus.textContent = !legalConfigured()
        ? "Backend online, ma identità del titolare privacy non ancora configurata: registrazione pubblica disabilitata."
        : !publicRegistrationOpen
          ? "Backend Academy online · registrazione pubblica non ancora aperta."
          : `Backend Academy online${channelText ? " · verifica " + channelText : " · nessun canale OTP configurato"}.`;
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
      if (type === "module_completed") loadCertificationStatus();
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


  function stopCertificationTimer() {
    if (certificationTimerHandle) clearInterval(certificationTimerHandle);
    certificationTimerHandle = null;
  }

  function startCertificationTimer(expiresAt) {
    stopCertificationTimer();
    const update = () => {
      const seconds = Math.max(0, Number(expiresAt || 0) - Math.floor(Date.now()/1000));
      const minutes = Math.floor(seconds / 60);
      const rest = seconds % 60;
      el.certificationTimer.textContent = `Tempo residuo: ${minutes}:${String(rest).padStart(2,"0")}`;
      if (seconds <= 0) stopCertificationTimer();
    };
    update();
    certificationTimerHandle = setInterval(update,1000);
  }

  async function loadCertificationStatus() {
    if (!currentUser || !apiAvailable() || !el.certificationPanel) return;
    try {
      const result = await api("/api/certification/base/status",{method:"GET"});
      const valid = (result.certificates || []).find(cert=>cert.status === "valid");
      if (valid) {
        el.certificationStatusSummary.innerHTML = `
          <strong>Certificato valido</strong><br>
          <a href="${escapeHtml(certificateUrl(valid.verificationCode))}" target="_blank" rel="noopener">${escapeHtml(valid.verificationCode)}</a>
        `;
        el.startCertification.textContent = "Sostieni nuovamente l'esame";
        el.startCertification.disabled = false;
        return;
      }
      if (result.eligible) {
        el.certificationStatusSummary.textContent = "Requisiti completati: puoi sostenere l'esame finale.";
        el.startCertification.disabled = false;
      } else {
        const p = result.progress || {};
        el.certificationStatusSummary.textContent =
          `Completa il Base: ${p.lessonsCompleted || 0}/27 lezioni · ${p.modulesCompleted || 0}/6 moduli · ${p.miniTestsCompleted || 0}/6 mini-test.`;
        el.startCertification.disabled = true;
      }
    } catch (error) {
      el.certificationStatusSummary.textContent = error.message;
      el.startCertification.disabled = true;
    }
  }

  function openCertificationView() {
    document.getElementById("hero").hidden = true;
    document.getElementById("homeView").hidden = true;
    document.getElementById("learningView").hidden = true;
    el.certificationPanel.hidden = true;
    el.certificationView.hidden = false;
    window.scrollTo({top:0,behavior:"smooth"});
  }

  function closeCertificationView() {
    stopCertificationTimer();
    el.certificationView.hidden = true;
    document.getElementById("hero").hidden = false;
    document.getElementById("homeView").hidden = false;
    document.getElementById("learningView").hidden = true;
    el.certificationPanel.hidden = !currentUser;
    window.scrollTo({top:0,behavior:"smooth"});
    loadCertificationStatus();
  }

  function renderCertificationAssessment(result) {
    certificationAttempt = result;
    openCertificationView();
    startCertificationTimer(result.expiresAt);
    const questions = result.questions || [];
    el.certificationSurface.innerHTML = `
      <div class="lesson-kicker">
        <span>Assessment finale · ${escapeHtml(result.assessmentVersion)}</span>
        <span class="critical-flag">80% + 0 errori critici</span>
      </div>
      <h2>Certificazione Xinzuo Academy · Base</h2>
      <p class="lead">Rispondi a tutte le domande. Il risultato viene calcolato dal backend al momento dell'invio.</p>
      <form id="certificationForm" class="question-form">
        <div class="mini-grid">
          ${questions.map((question,index)=>`
            <fieldset class="mini-question">
              <legend>${index+1}. ${escapeHtml(question.prompt)} ${question.critical ? '<span class="critical-inline">critica</span>' : ""}</legend>
              ${question.options.map(option=>`
                <label class="option">
                  <input type="radio" name="${escapeHtml(question.id)}" value="${escapeHtml(option.id)}">
                  <span>${escapeHtml(option.text)}</span>
                </label>
              `).join("")}
            </fieldset>
          `).join("")}
        </div>
        <p id="certificationMessage" class="form-status" role="alert"></p>
        <div class="learning-actions">
          <button class="button" type="submit">Invia esame finale</button>
        </div>
      </form>
    `;
    document.getElementById("certificationForm").addEventListener("submit",submitCertificationAssessment);
  }

  async function startCertificationAssessment() {
    if (!currentUser) return;
    el.startCertification.disabled = true;
    el.certificationStatusSummary.textContent = "Preparazione esame…";
    try {
      const result = await api("/api/certification/base/start",{
        method:"POST",
        body:JSON.stringify({locale:window.XinzuoAcademy?.getLocale?.() || "it"})
      });
      renderCertificationAssessment(result);
    } catch (error) {
      el.certificationStatusSummary.textContent = error.message;
      el.startCertification.disabled = false;
    }
  }

  async function submitCertificationAssessment(event) {
    event.preventDefault();
    if (!certificationAttempt) return;
    const form = event.currentTarget;
    const answers = {};
    for (const question of certificationAttempt.questions || []) {
      const selected = form.querySelector(`input[name="${CSS.escape(question.id)}"]:checked`);
      if (!selected) {
        document.getElementById("certificationMessage").textContent = "Rispondi a tutte le domande prima di inviare l'esame.";
        return;
      }
      answers[question.id] = selected.value;
    }
    setBusy(form,true);
    document.getElementById("certificationMessage").textContent = "Valutazione in corso…";
    try {
      const result = await api("/api/certification/base/submit",{
        method:"POST",
        body:JSON.stringify({
          attemptId:certificationAttempt.attemptId,
          answers,
          courseVersion:window.XinzuoAcademy?.getCourseVersion?.() || "0.1.0"
        })
      });
      stopCertificationTimer();
      const percentage = Math.round(Number(result.score || 0)*100);
      if (result.passed && result.certificate) {
        el.certificationSurface.innerHTML = `
          <div class="certificate-result certificate-result--pass">
            <p class="eyebrow">Esame superato</p>
            <h2>Congratulazioni</h2>
            <p class="lead">Punteggio: <strong>${percentage}%</strong> · errori critici: <strong>${result.criticalErrors}</strong>.</p>
            <p>Il tuo certificato Xinzuo Academy Base è stato emesso e registrato.</p>
            <a class="button" href="${escapeHtml(certificateUrl(result.certificate.verificationCode))}" target="_blank" rel="noopener">Apri certificato ${escapeHtml(result.certificate.verificationCode)}</a>
          </div>
        `;
        loadAccountExtras();
      } else {
        el.certificationSurface.innerHTML = `
          <div class="certificate-result certificate-result--fail">
            <p class="eyebrow">Da consolidare</p>
            <h2>Esame non superato</h2>
            <p class="lead">Punteggio: <strong>${percentage}%</strong> · errori critici: <strong>${result.criticalErrors}</strong>.</p>
            <p>Rivedi i concetti indicati nel percorso e completa almeno ${result.remediationInteractionsRequired || 3} nuove interazioni formative prima di riprovare.</p>
            <p class="password-hint">Aree da consolidare: ${(result.failedConcepts || []).map(escapeHtml).join(", ") || "riesamina il percorso Base"}.</p>
            <button id="certificationReturn" class="button" type="button">Torna alla formazione</button>
          </div>
        `;
        document.getElementById("certificationReturn").addEventListener("click",closeCertificationView);
      }
      certificationAttempt = null;
    } catch (error) {
      document.getElementById("certificationMessage").textContent = error.message;
      setBusy(form,false);
    }
  }

  async function openManager() {
    if (!currentUser || !["manager", "admin"].includes(currentUser.role)) return;
    if (el.internalInvitePanel) el.internalInvitePanel.hidden = currentUser.role !== "admin";
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
      ["Iscritti", data.learners],
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
      el.managerUsers.innerHTML = '<tr><td colspan="8">Nessun iscritto registrato.</td></tr>';
      return;
    }
    el.managerUsers.innerHTML = users.map(user => {
      const progress = user.lessons_total ? Number(user.lessons_completed || 0) / Number(user.lessons_total) : 0;
      const score = Number(user.mini_tests_completed || 0) ? pct(user.mini_test_avg) : "—";
      return `
        <tr>
          <td><strong>${escapeHtml(user.first_name)} ${escapeHtml(user.last_name)}</strong><small>iscritto ${when(user.created_at)}</small></td>
          <td>${escapeHtml(user.email || user.phone || "—")}<small>${user.email_verified_at || user.phone_verified_at ? "verificato" : "non verificato"}</small></td>
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
      const certificates = result.certificates || [];
      const contacts = [result.user.email,result.user.phone].filter(Boolean).join(" · ") || "—";
      const certificateRows = certificates.length ? certificates.map(cert => `
        <div class="certificate-admin-row">
          <div>
            <strong>${escapeHtml(cert.courseLevel)} · ${escapeHtml(cert.verificationCode)}</strong>
            <span>${escapeHtml(cert.status)} · ${when(cert.issuedAt)}</span>
          </div>
          <div class="learning-actions">
            <a class="button button--quiet" href="${escapeHtml(certificateUrl(cert.verificationCode))}" target="_blank" rel="noopener">Verifica</a>
            ${result.admin && cert.status === "valid" ? `<button class="button button--quiet revoke-cert" type="button" data-cert-id="${escapeHtml(cert.id)}">Revoca</button>` : ""}
          </div>
        </div>
      `).join("") : "<p>Nessun certificato emesso.</p>";

      const consentRows = result.admin && (result.consents || []).length
        ? `<details class="consent-history"><summary>Cronologia consensi</summary>${result.consents.slice(0,30).map(row => `
            <div><strong>${escapeHtml(row.consent_type)}</strong><span>${row.granted ? "consenso" : "revoca/rifiuto"} · ${when(row.created_at)}</span></div>
          `).join("")}</details>`
        : "";

      el.managerDetail.innerHTML = `
        <div class="section-heading">
          <div>
            <p class="eyebrow">Learner detail</p>
            <h2>${escapeHtml(result.user.firstName)} ${escapeHtml(result.user.lastName)}</h2>
            <p>${escapeHtml(contacts)}</p>
          </div>
          <div class="learning-actions">
            <button id="generateReset" class="button button--quiet" type="button">Genera reset password</button>
            ${result.admin ? '<button id="issueCertificate" class="button" type="button">Emetti certificato manuale</button>' : ""}
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
        ${result.admin ? `
          <div class="consent-summary">
            <strong>Marketing:</strong>
            email ${result.user.marketingEmailConsent ? "✓" : "—"} ·
            SMS ${result.user.marketingWhatsappConsent ? "✓" : "—"} ·
            telefono ${result.user.marketingPhoneConsent ? "✓" : "—"}
          </div>${consentRows}
        ` : ""}
        <div id="detailActionResult" class="invite-result" hidden></div>
        <h3>Certificati</h3>
        <div class="certificate-admin-list">${certificateRows}</div>
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

      const issue = document.getElementById("issueCertificate");
      if (issue) issue.addEventListener("click",()=>issueManualCertificate(userId));

      el.managerDetail.querySelectorAll(".revoke-cert").forEach(button => {
        button.addEventListener("click",async()=>{
          const reason = prompt("Motivo della revoca del certificato:");
          if (!reason) return;
          await api(`/api/admin/certificates/${encodeURIComponent(button.dataset.certId)}`,{
            method:"PATCH",
            body:JSON.stringify({status:"revoked",reason})
          });
          await openUserDetail(userId);
        });
      });
    } catch (error) {
      el.managerDetail.innerHTML = `<p class="form-status form-status--error">${escapeHtml(error.message)}</p>`;
    }
  }

  async function issueManualCertificate(userId) {
    if (!confirm("Emettere manualmente un certificato Base? Questa funzione è provvisoria finché l'assessment finale automatico non viene collegato.")) return;
    const result = await api("/api/admin/certificates/issue",{
      method:"POST",
      body:JSON.stringify({
        userId,
        courseId:"xinzuo-academy-base",
        courseLevel:"Base",
        courseVersion:window.XinzuoAcademy?.getCourseVersion?.() || "0.1.0",
        assessmentVersion:"manual-admin-v1",
        publicNote:"Manual issuance by Xinzuo Academy administrator.",
        basis:"Manual administrator issuance pending automated final assessment integration."
      })
    });
    window.open(certificateUrl(result.certificate.verificationCode),"_blank","noopener");
    await openUserDetail(userId);
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
      box.hidden = false;
      box.innerHTML = `
        <strong>Codice reset valido per 30 minuti</strong>
        <p>Recapito: ${escapeHtml(result.contact || "—")}</p>
        <label>Codice
          <input type="text" readonly value="${escapeHtml(result.resetToken)}">
        </label>
      `;
    } catch (error) {
      box.hidden = false;
      box.textContent = error.message;
    }
  }

  function updateWhatsAppServiceConsentRequirement() {
    const row = document.getElementById("whatsappServiceConsentRow");
    const input = el.registerForm?.elements?.whatsappServiceConsent;
    if (!row || !input) return;
    const required = el.registerForm.elements.verificationChannel.value === "whatsapp";
    row.hidden = !required;
    input.required = required;
    if (!required) input.checked = false;
  }

  el.registerForm.elements.verificationChannel.addEventListener("change", updateWhatsAppServiceConsentRequirement);
  updateWhatsAppServiceConsentRequirement();

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
        contact: data.get("contact"),
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
      const inviteToken = String(data.get("inviteToken") || "").trim();
      if (inviteToken) {
        await authenticateWith("/api/auth/register", {
          inviteToken,
          firstName:data.get("firstName"),
          lastName:data.get("lastName"),
          email:data.get("email"),
          password:data.get("password"),
          remember:data.get("remember") === "on"
        }, data.get("remember") === "on");
        el.registerForm.reset();
        formStatus(el.registerForm,"");
      } else {
        if (!legalConfigured()) {
          throw new Error("Registrazione non ancora aperta: identità e contatto privacy del titolare devono essere configurati.");
        }
        if (!publicRegistrationOpen) {
          throw new Error("La registrazione pubblica non è ancora stata attivata.");
        }
        const result = await api("/api/auth/register/start", {
          method:"POST",
          body:JSON.stringify({
            firstName:data.get("firstName"),
            lastName:data.get("lastName"),
            email:data.get("email"),
            phone:data.get("phone"),
            verificationChannel:data.get("verificationChannel"),
            whatsappServiceConsent:data.get("whatsappServiceConsent") === "on",
            password:data.get("password"),
            ageConfirmed:data.get("ageConfirmed") === "on",
            acceptTerms:data.get("acceptTerms") === "on",
            acceptPrivacy:data.get("acceptPrivacy") === "on",
            marketingEmailConsent:data.get("marketingEmailConsent") === "on",
            marketingWhatsappConsent:data.get("marketingWhatsappConsent") === "on",
            marketingPhoneConsent:data.get("marketingPhoneConsent") === "on"
          })
        });
        pendingRegistration = {
          registrationId:result.registrationId,
          verificationChannel:result.verificationChannel,
          remember:data.get("remember") === "on"
        };
        el.verificationForm.elements.registrationId.value = result.registrationId;
        el.verificationForm.elements.remember.checked = pendingRegistration.remember;
        el.verificationDestination.textContent = `Abbiamo inviato il codice a ${result.maskedDestination}. Scade tra pochi minuti.`;
        el.registerForm.hidden = true;
        el.verificationForm.hidden = false;
        formStatus(el.registerForm,"");
      }
    } catch (error) {
      formStatus(el.registerForm,error.message,"error");
    } finally {
      setBusy(el.registerForm,false);
    }
  });

  el.verificationForm.addEventListener("submit", async event => {
    event.preventDefault();
    const data = new FormData(el.verificationForm);
    setBusy(el.verificationForm,true);
    formStatus(el.verificationForm,"Verifica…");
    try {
      const result = await api("/api/auth/register/verify", {
        method:"POST",
        body:JSON.stringify({
          registrationId:data.get("registrationId"),
          code:data.get("code"),
          remember:data.get("remember") === "on"
        })
      });
      rememberToken(result.token,data.get("remember") === "on");
      pendingRegistration = null;
      setUser(result.user);
      await hydrateRemoteProgress();
      el.registerForm.reset();
      el.verificationForm.reset();
      formStatus(el.verificationForm,"");
    } catch (error) {
      formStatus(el.verificationForm,error.message,"error");
    } finally {
      setBusy(el.verificationForm,false);
    }
  });

  el.resendVerification.addEventListener("click", async () => {
    const registrationId = pendingRegistration?.registrationId || el.verificationForm.elements.registrationId.value;
    if (!registrationId) return;
    el.resendVerification.disabled = true;
    try {
      const result = await api("/api/auth/register/resend", {
        method:"POST",
        body:JSON.stringify({registrationId,verificationChannel:pendingRegistration?.verificationChannel})
      });
      el.verificationDestination.textContent = `Nuovo codice inviato a ${result.maskedDestination}.`;
      formStatus(el.verificationForm,"Nuovo codice inviato.","success");
    } catch (error) {
      formStatus(el.verificationForm,error.message,"error");
    } finally {
      setTimeout(()=>{ el.resendVerification.disabled = false; },1000);
    }
  });

  el.resetRequestForm.addEventListener("submit", async event => {
    event.preventDefault();
    const data = new FormData(el.resetRequestForm);
    setBusy(el.resetRequestForm, true);
    try {
      const result = await api("/api/auth/request-reset", {
        method: "POST",
        body: JSON.stringify({ contact: data.get("contact") })
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
          contact: data.get("contact"),
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

  el.accountButton.addEventListener("click", async () => {
    renderAccountProfile();
    el.accountDialog.showModal();
    await loadAccountExtras();
  });


  el.consentForm.addEventListener("submit", async event => {
    event.preventDefault();
    const data = new FormData(el.consentForm);
    setBusy(el.consentForm,true);
    try {
      const result = await api("/api/privacy/consents",{
        method:"PATCH",
        body:JSON.stringify({
          marketingEmail:data.get("marketingEmail") === "on",
          marketingWhatsapp:data.get("marketingWhatsapp") === "on",
          marketingPhone:data.get("marketingPhone") === "on"
        })
      });
      setUser(result.user);
      formStatus(el.consentForm,"Preferenze aggiornate.","success");
    } catch (error) {
      formStatus(el.consentForm,error.message,"error");
    } finally {
      setBusy(el.consentForm,false);
    }
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

  el.startCertification.addEventListener("click",startCertificationAssessment);
  el.certificationBack.addEventListener("click",closeCertificationView);

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
      const privacyModule = el.registerForm.querySelector(".privacy-module");
      if (privacyModule) {
        privacyModule.hidden = true;
        privacyModule.querySelectorAll("input,select").forEach(node => { node.disabled = true; });
      }
      el.registerForm.elements.email.required = true;
    }
    if (reset) {
      el.loginForm.hidden = true;
      el.registerForm.hidden = true;
      el.resetRequestForm.hidden = true;
      el.resetCompleteForm.hidden = false;
      [el.loginTab, el.registerTab, el.resetTab].forEach(b => b.classList.remove("auth-tab--active"));
      el.resetTab.classList.add("auth-tab--active");
      el.resetCompleteForm.elements.resetToken.value = reset;
      if (email) el.resetCompleteForm.elements.contact.value = email;
    }
    if (invite || reset) {
      const clean = new URL(window.location.href);
      clean.search = "";
      history.replaceState({}, "", clean.pathname + clean.hash);
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
