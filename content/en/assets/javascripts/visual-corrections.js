(() => {
  const WITHDRAWN = {
    "04-geometry-and-bevels/single-and-double-bevels": {
      remove: ["FIG-BEV-CROSS-SECTION"],
      placeholder: {
        id: "VIS-BEV-01",
        title: "Single vs Double Bevel Cross-Section",
        note: "Awaiting a verified source or corrected technical drawing. The previous generated diagram was withdrawn after review because the two cross-sections used inconsistent orientation.",
        insertAfterLeadParagraphs: 2
      }
    },
    "05-knife-types/overview": {
      remove: ["FIG-KNIFE-MOTION"],
      placeholder: {
        id: "VIS-KNIFE-01",
        title: "Knife Profiles and Cutting Motions",
        note: "Awaiting a verified profile-and-motion graphic. The previous generated silhouette overview was withdrawn because several blade profiles were not reliable enough for a technical guide.",
        insertAfterLeadParagraphs: 2
      }
    },
    "10-sharpening/the-burr": {
      remove: ["FIG-BURR-CROSS-SECTION"],
      placeholder: {
        id: "VIS-BURR-01",
        title: "How a Burr Forms",
        note: "Awaiting a verified burr cross-section. The previous generated illustration was withdrawn because its pre-apex geometry could suggest an already-complete apex.",
        insertAfterLeadParagraphs: 2
      }
    }
  };

  function pageKey() {
    const parts = location.pathname.split("/").filter(Boolean);
    const repo = parts.indexOf("xinzuo-kung-fu");
    if (repo < 0) return "";
    const relative = parts.slice(repo + 2).join("/");
    return relative || "index";
  }

  function makePlaceholder(item) {
    const figure = document.createElement("figure");
    figure.className = "kb-image-placeholder-wrap kb-review-withdrawn-placeholder";
    figure.dataset.placeholderId = item.id;

    const box = document.createElement("div");
    box.className = "kb-image-placeholder";
    box.setAttribute("role", "img");
    box.setAttribute("aria-label", `Image placeholder: ${item.title}`);

    const label = document.createElement("div");
    label.className = "kb-image-placeholder__label";
    label.textContent = "IMAGE PLACEHOLDER";

    const title = document.createElement("div");
    title.className = "kb-image-placeholder__title";
    title.textContent = item.title;

    const note = document.createElement("div");
    note.className = "kb-image-placeholder__note";
    note.textContent = item.note;

    const caption = document.createElement("figcaption");
    caption.textContent = `${item.id} - previous generated visual withdrawn pending a verified replacement.`;

    box.append(label, title, note);
    figure.append(box, caption);
    return figure;
  }

  function insertAfterLead(article, placeholder, paragraphCount) {
    const h1 = article.querySelector("h1");
    if (!h1) return;
    const paragraphs = [];
    let node = h1.nextElementSibling;
    while (node && paragraphs.length < paragraphCount) {
      if (node.tagName === "P" || node.tagName === "BLOCKQUOTE") paragraphs.push(node);
      node = node.nextElementSibling;
    }
    const anchor = paragraphs.at(-1) || h1;
    anchor.insertAdjacentElement("afterend", placeholder);
  }

  function withdrawGeneratedFigures(article, key) {
    const plan = WITHDRAWN[key];
    if (!plan) return;

    plan.remove.forEach((id) => {
      article.querySelectorAll(`[data-visual-id="${id}"]`).forEach((figure) => figure.remove());
    });

    const item = plan.placeholder;
    if (!article.querySelector(`[data-placeholder-id="${item.id}"]`)) {
      insertAfterLead(article, makePlaceholder(item), item.insertAfterLeadParagraphs || 1);
    }
  }

  function correctFiveDimensions(article) {
    const figure = article.querySelector('[data-visual-id="FIG-STEEL-DIMENSIONS"]');
    if (!figure) return;
    const caption = figure.querySelector("figcaption");
    if (caption) {
      caption.textContent = "The five axes define a comparison framework only. No steel score is plotted unless every axis is supported by a consistent test method.";
    }
  }

  function correctBevelFamilies(article) {
    const figure = article.querySelector('[data-visual-id="VIS-BEV-02"]');
    if (!figure) return;

    const image = figure.querySelector("img");
    const caption = figure.querySelector("figcaption");
    const note = figure.querySelector(".kb-learning-figure__note");

    if (image) {
      image.alt = "Presentation chart showing seven schematic grind and bevel cross-sections: V, convex, asymmetric V, compound double V, concave, single-sided, and single-sided with urasuki.";
    }
    if (caption) {
      caption.textContent = "Selected grind and bevel cross-section geometries from the training presentation. They illustrate different ways the blade can transition toward the cutting edge; they are not a universal taxonomy.";
    }
    if (note) {
      note.textContent = "Source labels remain in Italian (V, Convessa, Asimmetrica, Concava, Lato singolo, Lato singolo con Urasuki). The drawings are schematic and should not be read as equivalently scaled edge angles.";
    }
  }

  function correctAsianHandle(article) {
    const figure = article.querySelector('[data-visual-id="VIS-ANATOMY-ASIAN-01"]');
    if (!figure || figure.dataset.numberedReplacement === "true") return;

    const image = figure.querySelector("img");
    const frame = image?.parentElement;
    if (!image || !frame) return;

    // PM8O Schematics is the approved source image for this figure. Keep the
    // translatable HTML/SVG callouts from the source instead of replacing them
    // with the legacy numbered diagram.
    const sourcePath = decodeURIComponent(image.getAttribute("src") || "");
    if (sourcePath.endsWith("PM8O Schematics.png")) return;

    // Preserve the translated terms already present in the source figure before
    // removing the old callout overlay. Their order is stable across translations.
    const oldLabels = [...frame.querySelectorAll(":scope > span")].map((node) => node.textContent.trim());
    if (oldLabels.length < 11) return;

    const numberedLabels = [
      oldLabels[10],
      oldLabels[9],
      oldLabels[8],
      oldLabels[7],
      oldLabels[5],
      oldLabels[4],
      oldLabels[1],
      oldLabels[4],
      oldLabels[1],
      oldLabels[3]
    ];

    image.src = image.src.replace(/asian-handle-exploded\.jpg(?:\?.*)?$/, "../../diagrams/asian-handle-numbered.jpg");
    image.alt = numberedLabels.map((label, index) => `${index + 1}: ${label}`).join("; ");

    frame.querySelector("svg")?.remove();
    frame.querySelectorAll(":scope > span").forEach((node) => node.remove());
    frame.style.position = "static";
    frame.style.overflow = "visible";

    const legend = document.createElement("ol");
    legend.className = "kb-numbered-legend";
    legend.style.margin = ".7rem 0 .2rem 1.4rem";
    legend.style.columns = "2";
    legend.style.columnGap = "2rem";
    numberedLabels.forEach((label) => {
      const item = document.createElement("li");
      item.textContent = label;
      item.style.breakInside = "avoid";
      legend.append(item);
    });
    frame.insertAdjacentElement("afterend", legend);

    const caption = figure.querySelector("figcaption");
    if (caption) caption.remove();
    figure.dataset.numberedReplacement = "true";
  }

  function removeBunkaPackageOpening(article) {
    const headings = [...article.querySelectorAll("h2")];
    const bunkaHeading = headings[3];
    if (!bunkaHeading) return;

    let node = bunkaHeading.nextElementSibling;
    while (node && node.tagName !== "H2" && node.tagName !== "H1") {
      if (node.tagName === "UL") {
        const items = [...node.querySelectorAll(":scope > li")];
        if (items.length >= 6) items[3].remove();
        return;
      }
      node = node.nextElementSibling;
    }
  }

  function renderCorrections() {
    const article = document.querySelector("article.md-content__inner");
    if (!article) return;

    const key = pageKey();
    withdrawGeneratedFigures(article, key);
    correctAsianHandle(article);

    if (key === "01-foundations/five-dimensions-of-knife-steel") correctFiveDimensions(article);
    if (key === "04-geometry-and-bevels/single-and-double-bevels") correctBevelFamilies(article);
    if (key === "05-knife-types/overview") removeBunkaPackageOpening(article);
  }

  document.addEventListener("DOMContentLoaded", renderCorrections);
  if (window.document$?.subscribe) window.document$.subscribe(renderCorrections);
})();
