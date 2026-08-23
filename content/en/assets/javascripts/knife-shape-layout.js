(() => {
  const MASTER_INDEX_NAME = "master-knife-shape-index.svg";

  /*
   * Several catalog crops are so tight to the product boundary that, once
   * reduced for A4, a complete knife can still read as if its blade were
   * truncated.  For the forms below use complete product photographs with
   * generous surrounding space, and deliberately render them larger than the
   * older catalog crops.  These are examples of the form, not definitions of
   * every model sold under the category name.
   */
  const PROFILE_REPLACEMENTS = [
    {
      match: "/knife-shapes/bunka.jpg",
      src: "https://xinzuo.com.au/cdn/shop/files/83-bunka-knife-zhen-series-x05z-5419220.jpg?v=1765683912&width=1024",
      alt: "Complete Xinzuo Zhen X05Z bunka knife with the full K-tip and handle visible",
      caption: "Xinzuo Zhen X05Z Bunka Knife, shown complete so the low angular K-tip and full blade profile are easy to read."
    },
    {
      match: "/knife-shapes/granton-chef.jpg",
      src: "https://xinzuo.com.au/cdn/shop/files/X02-RSCS-t.png?v=1777419899&width=800",
      alt: "Complete Xinzuo Granton-edge chef knife with the whole blade and handle visible",
      caption: "A complete Xinzuo Granton-edge chef knife, with the hollows and full curved profile clearly visible."
    },
    {
      match: "/knife-shapes/nakiri.jpg",
      src: "https://xinzuo.com.au/cdn/shop/files/73-nakiri-knife-yu-series-b13r-2977756.jpg?v=1765683923&width=1024",
      alt: "Complete Xinzuo Yu Series B13R nakiri knife with full blade and handle visible",
      caption: "Xinzuo Yu Series B13R Nakiri, shown complete so the straight edge and front geometry are easy to distinguish."
    },
    {
      match: "/knife-shapes/carving.jpg",
      src: "https://images-knifestock-cdn.rshop.sk/default/products/9d9e1bcebeec3ebac17225974a360fca.png",
      alt: "Complete Xinzuo Jiang B46W ten-inch carving knife with the whole long narrow blade visible",
      caption: "Xinzuo Jiang B46W 10-inch carving knife, used as a clear example of the classic long, narrow carving profile."
    },
    {
      match: "/knife-shapes/roast-carving.jpg",
      src: "https://sharpedgenation.ae/cdn/shop/files/B37sCarvingmain.webp?v=1717152749&width=416",
      alt: "Xinzuo Lan Series B37S-10QR roast carving knife shown complete",
      caption: "Xinzuo Lan Series B37S-10QR, used here as the roast-carving example; its long blade and pronounced upward sweep are fully visible."
    },
    {
      match: "/knife-shapes/granton-carving.jpg",
      src: "https://www.semiblack.sg/cdn/shop/products/78db7c484e00c3b8d2fca663eedd0563.jpg?v=1704191052",
      alt: "Complete Xinzuo Granton-edge slicing and carving knife with the whole blade visible",
      caption: "A complete Xinzuo Granton-edge slicing and carving knife, shown as a single uninterrupted profile so the long blade and hollows are easy to read."
    },
    {
      match: "/knife-shapes/ham.jpg",
      src: "https://images-knifestock-cdn.rshop.sk/default/products/746838a2f66ed756ce82db160d2e1422.png",
      alt: "Complete Xinzuo B35 ten-inch ham knife with the entire long narrow blade visible",
      caption: "Xinzuo B35 10-inch ham knife, shown complete to make its extra-long, narrow slicing profile clear."
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

  function enlargeReplacement(image) {
    /* Inline !important declarations survive the PDF export clone and override
     * the conservative 48 mm cap used by ordinary catalog crops.  Square
     * product photos therefore remain complete but large enough for the reader
     * to judge the shape rather than appearing as small decorative thumbnails. */
    image.style.setProperty("width", "auto", "important");
    image.style.setProperty("max-width", "94%", "important");
    image.style.setProperty("height", "auto", "important");
    image.style.setProperty("max-height", "70mm", "important");
    image.style.setProperty("object-fit", "contain", "important");
    image.style.setProperty("mix-blend-mode", "normal", "important");
    image.style.setProperty("filter", "none", "important");

    const figure = image.closest("figure");
    if (figure) {
      figure.style.setProperty("padding", "4mm", "important");
      figure.style.setProperty("min-height", "78mm", "important");
      figure.style.setProperty("justify-content", "center", "important");
    }
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
      image.removeAttribute("width");
      image.removeAttribute("height");
      image.dataset.kbProfileReplacement = "done";
      enlargeReplacement(image);

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
