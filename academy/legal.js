(() => {
  const cfg = window.XINZUO_ACADEMY_CONFIG || {};
  const name = String(cfg.privacyControllerName || "").trim();
  const email = String(cfg.privacyContactEmail || "").trim();
  document.querySelectorAll("[data-controller-name]").forEach(node => {
    node.textContent = name || "da configurare";
  });
  document.querySelectorAll("[data-controller-email]").forEach(node => {
    node.textContent = email || "da configurare";
    node.setAttribute("href", email ? "mailto:" + email : "#");
  });
  const warning = document.getElementById("legalConfigWarning");
  if (warning) warning.hidden = Boolean(name && email);
})();
