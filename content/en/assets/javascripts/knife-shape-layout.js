(() => {
  const MASTER_INDEX_NAME = "master-knife-shape-index.svg";

  const PROFILE_REPLACEMENTS = [
    {
      match: "/knife-shapes/carving.jpg",
      src: "https://xinzuocutlery.com/cdn/shop/files/1_84254a19-a07d-4e20-be9f-43da4038d4a9.jpg?v=1700209806&width=720",
      alt: "Complete Xinzuo Jiang Series carving knife used as a classic carving-profile example",
      caption: "A complete current Xinzuo carving-knife example, showing the long, narrow profile used for controlled draw slicing."
    },
    {
      match: "/knife-shapes/ultimate-utility.jpg",
      src: "https://hezhencutlery.com/cdn/shop/files/c5e45503ddaaf7196b9d40ce3b25af79_2529d926-c834-43f8-9408-bf39b673e537.jpg?v=1778808662",
      alt: "Complete HEZHEN X02-FQ six-inch scalloped tomato and utility knife from Xinzuo's portfolio",
      caption: "A complete X02-FQ scalloped utility profile from the Xinzuo/HEZHEN portfolio; the catalog identifies this form as an Ultimate Utility Knife."
    }
  ];

  function pageKey() {
    const parts = location.pathname.split("/").filter(Boolean);
    const repo = parts.indexOf("xinzuo-kung-fu");
    if (repo < 0) return "";
    return parts.slice(repo + 2).join("/") || "index";
  }

  function replaceMalformedProfileSources(article) {
    if (pageKey() !== "05-knife-types/overview") return;

    PROFILE_REPLACEMENTS.forEach((replacement) => {
      const image = [...article.querySelectorAll(".kb-profile-visual img")].find((candidate) =>
        (candidate.getAttribute("src") || "").includes(replacement.match)
      );
      if (!image || image.dataset.kbProfileReplacement === "done") return;

      image.src = replacement.src;
      image.alt = replacement.alt;
      image.loading = "eager";
      image.removeAttribute("srcset");
      image.dataset.kbProfileReplacement = "done";

      const caption = image.closest("figure")?.querySelector("figcaption");
      if (caption) caption.textContent = replacement.caption;
    });
  }

  function makeHalf(sourceImage, side) {
    const figure = document.createElement("figure");
    figure.className = "kb-shape-index-split__figure";

    const viewport = document.createElement("div");
    viewport.className = `kb-shape-index-split__viewport kb-shape-index-split__viewport--${side}`;

    const image = sourceImage.cloneNode(true);
    image.removeAttribute("width");
    image.removeAttribute("height");
    image.alt = side === "left"
      ? "Left half of the Xinzuo catalog Knife Blade Shapes reference, enlarged for legibility"
      : "Right half of the Xinzuo catalog Knife Blade Shapes reference, enlarged for legibility";

    const caption = document.createElement("figcaption");
    caption.textContent = side === "left"
      ? "Xinzuo catalog Knife Blade Shapes - left column, enlarged."
      : "Xinzuo catalog Knife Blade Shapes - right column, enlarged.";

    viewport.appendChild(image);
    figure.append(viewport, caption);
    return figure;
  }

  function splitMasterIndex(article) {
    if (pageKey() !== "05-knife-types/overview") return;

    const source = [...article.querySelectorAll("img")].find((image) =>
      (image.getAttribute("src") || "").includes(MASTER_INDEX_NAME)
    );
    if (!source) return;

    const originalFigure = source.closest("figure");
    if (!originalFigure || originalFigure.dataset.kbShapeIndexSplit === "done") return;
    if (originalFigure.parentElement?.classList.contains("kb-shape-index-split")) return;

    const wrapper = document.createElement("div");
    wrapper.className = "kb-shape-index-split";
    wrapper.dataset.kbShapeIndexSplit = "done";
    wrapper.setAttribute("role", "group");
    wrapper.setAttribute("aria-label", "Xinzuo catalog Knife Blade Shapes reference shown as two enlarged vertical halves");

    wrapper.append(makeHalf(source, "left"), makeHalf(source, "right"));
    originalFigure.replaceWith(wrapper);
  }

  function renderKnifeShapeLayout() {
    const article = document.querySelector("article.md-content__inner");
    if (!article) return;
    replaceMalformedProfileSources(article);
    splitMasterIndex(article);
  }

  document.addEventListener("DOMContentLoaded", renderKnifeShapeLayout);
  if (window.document$?.subscribe) window.document$.subscribe(renderKnifeShapeLayout);
})();
