(() => {
  const cfg = window.XINZUO_ACADEMY_CONFIG || {};
  const values = {
    controllerName: String(cfg.privacyControllerName || "").trim(),
    controllerAddress: String(cfg.privacyControllerAddress || "").trim(),
    controllerVat: String(cfg.privacyControllerVat || "").trim(),
    contactName: String(cfg.privacyContactName || "").trim(),
    contactEmail: String(cfg.privacyContactEmail || "").trim()
  };

  document.querySelectorAll("[data-controller-name]").forEach(node => {
    node.textContent = values.controllerName || "da configurare";
  });
  document.querySelectorAll("[data-controller-address]").forEach(node => {
    node.textContent = values.controllerAddress || "da configurare";
  });
  document.querySelectorAll("[data-controller-vat]").forEach(node => {
    node.textContent = values.controllerVat || "da configurare";
  });
  document.querySelectorAll("[data-contact-name]").forEach(node => {
    node.textContent = values.contactName || "da configurare";
  });
  document.querySelectorAll("[data-controller-email]").forEach(node => {
    node.textContent = values.contactEmail || "da configurare";
    node.setAttribute("href", values.contactEmail ? "mailto:" + values.contactEmail : "#");
  });

  const warning = document.getElementById("legalConfigWarning");
  if (warning) {
    warning.hidden = Boolean(
      values.controllerName &&
      values.controllerAddress &&
      values.controllerVat &&
      values.contactName &&
      values.contactEmail
    );
  }
})();
