(() => {
  const MASTER_INDEX_NAME = "master-knife-shape-index.svg";

  /*
   * Some catalog crops are so tight to the product boundary that, once
   * reduced for print, a complete knife can still read as if its blade were
   * truncated. For the forms below use complete product photographs with
   * generous surrounding space. These are examples of the form, not
   * definitions of every model sold under the category name.
   */
  const PROFILE_REPLACEMENTS = [
    {
      match: "/knife-shapes/bunka.jpg",
      src: "https://xinzuo.com.au/cdn/shop/files/83-bunka-knife-zhen-series-x05z-5419220.jpg?v=1765683912&width=1024",
      alt: "Complete Xinzuo Zhen X05Z bunka knife with the full K-tip and handle visible",
      caption: "Xinzuo Zhen X05Z Bunka Knife, shown complete so the low angular K-tip and full blade profile are easy to read.",
      squareSource: true
    },
    {
      match: "/knife-shapes/granton-chef.jpg",
      src: "https://xinzuo.com.au/cdn/shop/files/X02-RSCS-t.png?v=1777419899&width=800",
      alt: "Complete Xinzuo Granton-edge chef knife with the whole blade and handle visible",
      caption: "A complete Xinzuo Granton-edge chef knife, with the hollows and full curved profile clearly visible.",
      squareSource: true
    },
    {
      match: "/knife-shapes/nakiri.jpg",
      src: "https://xinzuo.com.au/cdn/shop/files/73-nakiri-knife-yu-series-b13r-2977756.jpg?v=1765683923&width=1024",
      alt: "Complete Xinzuo Yu Series B13R nakiri knife with full blade and handle visible",
      caption: "Xinzuo Yu Series B13R Nakiri, shown complete so the straight edge and front geometry are easy to distinguish.",
      squareSource: true
    },
    {
      match: "/knife-shapes/carving.jpg",
      src: "https://images-knifestock-cdn.rshop.sk/default/products/9d9e1bcebeec3ebac17225974a360fca.png",
      alt: "Complete Xinzuo Jiang B46W ten-inch carving knife with the whole long narrow blade visible",
      caption: "Xinzuo Jiang B46W 10-inch carving knife, used as a clear example of the classic long, narrow carving profile.",
      squareSource: true
    },
    {
      match: "/knife-shapes/roast-carving.jpg",
      src: "https://sharpedgenation.ae/cdn/shop/files/B37sCarvingmain.webp?v=1717152749&width=416",
      alt: "Xinzuo Lan Series B37S-10QR roast carving knife shown complete",
      caption: "Xinzuo Lan Series B37S-10QR, used here as the roast-carving example; its long blade and pronounced upward sweep are fully visible.",
      squareSource: true
    },
    {
      match: "/knife-shapes/granton-carving.jpg",
      src: "https://www.semiblack.sg/cdn/shop/products/78db7c484e00c3b8d2fca663eedd0563.jpg?v=1704191052",
      alt: "Complete Xinzuo Granton-edge slicing and carving knife with the whole blade visible",
      caption: "A complete Xinzuo Granton-edge slicing and carving knife, shown as a single uninterrupted profile so the long blade and hollows are easy to read.",
      squareSource: true
    },
    {
      match: "/knife-shapes/ham.jpg",
      src: "https://images-knifestock-cdn.rshop.sk/default/products/746838a2f66ed756ce82db160d2e1422.png",
      alt: "Complete Xinzuo B35 ten-inch ham knife with the entire long narrow blade visible",
      caption: "Xinzuo B35 10-inch ham knife, shown complete to make its extra-long, narrow slicing profile clear.",
      squareSource: true
    },
    {
      match: "xinzuo-europe.com/wp-content/uploads/2023/08/2-52.jpeg",
      src: "../../assets/images/approved/knife-shapes/boning.jpg",
      alt: "Complete Xinzuo Western boning knife with the whole blade and handle visible",
      caption: "A complete Xinzuo Western boning-knife profile, shown without an ambient food background so its narrow blade and pointed front are easy to read."
    }
  ];

  /*
   * Source photographs come from different catalog generations and were
   * photographed in several directions. The book's primary visual rule is
   * now anatomical rather than left/right: the spine must read above the
   * cutting edge, so the cutting edge is always presented downward. Handle
   * direction is secondary. Rotation is allowed; mirroring is not, because
   * it can reverse logos, grind handedness and other asymmetric details.
   *
   * Images that previously used 180 degrees only to force the handle left are
   * therefore returned to 0 degrees. Diagonal square-source photographs that
   * previously used -135 degrees are rotated to 45 degrees instead: the same
   * long-axis correction, but with the edge on the lower side.
   */
  const PROFILE_PRESENTATION = [
    { test: /western chef's knife|western chef knife/i, rotate: 0 },
    { test: /gyuto/i, rotate: 45, squareSource: true },
    { test: /santoku/i, rotate: 0 },
    { test: /bunka/i, rotate: 45, squareSource: true },
    { test: /nakiri/i, rotate: 45, squareSource: true },
    { test: /chinese cleaver/i, rotate: 0 },
    { test: /bone chopper/i, rotate: 0 },
    { test: /classic carving|jiang b46w/i, rotate: 45, squareSource: true },
    { test: /roast carving|roast-carving|b37s-10qr/i, rotate: 45, squareSource: true },
    { test: /ham knife|b35 ten-inch ham/i, rotate: 45, squareSource: true },
    { test: /sashimi/i, rotate: 0 },
    { test: /sakimaru/i, rotate: 0 },
    { test: /kiritsuke/i, rotate: 0 },
    { test: /western boning/i, rotate: 0 },
    { test: /honesuki/i, rotate: 0 },
    { test: /fillet knife/i, rotate: 0 },
    { test: /deba/i, rotate: 0 },
    { test: /utility knife/i, rotate: 0 },
    { test: /curved paring/i, rotate: 0 },
    { test: /straight paring/i, rotate: 0 },
    { test: /steak knife/i, rotate: 0 },
    { test: /cheese knife/i, rotate: 0 },
    { test: /bread knife/i, rotate: 0 },
    { test: /frozen-food|frozen food/i, rotate: 0 },
    { test: /viking knife/i, rotate: 0 }
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
      image.removeAttribute("width");
      image.removeAttribute("height");
      image.dataset.kbProfileReplacement = "done";
      if (replacement.squareSource) image.dataset.kbSquareSource = "true";

      const caption = image.closest("figure")?.querySelector("figcaption");
      if (caption) caption.textContent = replacement.caption;
    });
  }

  function ensureProfileStage(image) {
    if (image.parentElement?.classList.contains("kb-profile-visual__stage")) {
      return image.parentElement;
    }

    const stage = document.createElement("div");
    stage.className = "kb-profile-visual__stage";
    image.before(stage);
    stage.appendChild(image);
    return stage;
  }

  function fitRotatedImage(image, stage, rotate) {
    const fit = () => {
      const stageWidth = stage.clientWidth;
      const stageHeight = stage.clientHeight;
      const naturalWidth = image.naturalWidth;
      const naturalHeight = image.naturalHeight;
      if (!stageWidth || !stageHeight || !naturalWidth || !naturalHeight) return;

      const radians = ((rotate % 360) * Math.PI) / 180;
      const cosine = Math.abs(Math.cos(radians));
      const sine = Math.abs(Math.sin(radians));
      const rotatedWidth = naturalWidth * cosine + naturalHeight * sine;
      const rotatedHeight = naturalWidth * sine + naturalHeight * cosine;
      const scale = Math.min(
        (stageWidth * 0.90) / rotatedWidth,
        (stageHeight * 0.88) / rotatedHeight
      );

      image.style.setProperty("width", `${naturalWidth * scale}px`, "important");
      image.style.setProperty("height", `${naturalHeight * scale}px`, "important");
      image.style.setProperty("max-width", "none", "important");
      image.style.setProperty("max-height", "none", "important");
    };

    if (image.complete && image.naturalWidth) fit();
    else image.addEventListener("load", fit, { once: true });

    if (image.dataset.kbProfileResizeHook !== "done") {
      window.addEventListener("resize", fit);
      image.dataset.kbProfileResizeHook = "done";
    }
  }

  function normalizeProfilePresentation(article) {
    if (pageKey() !== "05-knife-types/overview") return;

    article.querySelectorAll(".kb-profile-visual img").forEach((image) => {
      const descriptor = `${image.alt || ""} ${image.getAttribute("src") || ""}`;
      const rule = PROFILE_PRESENTATION.find((candidate) => candidate.test.test(descriptor));
      if (!rule) return;

      const stage = ensureProfileStage(image);
      const isSquare = rule.squareSource || image.dataset.kbSquareSource === "true";
      const stageHeight = isSquare ? "82mm" : "60mm";
      const rotation = rule.rotate || 0;

      stage.classList.toggle("kb-profile-visual__stage--square-source", isSquare);
      stage.style.setProperty("position", "relative", "important");
      stage.style.setProperty("display", "flex", "important");
      stage.style.setProperty("align-items", "center", "important");
      stage.style.setProperty("justify-content", "center", "important");
      stage.style.setProperty("width", "100%", "important");
      stage.style.setProperty("height", stageHeight, "important");
      stage.style.setProperty("min-height", stageHeight, "important");
      stage.style.setProperty("padding", "3mm 4mm", "important");
      stage.style.setProperty("overflow", "visible", "important");
      stage.style.setProperty("background", "#f2f4f5", "important");
      stage.style.setProperty("isolation", "isolate", "important");

      image.classList.add("kb-profile-visual__image");
      image.classList.toggle("kb-profile-visual__image--square-source", isSquare);
      image.dataset.kbProfileOrientation = "cutting-edge-down";
      image.style.setProperty("display", "block", "important");
      image.style.setProperty("margin", "0 auto", "important");
      image.style.setProperty("object-fit", "contain", "important");
      image.style.setProperty("object-position", "center", "important");
      image.style.setProperty("transform", `rotate(${rotation}deg)`, "important");
      image.style.setProperty("transform-origin", "center center", "important");
      image.style.setProperty("background", "transparent", "important");
      image.style.setProperty("mix-blend-mode", "multiply", "important");
      image.style.setProperty("filter", "contrast(1.04)", "important");

      fitRotatedImage(image, stage, rotation);
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
    normalizeProfilePresentation(article);
    splitMasterIndex(article);
  }

  document.addEventListener("DOMContentLoaded", renderKnifeShapeLayout);
  if (window.document$?.subscribe) window.document$.subscribe(renderKnifeShapeLayout);
})();
