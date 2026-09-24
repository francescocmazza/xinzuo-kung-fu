(() => {
  "use strict";

  const STORAGE_KEY = "xinzuo-academy-progress-v0.1";
  const LOCALE_KEY = "xinzuo-academy-locale";
  const SUPPORTED = ["it", "en"];

  const copy = {
    it: {
      headerSubtitle: "Formazione interattiva del personale",
      language: "Lingua",
      reset: "Azzera progressi",
      resetConfirm: "Vuoi davvero azzerare tutti i progressi della Academy su questo browser?",
      heroEyebrow: "Formazione del personale Xinzuo",
      heroTitle: "Conosci il coltello. Comprendi il cliente.",
      heroText: "Un percorso pratico costruito sulla knowledge base: apprendi un concetto, rispondi, capisci gli errori e ritrovi più avanti ciò che deve essere consolidato.",
      progress: "I tuoi progressi",
      acquired: "Acquisiti",
      review: "Da rivedere",
      interactions: "Interazioni",
      curriculumEyebrow: "Percorso su tre livelli",
      curriculumTitle: "Curriculum",
      curriculumNote: "La beta rende completo il primo modulo Base. Gli altri moduli sono già mappati sulla knowledge base e verranno attivati solo quando il relativo question bank sarà pronto.",
      active: "Attivo",
      planned: "In preparazione",
      lessons: "lezioni",
      start: "Inizia",
      resume: "Riprendi",
      back: "← Curriculum",
      source: "Apri la fonte nella knowledge base",
      continue: "Continua",
      toQuestion: "Vai alla domanda",
      critical: "Conoscenza critica",
      learningQuestion: "Domanda di apprendimento",
      recoveryQuestion: "Verifica differita",
      correct: "Corretto",
      wrong: "Da rivedere",
      choose: "Seleziona una risposta prima di continuare.",
      mastery: "Stato",
      states: {
        unseen: "Non visto",
        weak: "Debole",
        nearly_acquired: "Quasi acquisito",
        acquired: "Acquisito"
      },
      miniKicker: "Mini-test informativo",
      miniIntro: "Questo risultato serve a capire che cosa consolidare. Non è l'esame certificativo finale.",
      submitMini: "Concludi il mini-test",
      answerAll: "Rispondi a tutte le domande prima di concludere.",
      miniResult: "Risultato del mini-test",
      criticalErrors: "errori su conoscenze critiche",
      score: "Punteggio",
      completed: "Modulo completato",
      completedText: "Hai completato il contenuto e il mini-test. Le verifiche differite possono riapparire più avanti finché i concetti non risultano acquisiti.",
      returnCurriculum: "Torna al curriculum",
      bookTruth: "Il Gongfu di Xinzuo resta la fonte tecnica autorevole.",
      openBook: "Apri la knowledge base",
      unavailable: "Questo modulo è già previsto nel percorso, ma non viene aperto finché contenuti e domande non hanno superato la revisione.",
      moduleProgress: "Progresso modulo"
    },
    en: {
      headerSubtitle: "Interactive staff training",
      language: "Language",
      reset: "Reset progress",
      resetConfirm: "Reset all Academy progress stored in this browser?",
      heroEyebrow: "Xinzuo staff training",
      heroTitle: "Learn the knife. Understand the customer.",
      heroText: "A practical path built on the knowledge base: learn one concept, answer, understand errors and meet weak concepts again later.",
      progress: "Your progress",
      acquired: "Acquired",
      review: "To review",
      interactions: "Interactions",
      curriculumEyebrow: "Three-level path",
      curriculumTitle: "Curriculum",
      curriculumNote: "The beta completes the first Base module. The remaining modules are already mapped to the knowledge base and unlock only when their reviewed question bank is ready.",
      active: "Active",
      planned: "Planned",
      lessons: "lessons",
      start: "Start",
      resume: "Resume",
      back: "← Curriculum",
      source: "Open source in the knowledge base",
      continue: "Continue",
      toQuestion: "Go to question",
      critical: "Critical knowledge",
      learningQuestion: "Learning question",
      recoveryQuestion: "Delayed review",
      correct: "Correct",
      wrong: "Review needed",
      choose: "Select an answer before continuing.",
      mastery: "State",
      states: {
        unseen: "Unseen",
        weak: "Weak",
        nearly_acquired: "Nearly acquired",
        acquired: "Acquired"
      },
      miniKicker: "Informational mini-test",
      miniIntro: "This result shows what to consolidate. It is not the final certification exam.",
      submitMini: "Finish mini-test",
      answerAll: "Answer every question before finishing.",
      miniResult: "Mini-test result",
      criticalErrors: "critical-knowledge errors",
      score: "Score",
      completed: "Module completed",
      completedText: "You completed the content and mini-test. Delayed reviews may still return later until concepts are acquired.",
      returnCurriculum: "Return to curriculum",
      bookTruth: "The Gongfu of Xinzuo remains the technical source of truth.",
      openBook: "Open the knowledge base",
      unavailable: "This module is already mapped in the path, but stays locked until its content and question bank pass review.",
      moduleProgress: "Module progress"
    }
  };

  let locale = pickInitialLocale();
  let course = null;
  let currentModule = null;
  let progress = loadProgress();

  const el = {
    headerSubtitle: document.getElementById("headerSubtitle"),
    languageLabel: document.getElementById("languageLabel"),
    languageSelect: document.getElementById("languageSelect"),
    resetProgress: document.getElementById("resetProgress"),
    heroEyebrow: document.getElementById("heroEyebrow"),
    heroTitle: document.getElementById("heroTitle"),
    heroText: document.getElementById("heroText"),
    progressTitle: document.getElementById("progressTitle"),
    progressPercent: document.getElementById("progressPercent"),
    progressBar: document.getElementById("progressBar"),
    masteredLabel: document.getElementById("masteredLabel"),
    masteredCount: document.getElementById("masteredCount"),
    reviewLabel: document.getElementById("reviewLabel"),
    reviewCount: document.getElementById("reviewCount"),
    interactionsLabel: document.getElementById("interactionsLabel"),
    interactionCount: document.getElementById("interactionCount"),
    curriculumEyebrow: document.getElementById("curriculumEyebrow"),
    curriculumTitle: document.getElementById("curriculumTitle"),
    curriculumNote: document.getElementById("curriculumNote"),
    levels: document.getElementById("levels"),
    homeView: document.getElementById("homeView"),
    learningView: document.getElementById("learningView"),
    backHome: document.getElementById("backHome"),
    modulePosition: document.getElementById("modulePosition"),
    moduleProgressBar: document.getElementById("moduleProgressBar"),
    learningSurface: document.getElementById("learningSurface"),
    footerText: document.getElementById("footerText"),
    bookLink: document.getElementById("bookLink")
  };

  function pickInitialLocale() {
    const saved = localStorage.getItem(LOCALE_KEY);
    if (SUPPORTED.includes(saved)) return saved;
    const browser = (navigator.language || "en").toLowerCase();
    return browser.startsWith("it") ? "it" : "en";
  }

  function freshProgress() {
    return {
      interactions: 0,
      lessons: {},
      concepts: {},
      miniTests: {},
      moduleCompleted: {}
    };
  }

  function loadProgress() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      return parsed && typeof parsed === "object" ? { ...freshProgress(), ...parsed } : freshProgress();
    } catch {
      return freshProgress();
    }
  }

  function saveProgress() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    updateProgressCard();
  }

  function t(key) {
    return copy[locale][key];
  }

  async function loadCourse(nextLocale) {
    locale = SUPPORTED.includes(nextLocale) ? nextLocale : "en";
    localStorage.setItem(LOCALE_KEY, locale);
    document.documentElement.lang = locale;
    el.languageSelect.value = locale;

    const response = await fetch(`data/course.${locale}.json`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Unable to load course data (${response.status})`);
    course = await response.json();
    applyStaticCopy();
    renderHome();
  }

  function applyStaticCopy() {
    el.headerSubtitle.textContent = t("headerSubtitle");
    el.languageLabel.textContent = t("language");
    el.resetProgress.textContent = t("reset");
    el.heroEyebrow.textContent = t("heroEyebrow");
    el.heroTitle.textContent = t("heroTitle");
    el.heroText.textContent = t("heroText");
    el.progressTitle.textContent = t("progress");
    el.masteredLabel.textContent = t("acquired");
    el.reviewLabel.textContent = t("review");
    el.interactionsLabel.textContent = t("interactions");
    el.curriculumEyebrow.textContent = t("curriculumEyebrow");
    el.curriculumTitle.textContent = t("curriculumTitle");
    el.curriculumNote.textContent = t("curriculumNote");
    el.backHome.textContent = t("back");
    el.footerText.textContent = t("bookTruth");
    el.bookLink.textContent = t("openBook");
    el.bookLink.href = `../${locale}/`;
    updateProgressCard();
  }

  function activeLessons() {
    if (!course) return [];
    return course.levels.flatMap(level =>
      level.modules.filter(module => module.status === "active")
        .flatMap(module => module.lessons || [])
    );
  }

  function updateProgressCard() {
    const lessons = activeLessons();
    const completed = lessons.filter(lesson => progress.lessons[lesson.id]).length;
    const pct = lessons.length ? Math.round((completed / lessons.length) * 100) : 0;
    const concepts = Object.values(progress.concepts || {});
    const acquired = concepts.filter(c => c.state === "acquired").length;
    const toReview = concepts.filter(c => c.state === "weak" || c.state === "nearly_acquired").length;

    el.progressPercent.textContent = `${pct}%`;
    el.progressBar.style.width = `${pct}%`;
    el.masteredCount.textContent = String(acquired);
    el.reviewCount.textContent = String(toReview);
    el.interactionCount.textContent = String(progress.interactions || 0);
  }

  function renderHome() {
    currentModule = null;
    el.homeView.hidden = false;
    el.learningView.hidden = true;
    el.levels.replaceChildren();

    course.levels.forEach((level, index) => {
      const levelCard = document.createElement("article");
      levelCard.className = "level-card";

      const heading = document.createElement("div");
      heading.className = "level-card__heading";
      heading.innerHTML = `
        <div>
          <p class="eyebrow">Level ${index + 1}</p>
          <h3>${escapeHtml(level.title)}</h3>
          <p>${escapeHtml(level.purpose || "")}</p>
        </div>
        <span class="level-badge">${escapeHtml(level.title)}</span>
      `;

      const modules = document.createElement("div");
      modules.className = "modules";

      level.modules.forEach(module => {
        const active = module.status === "active";
        const card = document.createElement("div");
        card.className = "module-card";

        const lessonCount = (module.lessons || []).length;
        const completedCount = (module.lessons || []).filter(item => progress.lessons[item.id]).length;
        const moduleDone = Boolean(progress.moduleCompleted[module.id]);

        const statusLabel = active ? t("active") : t("planned");
        const actionLabel = completedCount > 0 || moduleDone ? t("resume") : t("start");

        card.innerHTML = `
          <div class="module-meta">
            <span class="module-status ${active ? "module-status--active" : ""}">${escapeHtml(statusLabel)}</span>
            <span>${active ? `${completedCount}/${lessonCount} ${escapeHtml(t("lessons"))}` : ""}</span>
          </div>
          <h4>${escapeHtml(module.title)}</h4>
          <p>${escapeHtml(module.summary || t("unavailable"))}</p>
        `;

        const button = document.createElement("button");
        button.type = "button";
        button.className = active ? "button" : "button button--quiet";
        button.textContent = active ? actionLabel : statusLabel;
        button.disabled = !active;
        if (active) button.addEventListener("click", () => openModule(module.id));
        card.appendChild(button);
        modules.appendChild(card);
      });

      levelCard.append(heading, modules);
      el.levels.appendChild(levelCard);
    });

    updateProgressCard();
  }

  function findModule(moduleId) {
    for (const level of course.levels) {
      const module = level.modules.find(item => item.id === moduleId);
      if (module) return { level, module };
    }
    return null;
  }

  function openModule(moduleId) {
    const found = findModule(moduleId);
    if (!found || found.module.status !== "active") return;
    currentModule = found.module;
    el.homeView.hidden = true;
    el.learningView.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
    advanceModule();
  }

  function sourceHref(sourcePath) {
    const page = sourcePath.replace(/\.md$/, "/");
    return `../${locale}/${page}`;
  }

  function getConcept(conceptId) {
    if (!progress.concepts[conceptId]) {
      progress.concepts[conceptId] = {
        state: "unseen",
        attempts: 0,
        correct: 0,
        due: null,
        reviewIndex: 0
      };
    }
    return progress.concepts[conceptId];
  }

  function stableDelay(conceptId, min, max, salt = 0) {
    let hash = salt;
    for (let i = 0; i < conceptId.length; i += 1) {
      hash = ((hash << 5) - hash + conceptId.charCodeAt(i)) | 0;
    }
    const range = max - min + 1;
    return min + (Math.abs(hash) % range);
  }

  function applyConceptAnswer(conceptId, isCorrect, mode) {
    const concept = getConcept(conceptId);
    concept.attempts += 1;
    if (isCorrect) concept.correct += 1;

    if (!isCorrect) {
      concept.state = "weak";
      concept.due = progress.interactions + stableDelay(conceptId, 4, 8, concept.attempts);
      return;
    }

    if (concept.state === "nearly_acquired" && mode !== "learning") {
      concept.state = "acquired";
      concept.due = null;
      return;
    }

    if (concept.state === "weak" || concept.state === "unseen") {
      concept.state = "nearly_acquired";
      concept.due = progress.interactions + stableDelay(conceptId, 8, 12, concept.attempts);
      return;
    }

    if (concept.state === "nearly_acquired") {
      concept.state = "acquired";
      concept.due = null;
    }
  }

  function updateModulePosition() {
    const lessons = currentModule?.lessons || [];
    const completed = lessons.filter(item => progress.lessons[item.id]).length;
    const pct = lessons.length ? Math.round((completed / lessons.length) * 100) : 0;
    el.modulePosition.textContent = `${currentModule.title} · ${t("moduleProgress")} ${completed}/${lessons.length}`;
    el.moduleProgressBar.style.width = `${pct}%`;
  }

  function allActiveModuleLessons() {
    if (!course) return [];
    return course.levels.flatMap(level =>
      level.modules
        .filter(module => module.status === "active")
        .flatMap(module => (module.lessons || []).map(lesson => ({ module, lesson })))
    );
  }

  function dueReview() {
    const due = allActiveModuleLessons()
      .map(item => ({
        ...item,
        concept: progress.concepts[item.lesson.concept_id]
      }))
      .filter(item =>
        item.concept &&
        Number.isFinite(item.concept.due) &&
        item.concept.due <= progress.interactions &&
        item.concept.state !== "acquired"
      )
      .sort((a, b) => a.concept.due - b.concept.due);
    return due[0] || null;
  }

  function advanceModule() {
    updateModulePosition();

    const review = dueReview();
    if (review) {
      renderRecovery(review.lesson, review.module);
      return;
    }

    const nextLesson = (currentModule.lessons || []).find(lesson => !progress.lessons[lesson.id]);
    if (nextLesson) {
      renderLesson(nextLesson);
      return;
    }

    if (!progress.miniTests[currentModule.mini_test.id]) {
      renderMiniTest(currentModule.mini_test);
      return;
    }

    renderModuleComplete();
  }

  function renderLesson(lesson) {
    updateModulePosition();
    el.learningSurface.innerHTML = `
      <div class="lesson-kicker">
        <span>${escapeHtml(currentModule.title)}</span>
        ${lesson.critical ? `<span class="critical-flag">${escapeHtml(t("critical"))}</span>` : ""}
      </div>
      <h2>${escapeHtml(lesson.title)}</h2>
      <p class="lead">${escapeHtml(lesson.content.lead)}</p>
      <ul class="learning-points">
        ${lesson.content.points.map(point => `<li>${escapeHtml(point)}</li>`).join("")}
      </ul>
      <div class="takeaway">${escapeHtml(lesson.content.takeaway)}</div>
      ${masteryHtml(lesson.concept_id)}
      <div class="source-row">
        <a href="${sourceHref(lesson.source_path)}" target="_blank" rel="noopener">${escapeHtml(t("source"))}</a>
        <button id="lessonNext" class="button" type="button">${escapeHtml(t("toQuestion"))}</button>
      </div>
    `;
    document.getElementById("lessonNext").addEventListener("click", () => renderQuestion(lesson.question, lesson, "learning", currentModule));
  }

  function renderRecovery(lesson, sourceModule) {
    const concept = getConcept(lesson.concept_id);
    const variants = lesson.recovery_questions || [];
    const index = variants.length ? concept.reviewIndex % variants.length : 0;
    concept.reviewIndex += 1;
    saveProgress();
    const question = variants[index];
    renderQuestion(question, lesson, "recovery", sourceModule);
  }

  function renderQuestion(question, lesson, mode, sourceModule) {
    updateModulePosition();
    const kicker = mode === "recovery" ? t("recoveryQuestion") : t("learningQuestion");
    const contextLabel = mode === "recovery" ? `${kicker} · ${sourceModule.title}` : kicker;
    const form = document.createElement("form");
    form.className = "question-form";
    form.innerHTML = `
      <div class="lesson-kicker">
        <span>${escapeHtml(contextLabel)}</span>
        ${lesson.critical ? `<span class="critical-flag">${escapeHtml(t("critical"))}</span>` : ""}
      </div>
      <h2>${escapeHtml(lesson.title)}</h2>
      <fieldset>
        <legend>${escapeHtml(question.prompt)}</legend>
        ${question.options.map(option => `
          <label class="option">
            <input type="radio" name="answer" value="${escapeHtml(option.id)}">
            <span>${escapeHtml(option.text)}</span>
          </label>
        `).join("")}
      </fieldset>
      <p id="formMessage" class="planned-note" role="alert"></p>
      <div class="learning-actions">
        <button class="button" type="submit">${escapeHtml(t("continue"))}</button>
      </div>
    `;

    el.learningSurface.replaceChildren(form);

    form.addEventListener("submit", event => {
      event.preventDefault();
      const selected = form.querySelector('input[name="answer"]:checked');
      const message = form.querySelector("#formMessage");
      if (!selected) {
        message.textContent = t("choose");
        return;
      }

      const isCorrect = selected.value === question.correct;
      progress.interactions += 1;
      applyConceptAnswer(lesson.concept_id, isCorrect, mode);
      if (mode === "learning") progress.lessons[lesson.id] = true;
      saveProgress();

      form.querySelectorAll("input").forEach(input => { input.disabled = true; });
      form.querySelector('button[type="submit"]').remove();

      const feedback = document.createElement("div");
      feedback.className = `feedback ${isCorrect ? "feedback--correct" : "feedback--wrong"}`;
      feedback.innerHTML = `
        <strong>${escapeHtml(isCorrect ? t("correct") : t("wrong"))}</strong>
        <span>${escapeHtml(question.explanation)}</span>
        ${masteryHtml(lesson.concept_id)}
      `;
      form.appendChild(feedback);

      const actions = document.createElement("div");
      actions.className = "learning-actions";
      const next = document.createElement("button");
      next.type = "button";
      next.className = "button";
      next.textContent = t("continue");
      next.addEventListener("click", advanceModule);
      actions.appendChild(next);
      form.appendChild(actions);
    });
  }

  function masteryHtml(conceptId) {
    const concept = progress.concepts[conceptId] || { state: "unseen" };
    const label = copy[locale].states[concept.state] || concept.state;
    return `
      <div class="mastery-strip">
        <span class="mastery-pill mastery-pill--${escapeHtml(concept.state)}">${escapeHtml(t("mastery"))}: ${escapeHtml(label)}</span>
      </div>
    `;
  }

  function renderMiniTest(test) {
    updateModulePosition();
    const form = document.createElement("form");
    form.className = "question-form";
    form.innerHTML = `
      <div class="lesson-kicker"><span>${escapeHtml(t("miniKicker"))}</span></div>
      <h2>${escapeHtml(test.title)}</h2>
      <p class="lead">${escapeHtml(t("miniIntro"))}</p>
      <div class="mini-grid">
        ${test.questions.map((question, index) => `
          <fieldset class="mini-question">
            <legend>${index + 1}. ${escapeHtml(question.prompt)}</legend>
            ${question.options.map(option => `
              <label class="option">
                <input type="radio" name="${escapeHtml(question.id)}" value="${escapeHtml(option.id)}">
                <span>${escapeHtml(option.text)}</span>
              </label>
            `).join("")}
          </fieldset>
        `).join("")}
      </div>
      <p id="miniMessage" class="planned-note" role="alert"></p>
      <div class="learning-actions">
        <button class="button" type="submit">${escapeHtml(t("submitMini"))}</button>
      </div>
    `;

    el.learningSurface.replaceChildren(form);

    form.addEventListener("submit", event => {
      event.preventDefault();
      const answers = {};
      for (const question of test.questions) {
        const selected = form.querySelector(`input[name="${cssEscape(question.id)}"]:checked`);
        if (!selected) {
          form.querySelector("#miniMessage").textContent = t("answerAll");
          return;
        }
        answers[question.id] = selected.value;
      }

      let correct = 0;
      let criticalErrors = 0;
      progress.interactions += test.questions.length;

      test.questions.forEach(question => {
        const isCorrect = answers[question.id] === question.correct;
        if (isCorrect) correct += 1;
        if (!isCorrect && question.critical) criticalErrors += 1;
        applyConceptAnswer(question.concept_id, isCorrect, "mini_test");
      });

      const score = correct / test.questions.length;
      progress.miniTests[test.id] = {
        score,
        correct,
        total: test.questions.length,
        criticalErrors,
        completedAt: new Date().toISOString()
      };
      progress.moduleCompleted[currentModule.id] = true;
      saveProgress();
      renderMiniTestResult(test, progress.miniTests[test.id]);
    });
  }

  function renderMiniTestResult(test, result) {
    updateModulePosition();
    const pct = Math.round(result.score * 100);
    el.learningSurface.innerHTML = `
      <div class="lesson-kicker"><span>${escapeHtml(t("miniResult"))}</span></div>
      <h2>${escapeHtml(test.title)}</h2>
      <div class="result-score">
        <strong>${pct}%</strong>
        <div>
          <b>${escapeHtml(t("score"))}: ${result.correct}/${result.total}</b><br>
          <span>${result.criticalErrors} ${escapeHtml(t("criticalErrors"))}</span>
        </div>
      </div>
      <p>${escapeHtml(t("miniIntro"))}</p>
      <div class="learning-actions">
        <button id="afterMini" class="button" type="button">${escapeHtml(t("continue"))}</button>
      </div>
    `;
    document.getElementById("afterMini").addEventListener("click", advanceModule);
  }

  function renderModuleComplete() {
    updateModulePosition();
    el.learningSurface.innerHTML = `
      <div class="lesson-kicker"><span>${escapeHtml(currentModule.title)}</span></div>
      <h2>${escapeHtml(t("completed"))}</h2>
      <p class="lead">${escapeHtml(t("completedText"))}</p>
      <div class="learning-actions">
        <button id="completeHome" class="button" type="button">${escapeHtml(t("returnCurriculum"))}</button>
      </div>
    `;
    document.getElementById("completeHome").addEventListener("click", renderHome);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(value);
    return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
  }

  el.languageSelect.addEventListener("change", async event => {
    try {
      await loadCourse(event.target.value);
    } catch (error) {
      el.learningSurface.textContent = String(error);
    }
  });

  el.resetProgress.addEventListener("click", () => {
    if (!window.confirm(t("resetConfirm"))) return;
    progress = freshProgress();
    saveProgress();
    renderHome();
  });

  el.backHome.addEventListener("click", renderHome);

  loadCourse(locale).catch(error => {
    el.homeView.innerHTML = `<p role="alert">${escapeHtml(String(error))}</p>`;
  });
})();
