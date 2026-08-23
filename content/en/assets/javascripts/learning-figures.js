(() => {
  // Published figures now live in the Markdown chapters so their captions are
  // translated together with the surrounding text. Keep this legacy map inert
  // until every historical entry has been removed from the file.
  const figures = false ? {
    index: [
      {
        id: "VIS-HOME-01",
        dir: "assets/images/approved/",
        file: "home-hero-xinzuo-masterpieces.svg",
        alt: "A craftsman inspecting a Xinzuo Damascus kitchen knife.",
        caption: "A kitchen knife is the result of material, process, geometry and craftsmanship working together.",
        width: 1000,
        height: 1389,
        loading: "eager",
        target: { type: "lead", index: 0 }
      },
      {
        id: "VIS-HANDLE-01",
        dir: "assets/images/approved/",
        file: "handle-material-gallery.svg",
        alt: "Catalog comparison of wood, composite, resin, carbon-fibre and G10 knife-handle materials.",
        caption: "Examples of handle materials used across Xinzuo knife series. Appearance alone does not determine ergonomics, durability or balance.",
        width: 650,
        height: 902,
        loading: "lazy",
        target: { type: "heading", level: "h2", index: 2 }
      },
      {
        id: "VIS-MAKING-01",
        dir: "assets/images/approved/",
        file: "production-process-overview.svg",
        alt: "Overview of the Xinzuo knife production process, from blade cutting to inspection and packaging.",
        caption: "The production process connects steel selection, heat treatment, grinding, finishing, sharpening, assembly and quality control.",
        note: "This shows the Xinzuo production sequence specifically. It is not evidence that every knife manufacturer follows exactly the same process.",
        width: 2000,
        height: 1389,
        loading: "lazy",
        target: { type: "heading", level: "h2", index: 2 }
      }
    ],

    "03-blade-construction/damascus-steel": [
      {
        id: "VIS-FINISH-01",
        dir: "assets/images/approved/",
        file: "pattern-gallery.svg",
        alt: "Examples of named Damascus patterns from the Xinzuo catalog.",
        caption: "Pattern names describe the visible design. They do not by themselves define steel quality, heat treatment or cutting performance.",
        width: 650,
        height: 902,
        loading: "lazy",
        target: { type: "heading", level: "h2", index: 1, position: "before" }
      }
    ],

    "03-blade-construction/self-sharpening-full-damascus": [
      {
        id: "VIS-SELF-01",
        dir: "assets/images/approved/",
        file: "damascus-structure-comparison.svg",
        alt: "Technical cross-section comparison of historic Damascus steel and modern full-Damascus steel, showing the layered structure continuing to the cutting edge.",
        caption: "In both structures, the alternating layers continue all the way to the cutting edge - the structural basis for the differential-wear mechanism described in this chapter.",
        note: "Presentation material. The specific hardness values shown describe the individual steels tested there and are not a general ranking of Damascus knives.",
        width: 1600,
        height: 405,
        loading: "lazy",
        target: { type: "lead", index: 0 }
      }
    ],

    "04-geometry-and-bevels/single-and-double-bevels": [
      {
        id: "VIS-BEV-02",
        dir: "assets/images/approved/",
        file: "bevel-families.svg",
        alt: "Presentation chart of seven blade bevel families: V, convex, asymmetric V, compound double V, concave, single-sided, and single-sided with urasuki.",
        caption: "Classic double-bevel profiles (left) and traditional Japanese single-bevel profiles (right). Bevel shape is one more variable, alongside steel and heat treatment, that shapes how a knife cuts.",
        note: "Labels are reproduced from the source presentation in Italian (“V”, “Convessa”, “Asimmetrica”, “Concava”, “Lato singolo”, “Lato singolo con Urasuki”); the chapter text explains each shape.",
        width: 1600,
        height: 800,
        loading: "lazy",
        target: { type: "heading", level: "h2", index: 1 }
      }
    ],

    "05-knife-types/overview": [
      {
        id: "VIS-KNIFE-09",
        dir: "assets/images/approved/",
        file: "master-knife-shape-index.svg",
        alt: "Catalog index showing common kitchen-knife blade shapes.",
        caption: "A visual index of common and specialist knife shapes. Profile is only the starting point: thickness, bevel geometry, weight and heat treatment also affect how a knife behaves.",
        note: "Catalog terminology is reproduced for identification. Some labels are broad or commercial categories and are explained more precisely in the accompanying text.",
        width: 1299,
        height: 902,
        loading: "lazy",
        target: { type: "heading", level: "h2", index: 0, position: "before" }
      }
    ],

    "08-use-and-safety/safe-use-and-carrying": [
      {
        id: "VIS-STORAGE-01",
        dir: "assets/images/approved/",
        file: "storage-options-gallery.svg",
        alt: "In-drawer knife trays and wall-mounted magnetic knife holders.",
        caption: "Storage should protect the edge and allow the handle to be reached without touching the blade.",
        width: 700,
        height: 902,
        loading: "lazy",
        target: { type: "heading", level: "h2", index: 11 }
      }
    ],

    "10-sharpening/whetstone-preparation": [
      {
        id: "VIS-STONE-01",
        dir: "assets/images/approved/",
        file: "stable-whetstone-setup.svg",
        alt: "A kitchen knife being sharpened on a whetstone secured in a wooden stone holder.",
        caption: "A stable holder reduces stone movement and makes angle control safer and more repeatable.",
        note: "The stone, guide and sharpening angle shown are one working example, not a mandatory setup.",
        width: 579,
        height: 780,
        loading: "lazy",
        target: { type: "heading", level: "h2", index: 3 }
      }
    ],

    "10-sharpening/basic-sharpening-process": [
      {
        id: "VIS-SHARP-08A",
        dir: "assets/images/approved/",
        file: "whetstones-and-sheaths.svg",
        alt: "Whetstones and blade sheaths from the Xinzuo catalog.",
        caption: "Sharpening stones remove steel and rebuild the bevel and apex. Preparation requirements depend on the individual stone.",
        width: 1299,
        height: 902,
        loading: "lazy",
        target: { type: "heading", level: "h2", index: 1 }
      },
      {
        id: "VIS-SHARP-08B",
        dir: "assets/images/approved/",
        file: "strops-and-honing-rods.svg",
        alt: "Leather strops and honing rods from the Xinzuo catalog.",
        caption: "Strops and honing rods perform different maintenance functions and do not automatically replace stone sharpening.",
        width: 619,
        height: 902,
        loading: "lazy",
        target: { type: "heading", level: "h2", index: 1 }
      }
    ]
  } : {};

  const placeholders = {
    index: [
      {
        id: "VIS-HOME-02",
        title: "The Knife as a System",
        note: "Original diagram: steel, heat treatment, geometry, sharpening, balance and technique.",
        target: { type: "selector", selector: "blockquote", index: 0 }
      }
    ],

    "01-foundations/five-dimensions-of-knife-steel": [
      {
        id: "VIS-STEEL-02",
        title: "Edge Rolling vs Edge Chipping",
        note: "Original microscopic-style diagram to distinguish hardness from robustness.",
        target: { type: "heading", level: "h2", index: 3 }
      },
      {
        id: "VIS-STEEL-03",
        title: "Fine vs Coarse Microstructure",
        note: "Original diagram showing grain and carbide size and distribution.",
        target: { type: "heading", level: "h2", index: 4 }
      }
    ],

    "02-steels-and-metallurgy/alloying-elements": [
      {
        id: "VIS-ALLOY-01",
        title: "Alloying Elements as a Recipe",
        note: "Original infographic for C, Cr, Mo, V, W, Co, Ni and N.",
        target: { type: "heading", level: "h2", index: 0, position: "before" }
      },
      {
        id: "VIS-ALLOY-02",
        title: "Steel Matrix and Carbides",
        note: "Original diagram: dissolved elements, matrix and hard carbide particles.",
        target: { type: "heading", level: "h2", index: 2 }
      },
      {
        id: "VIS-ALLOY-03",
        title: "From Composition to Knife Performance",
        note: "Original process map: recipe, steelmaking, heat treatment, microstructure, geometry and use.",
        target: { type: "heading", level: "h2", index: 9 }
      }
    ],

    "03-blade-construction/damascus-steel": [
      {
        id: "VIS-DAM-01",
        title: "Damascus Blade Macro",
        note: "Candidate: current Xinzuo catalog or authorized training-slide photograph.",
        target: { type: "lead", index: 0 }
      },
      {
        id: "VIS-DAM-03",
        title: "Pattern-Welding Production Sequence",
        note: "Original diagram: stack, forge weld, manipulate, grind, polish and etch.",
        target: { type: "heading", level: "h2", index: 0 }
      },
      {
        id: "VIS-DAM-02",
        title: "Damascus Cladding vs Full Damascus",
        note: "Original cross-section comparison showing which material reaches the apex.",
        target: { type: "heading", level: "h2", index: 1 }
      },
      {
        id: "VIS-DAM-04",
        title: "Layer Count and Pattern Density",
        note: "Controlled diagram with low, medium and high layer density at the same scale.",
        target: { type: "heading", level: "h2", index: 4 }
      },
      {
        id: "VIS-DAM-05",
        title: "Polished, Grooved and Hammered Surfaces",
        note: "Candidate source: authorized slide or catalog crops; no guaranteed food-release claim.",
        target: { type: "heading", level: "h2", index: 6 }
      }
    ],

    "03-blade-construction/self-sharpening-full-damascus": [
      {
        id: "VIS-SELF-02",
        title: "Why Full Damascus Matters at the Apex",
        note: "Original comparison: clad core edge versus alternating layers reaching the edge.",
        target: { type: "heading", level: "h2", index: 0 }
      },
      {
        id: "VIS-SELF-03",
        title: "Polished Smoothness vs Microscopic Bite",
        note: "Original magnified comparison of smooth and finely toothy apexes.",
        target: { type: "heading", level: "h2", index: 3 }
      }
    ],

    "04-geometry-and-bevels/single-and-double-bevels": [
      {
        id: "VIS-BEV-04",
        title: "Handedness and Opposite-Hand Compensation",
        note: "Two-panel instructional graphic using the permitted photographs as reference.",
        target: { type: "heading", level: "h2", index: 5 }
      },
      {
        id: "VIS-BEV-03",
        title: "Why a Blade Steers",
        note: "Original force-arrow diagram for symmetrical and single-bevel geometry.",
        target: { type: "heading", level: "h2", index: 6 }
      },
      {
        id: "VIS-BEV-05",
        title: "Single-Bevel Sharpening Contact Surfaces",
        note: "Original diagram: broad bevel on stone and nearly flat reverse around the urasuki.",
        target: { type: "heading", level: "h2", index: 10 }
      }
    ],

    "05-knife-types/overview": [
      {
        id: "VIS-KNIFE-02",
        title: "Gyuto vs Santoku vs Bunka",
        note: "Aligned silhouettes at the same scale, highlighting belly curve and tip shape.",
        target: { type: "heading", level: "h2", index: 3 }
      },
      {
        id: "VIS-KNIFE-03",
        title: "Nakiri vs Usuba",
        note: "Profile and bevel cross-section comparison.",
        target: { type: "heading", level: "h2", index: 6 }
      },
      {
        id: "VIS-KNIFE-14",
        title: "Chinese Slicing Knife vs Cleaver vs Bone Chopper",
        note: "Candidate source: Xinzuo catalog page 38, with a new thickness comparison.",
        target: { type: "heading", level: "h2", index: 8 }
      },
      {
        id: "VIS-KNIFE-05",
        title: "Sujihiki vs Yanagiba vs Flexible Fillet Knife",
        note: "Aligned profiles with draw-slicing and contour-work movement arrows.",
        target: { type: "heading", level: "h2", index: 11 }
      },
      {
        id: "VIS-KNIFE-11",
        title: "Carving, Ham and Granton Carving Knives",
        note: "Candidate source: isolated profiles in the 2025 Xinzuo catalog.",
        target: { type: "heading", level: "h2", index: 11 }
      },
      {
        id: "VIS-KNIFE-15",
        title: "Deba, Sashimi, Sakimaru and Kiritsuke Family",
        note: "Candidate source: Xinzuo catalog pages 35-37.",
        target: { type: "heading", level: "h2", index: 12 }
      },
      {
        id: "VIS-KNIFE-06",
        title: "Deba vs Honesuki vs Western Boning Knife",
        note: "Aligned profiles highlighting heel strength, point and flexibility.",
        target: { type: "heading", level: "h2", index: 14 }
      },
      {
        id: "VIS-KNIFE-07",
        title: "Petty vs Paring Knife",
        note: "Board-work and in-hand-work comparison.",
        target: { type: "heading", level: "h2", index: 16 }
      },
      {
        id: "VIS-KNIFE-10",
        title: "Paring, Steak, Butter and Cheese Knives",
        note: "Candidate source: product-profile crops from catalog pages 12 and 33.",
        target: { type: "heading", level: "h2", index: 17 }
      },
      {
        id: "VIS-KNIFE-08",
        title: "How Blade Profile Changes Cutting Behaviour",
        note: "Original annotated silhouette: curve, height, thickness, tip, balance and weight.",
        target: {
          type: "headingText",
          text: "How profile changes the category",
          fallback: { level: "h2", index: 18 }
        }
      }
    ],

    "08-use-and-safety/safe-use-and-carrying": [
      {
        id: "VIS-SAFE-01",
        title: "A Safe Knife Workstation",
        note: "Original staged top-down photograph or authorized stock image.",
        target: { type: "heading", level: "h2", index: 0 }
      },
      {
        id: "VIS-SAFE-02",
        title: "Pinch Grip and Claw Hand",
        note: "Two close instructional photographs with correct finger positions.",
        target: { type: "heading", level: "h2", index: 3 }
      },
      {
        id: "VIS-SAFE-03",
        title: "Suitable vs Unsuitable Cutting Boards",
        note: "Wood and suitable plastic compared with glass, ceramic, stone and metal.",
        target: { type: "heading", level: "h2", index: 5 }
      },
      {
        id: "VIS-SAFE-04",
        title: "Safe Tip-Down Carrying Position",
        note: "Original full-body safety illustration or authorized staged photograph.",
        target: { type: "heading", level: "h2", index: 9 }
      }
    ],

    "10-sharpening/whetstone-preparation": [
      {
        id: "VIS-STONE-02",
        title: "Soaking Until the Bubbles Substantially Stop",
        note: "Three-stage photograph or diagram: dry stone, active bubbles and saturation.",
        target: { type: "heading", level: "h2", index: 0 }
      },
      {
        id: "VIS-STONE-03",
        title: "Sharpening-Media Preparation Guide",
        note: "Absorbent, splash-and-go, ceramic, diamond, oil and natural stone families.",
        target: { type: "heading", level: "h2", index: 2 }
      },
      {
        id: "VIS-STONE-04",
        title: "Flat Stone vs Dished Stone",
        note: "Original side profile and pencil-grid flattening sequence.",
        target: { type: "heading", level: "h2", index: 4 }
      },
      {
        id: "VIS-STONE-05",
        title: "Slurry, Swarf and Burr Are Different",
        note: "Original comparison of residue on the stone and steel attached to the apex.",
        target: { type: "heading", level: "h2", index: 6 }
      }
    ],

    "10-sharpening/the-burr": [
      {
        id: "VIS-BURR-02",
        title: "A Continuous Burr from Heel to Tip",
        note: "Original edge map showing completed and missing areas.",
        target: { type: "heading", level: "h2", index: 3 }
      },
      {
        id: "VIS-BURR-03",
        title: "Safe Tactile Burr Inspection",
        note: "Finger moves across the edge, never along its length.",
        target: { type: "heading", level: "h2", index: 6 }
      },
      {
        id: "VIS-BURR-04",
        title: "Small Burr vs Wire Edge vs Clean Apex",
        note: "Three magnified cross-sections with their practical consequences.",
        target: { type: "heading", level: "h2", index: 8 }
      }
    ],

    "10-sharpening/basic-sharpening-process": [
      {
        id: "VIS-SHARP-01",
        title: "The Six Phases of Sharpening",
        note: "Inspect, prepare, first side, second side, refine/deburr, inspect/test/clean.",
        target: { type: "heading", level: "h2", index: 0, position: "before" }
      },
      {
        id: "VIS-SHARP-02",
        title: "Practical Grit Ladder",
        note: "Repair, general sharpening, refinement, fine finishing and specialist polishing.",
        target: { type: "heading", level: "h2", index: 3 }
      },
      {
        id: "VIS-SHARP-03",
        title: "The Marker Test: Too Low, Correct and Too High",
        note: "Three-panel original diagram showing where marker ink is removed.",
        target: { type: "heading", level: "h2", index: 5 }
      },
      {
        id: "VIS-SHARP-04",
        title: "Heel, Middle, Curve and Tip Sharpening Sequence",
        note: "Instructional sequence including the smooth handle lift toward the tip.",
        target: { type: "heading", level: "h2", index: 10 }
      },
      {
        id: "VIS-SHARP-05",
        title: "Pressure Progression",
        note: "Main sharpening, refinement and final strokes shown with decreasing force.",
        target: { type: "heading", level: "h2", index: 13 }
      },
      {
        id: "VIS-SHARP-06",
        title: "Deburring Methods",
        note: "Light alternating stone strokes, optional strop, cork or soft wood and inspection.",
        target: { type: "heading", level: "h2", index: 15 }
      },
      {
        id: "VIS-SHARP-07",
        title: "How to Test the Finished Edge",
        note: "Paper, tomato or relevant food, reflected light and final burr inspection.",
        target: { type: "heading", level: "h2", index: 17 }
      }
    ]
  };

  function pageKey() {
    const parts = location.pathname.split("/").filter(Boolean);
    const repo = parts.indexOf("xinzuo-kung-fu");
    if (repo < 0) return "";
    const relative = parts.slice(repo + 2).join("/");
    return relative || "index";
  }

  function assetRoot() {
    const parts = location.pathname.split("/").filter(Boolean);
    const repo = parts.indexOf("xinzuo-kung-fu");
    if (repo < 0 || !parts[repo + 1]) return "/xinzuo-kung-fu/en/";
    return `/${parts.slice(0, repo + 2).join("/")}/`;
  }

  function directContentChildren(article) {
    return [...article.children].filter(
      (element) =>
        !element.classList.contains("kb-learning-figure") &&
        !element.classList.contains("kb-image-placeholder-wrap")
    );
  }

  function resolveTarget(article, target) {
    if (!target) return { anchor: article.lastElementChild, position: "after" };

    if (target.type === "lead") {
      const children = directContentChildren(article);
      const h1Index = children.findIndex((element) => element.tagName === "H1");
      const anchor = children[h1Index + 1 + (target.index || 0)] || children[h1Index] || article.firstElementChild;
      return { anchor, position: target.position || "after" };
    }

    if (target.type === "selector") {
      const elements = [...article.querySelectorAll(target.selector)];
      return {
        anchor: elements[target.index || 0] || article.lastElementChild,
        position: target.position || "after"
      };
    }

    if (target.type === "headingText") {
      const wanted = target.text.toLowerCase();
      const heading = [...article.querySelectorAll("h1, h2, h3")].find((element) =>
        element.textContent.trim().toLowerCase().includes(wanted)
      );
      if (heading) return { anchor: heading, position: target.position || "after" };
      if (target.fallback) {
        const elements = [...article.querySelectorAll(target.fallback.level || "h2")];
        return {
          anchor: elements[target.fallback.index] || article.lastElementChild,
          position: target.position || "after"
        };
      }
    }

    if (target.type === "heading") {
      const elements = [...article.querySelectorAll(target.level || "h2")];
      return {
        anchor: elements[target.index] || article.lastElementChild,
        position: target.position || "after"
      };
    }

    return { anchor: article.lastElementChild, position: "after" };
  }

  function createPlaceholder(item) {
    const figure = document.createElement("figure");
    figure.className = "kb-image-placeholder-wrap";
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

    box.append(label, title);

    if (item.note) {
      const note = document.createElement("div");
      note.className = "kb-image-placeholder__note";
      note.textContent = item.note;
      box.append(note);
    }

    const caption = document.createElement("figcaption");
    caption.textContent = `${item.id} - planned visual awaiting production or image-rights approval.`;
    figure.append(box, caption);
    return figure;
  }

  function legacyAnchor(article) {
    const h1 = article.querySelector("h1");
    return h1?.nextElementSibling?.nextElementSibling || h1?.nextElementSibling || null;
  }

  function createFigure(item) {
    const figure = document.createElement("figure");
    figure.className = "kb-learning-figure";
    figure.dataset.visualId = item.id;

    const image = document.createElement("img");
    const dir = item.dir || "assets/diagrams/";
    image.src = `${assetRoot()}${dir}${item.file}`;
    image.alt = item.alt;
    image.loading = item.loading || "lazy";
    image.decoding = "async";
    if (item.width) image.width = item.width;
    if (item.height) image.height = item.height;

    const caption = document.createElement("figcaption");
    caption.textContent = item.caption;

    figure.append(image, caption);

    if (item.note) {
      const note = document.createElement("p");
      note.className = "kb-learning-figure__note";
      note.textContent = item.note;
      figure.append(note);
    }

    return figure;
  }

  function insertRelative(anchor, element, position, afterAnchors) {
    if (!anchor) return;

    if (position === "before") {
      anchor.insertAdjacentElement("beforebegin", element);
      return;
    }

    const effectiveAnchor = afterAnchors.get(anchor) || anchor;
    effectiveAnchor.insertAdjacentElement("afterend", element);
    afterAnchors.set(anchor, element);
  }

  function placeFigures(article, key) {
    const items = figures[key] || [];
    const afterAnchors = new WeakMap();

    items.forEach((item) => {
      if (article.querySelector(`[data-visual-id="${item.id}"]`)) return;

      if (!item.target) {
        const anchor = legacyAnchor(article);
        const figure = createFigure(item);
        if (anchor) anchor.insertAdjacentElement("afterend", figure);
        else article.prepend(figure);
        return;
      }

      const { anchor, position } = resolveTarget(article, item.target);
      insertRelative(anchor, createFigure(item), position, afterAnchors);
    });
  }

  function placePlaceholders(article, key) {
    const items = placeholders[key] || [];
    const afterAnchors = new WeakMap();

    items.forEach((item) => {
      if (article.querySelector(`[data-placeholder-id="${item.id}"]`)) return;
      const { anchor, position } = resolveTarget(article, item.target);
      insertRelative(anchor, createPlaceholder(item), position, afterAnchors);
    });
  }

  function renderVisualPlan() {
    const article = document.querySelector("article.md-content__inner");
    if (!article) return;
    const key = pageKey();
    placeFigures(article, key);
    placePlaceholders(article, key);
  }

  document.addEventListener("DOMContentLoaded", renderVisualPlan);
  if (window.document$?.subscribe) window.document$.subscribe(renderVisualPlan);
})();
