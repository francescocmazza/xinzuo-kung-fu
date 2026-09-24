(() => {
  const cfg = window.XINZUO_ACADEMY_CONFIG || {};
  const apiBase = String(cfg.apiBase || "").replace(/\/$/,"");
  const params = new URLSearchParams(location.search);
  const code = String(params.get("code") || "").trim().toUpperCase();
  const content = document.getElementById("certificateContent");
  const printButton = document.getElementById("printCertificate");

  const esc = value => String(value ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");

  const date = ts => ts
    ? new Date(Number(ts)*1000).toLocaleDateString(document.documentElement.lang || "it",{year:"numeric",month:"long",day:"numeric"})
    : "—";

  if (!apiBase) {
    content.innerHTML = '<p class="certificate-error">Il registro certificati non è ancora collegato al backend.</p>';
    return;
  }
  if (!code) {
    content.innerHTML = '<p class="certificate-error">Codice certificato mancante.</p>';
    return;
  }

  fetch(`${apiBase}/api/certificates/verify/${encodeURIComponent(code)}`, {headers:{"Accept":"application/json"}})
    .then(async response => {
      const body = await response.json().catch(()=>({}));
      if (!response.ok) throw new Error(body.message || "Certificato non trovato.");
      return body.certificate;
    })
    .then(cert => {
      const valid = cert.status === "valid";
      const statusLabels = {
        valid:"VALIDO",
        suspended:"SOSPESO",
        revoked:"REVOCATO",
        superseded:"SOSTITUITO"
      };
      document.title = `${cert.certificateName} — Xinzuo Academy Certificate`;
      content.innerHTML = `
        <div class="certificate-status certificate-status--${esc(cert.status)}">${esc(statusLabels[cert.status] || cert.status)}</div>
        <p class="certificate-intro">Si certifica che</p>
        <h2 class="certificate-name">${esc(cert.certificateName)}</h2>
        <p class="certificate-intro">ha ottenuto il certificato</p>
        <h3 class="certificate-course">Xinzuo Academy · ${esc(cert.courseLevel)}</h3>
        <dl class="certificate-data">
          <div><dt>Data di emissione</dt><dd>${date(cert.issuedAt)}</dd></div>
          <div><dt>Versione corso</dt><dd>${esc(cert.courseVersion)}</dd></div>
          <div><dt>Assessment</dt><dd>${esc(cert.assessmentVersion || "—")}</dd></div>
          <div><dt>Punteggio</dt><dd>${cert.score == null ? "—" : Math.round(Number(cert.score)*100) + "%"}</dd></div>
        </dl>
        <div class="certificate-code">
          <span>Codice pubblico di verifica</span>
          <strong>${esc(cert.verificationCode)}</strong>
        </div>
        ${cert.publicNote ? `<p class="certificate-note">${esc(cert.publicNote)}</p>` : ""}
        ${!valid ? `<div class="certificate-warning"><strong>Questo certificato non è attualmente valido.</strong>${cert.revocationReason ? `<span>${esc(cert.revocationReason)}</span>` : ""}</div>` : ""}
        <p class="certificate-footnote">Lo stato mostrato in questa pagina è quello registrato nel sistema ufficiale Xinzuo Academy al momento della consultazione.</p>
      `;
      printButton.hidden = false;
    })
    .catch(error => {
      content.innerHTML = `<p class="certificate-error">${esc(error.message)}</p>`;
    });

  printButton.addEventListener("click",()=>window.print());
})();
