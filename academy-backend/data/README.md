# Product-recognition source manifest

This bank is a separate formative staff-training batch, integrated in the existing Academy account and manager screens. It does not change certification requirements or book curriculum.

Sources supplied by the store owner on 19 October 2026:
- `2026_Xinzuo_Catalog_V10_retail_prices_corrected_v3(1).pdf`: product photographs, catalogue terminology and series specifications. `sourcePage` is the **1-based PDF page**, not the printed spread page number; `crop` is in PDF points.
- `2026 V15 Pricelist.xlsx`, sheet `Pricelist`: SKU, product-level materials, type and **column U, Retail Shop Price**. Each record retains `sourceRow`. No wholesale costs, commercial margins, customer details or inventory quantities are included. Original source files are not committed.
- `https://www.xinzuo.it/`: current storefront and series navigation checked for scope. No store promotional price is substituted for the training retail-price source.
- Existing English book, `content/en/05-knife-types/overview.md` and `content/en/08-use-and-safety/safe-use-and-carrying.md`: appropriate applications and handling. General chef labels do not override the actual blade profile.

The JSON records SHA-256 hashes for the two supplied files. Photographs are extracted source assets, not generated approximations. Catalogue images have their printed labels outside the crop and the separate PDF price-text layer removed. Other images are from column C of the supplied list.

## Coverage and reconciliation

- 64 knife series; 475 distinct models after merging the X13/XZ13, X14/XZ14 and X16/XZ16 aliases. Retained aliases do not create duplicate questions.
- 471 models usable in photo tests. B2-SG, B2-WY and B30S-CS have no source photo; B2-XC has a multi-knife source photo. All four remain visible in the administrator inventory but are excluded from random selection.
- 42 models have no positive numeric Retail Shop Price. Their price question is omitted, never silently priced at zero.
- Product-level explicit specifications are compared with catalogue series specifications. Conflicting steel designations or layer counts are recorded in `notes`; affected fields are null and are not assessed. A missing core grade is enriched from the catalogue only when construction agrees. This includes the 14Cr14V3MoNb / 14Cr14MoVNb discrepancy; do not silently treat them as proven aliases.
- Catalogue types Bunka for B27-CS and B5S-CS take precedence over the broad Chef category in V15; this is disclosed on those records.
- Retail price is always the current supplied V15 column U. Approximation means ±15% inclusive, on the specific photographed model, not an average across a series.
- Initially enabled: B13R, B35, B20, X01, B30, B30R, B37, X02O, PM8S, PM8O, X05Z, X08C, B46D, PM8B, X05C. All other series can be enabled by the existing admin account.

## Operational behaviour

An authenticated, explicitly enabled staff member starts exactly ten distinct knives, spread across enabled series, with one random knife per series before further draws. The immediately previous attempt's models are avoided where alternatives exist. If a series has only one model, repetition is unavoidable. Options are independently shuffled. Disabling a series affects future attempts; stored attempts retain their original question snapshots.

Each knife is submitted once as a group (series/type/handle/steel/layers/use/price where available), then receives corrective feedback. Keys and prices are omitted from the question API; the Worker grades and stores results in D1. These are **formative** tests, not tamper-proof examinations: the repository/catalogue is public, like the other learning sources.

The current attempt can be resumed after a reload. Starting another closes the previous attempt as partial. Attempts expire after two hours. Results show both aggregate and per-skill scores, keeping incomplete batches visibly partial. No certificate is issued by this module.

Access defaults to denied for every account, including admins taking a test. Only admins can grant or revoke access in the staff panel; revocation also blocks unfinished attempts. Existing results are retained. The panel lists every registered person with completed/started counts and a weighted score across completed sessions. Individual reports provide all-time completed-session skill scores and paginated history (50 attempts per page), including partial attempts. At least ten eligible models must be enabled to start a batch. Existing saved attempts retain their original length.

## Updating

Edit the reviewed per-product JSON, preserving stable IDs/SKUs and source references. Add an individual image and set `quizReady: true` only after verifying the model. Resolve source conflicts before restoring a null specification. Never copy EXW, supplier prices, or a whole workbook into this public repository.

Run `node academy-backend/scripts/test-catalogue.mjs` (Node 22+), the existing curriculum validator and certification-bank audit. Deploy migrations through `0006_catalogue_staff_access.sql` before the Worker. Both existing Pages publishing workflows include `catalogue.js` and all `academy/data` assets. The existing backend deployment workflow applies D1 migrations.

## Higher-resolution photograph update — 2026-10-19

394 photographs were replaced with visually reviewed native 800–1000 pixel images: 313 from the owner's Dropbox Marketing/Immagini collection, and 81 from xinzuo.it. `image-sources.json` records each source identity/URL, original-file SHA-256 and before/after dimensions. No artificial upscaling or generated knife details are used; WebP is an optimized copy of the source photograph.

Model, blade shape and handle were reviewed against the source folders and catalogue. Incorrect storefront featured images, sets, answer-revealing specification graphics and obscured handles were rejected. Existing photographs are retained where no reliably matching improvement was available. All photographed models in the 15 initially active series now have image widths of at least 800 pixels. PM8S-10QFD and PM8S-10QR retain their existing catalogue photographs; the others use reviewed native 800–1000 pixel replacements. This update does not change quiz eligibility, prices, grading or admin activation settings.

The learner photo is larger and offers an accessible enlargement dialog, native-size scrolling and fit-to-screen mode. Asset versioning also refreshes images in resumed attempts. Dropbox temporary download links and credentials are never published.
