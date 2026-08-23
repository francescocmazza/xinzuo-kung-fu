(() => {
  const MASTER_INDEX_NAME = "master-knife-shape-index.svg";

  /*
   * Some of the original catalog crops are technically complete but are so
   * tight to the crop boundary that the profile reads as truncated in the
   * book. Others were genuinely incomplete. For the rendered guide, replace
   * those specific examples with complete XINZUO product views that leave
   * visible breathing room around the whole knife.
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
      src: "https://xinzuocutlery.com/cdn/shop/files/b8421501ceee8ed8defa49d79fc692df_706e57b0-6338-4148-8af1-22a707e6175b.jpg?v=1760753576",
      alt: "Complete Xinzuo classic carving knife with a clear long narrow blade profile",
      caption: "A complete Xinzuo carving-knife example with a clear long, narrow profile for controlled draw slicing."
    },
    {
      match: "/knife-shapes/roast-carving.jpg",
      src: "https://sharpedgenation.ae/cdn/shop/files/B37sCarvingmain.webp?v=1717152749&width=416",
      alt: "Xinzuo Lan Series B37S-10QR roast carving knife shown complete",
      caption: "Xinzuo Lan Series B37S-10QR, used here as the roast-carving example; its long blade and pronounced upward sweep are fully visible."
    },
    {
      match: "/knife-shapes/granton-carving.jpg",
      src: "https://xinzuocutlery.com/cdn/shop/products/1_5_e9fa736b-34a4-4bd5-bec9-3adba062cdb5.jpg?v=1727083777",
      alt: "Complete Xinzuo Zhi Series Granton carving knife",
      caption: "A complete Xinzuo Zhi Series Granton carving knife, with the full long blade and blade-face hollows visible."
    },
    {
      match: "/knife-shapes/ham.jpg",
      src: "https://xinzuocutlery.com/cdn/shop/products/1_4.jpg?v=1657936788&width=533",
      alt: "Complete Xinzuo Zhi Series ham knife with the entire long narrow blade visible",
      caption: "A complete Xinzuo Zhi Series ham knife, shown with enough surrounding space to make its extra-long, narrow profile clear."
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
      image.removeAttribute("width");
      image.removeAttribute("height");
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
