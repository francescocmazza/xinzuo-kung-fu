# The Gongfu of Xinzuo

Xinzuo's multilingual practical book on kitchen knives: materials, forms, techniques, sharpening, maintenance and safe use.

## Read the book

**[Open The Gongfu of Xinzuo](https://francescocmazza.github.io/xinzuo-kung-fu/)**

Direct language links:

- [English](https://francescocmazza.github.io/xinzuo-kung-fu/en/)
- [Italiano](https://francescocmazza.github.io/xinzuo-kung-fu/it/)
- [简体中文](https://francescocmazza.github.io/xinzuo-kung-fu/zh-Hans/)

**[Download the latest edition](https://github.com/francescocmazza/xinzuo-kung-fu/releases/latest)** — PDFs in all active languages plus offline HTML and Markdown, automatically rebuilt after every successful content merge and Pages deployment.

## Purpose

This is Xinzuo's official practical book. It is designed both for general readers and customers, and for internal staff training, distributor support and technically responsible product education.

The goal is to explain Xinzuo's materials, constructions and product choices within the wider world of kitchen knives, without turning useful simplifications into misleading claims.

## Website and active languages

The book is published as a searchable multilingual website with GitHub Pages.

The current active languages are:

- English (`en`) — source of truth
- Italian (`it`)
- Simplified Chinese (`zh-Hans`)

Other locale definitions remain in the repository for possible future use, but they are inactive and are not built, validated, automatically translated, exported, or published.

## English is the source of truth

The master manuscript lives under `content/en/`. Active translations are committed under `translations/it/` and `translations/zh-Hans/`.

Translations are produced with the OpenAI Responses API, not with the retired Marian/OPUS-MT system. Every translated page contains a normal `source_hash` plus invisible `tx-unit` comments that act as block-level translation memory.

An unchanged English block reuses its existing target text exactly, including later human corrections. Only new or changed English blocks are sent to GPT.

# Editing the book — normal workflow

The intended flow is:

~~~text
Edit English → PR → GPT translation → independent GPT review → translation commit in the same PR → strict validation → merge → deterministic publication
~~~

## 1. Find and edit the English page

All meaning changes begin under `content/en/`. For a routine GitHub edit, create a branch and pull request rather than committing unfinished English-only content directly to `main`.

## 2. Translation is automatic on trusted PRs

**Translate book with OpenAI** runs when English content, the glossary or translation configuration changes.

The workflow:

1. splits each page into semantic `tx-unit` blocks;
2. reuses unchanged translated units;
3. sends only changed/new units to the configured translation model;
4. supplies the complete English page and controlled technical glossary as context;
5. sends the candidate translation through a second, independent GPT technical-editor pass;
6. restores protected HTML, URLs, link destinations, code and math byte-for-byte;
7. rejects malformed placeholders, pathological repetition and implausible expansion;
8. commits the refreshed translations back into the same PR.

The default models are `gpt-6-sol` for translation and `gpt-6-astra` for review. They are configurable through repository variables.

## 3. Review the translation diff

Because translations are committed into the PR, they can be reviewed exactly like source edits. This is especially useful for specialist terminology, captions and Simplified Chinese.

The first migration from the legacy system is a full regeneration because old translation files do not contain `tx-unit` memory. Later edits are differential.

## 4. Merge only when translation checks are green

The publication workflow does **not** translate anything. It validates that every active translation is current, GPT-generated and structurally aligned with the English source. A stale or legacy translation blocks publication.

## 5. Manual translation refresh

A maintainer can run **Actions → Translate book with OpenAI** manually. Running it from `main` creates a dedicated translation branch and pull request rather than changing `main` directly.

Use **force_full** only when a deliberate full regeneration is required.

## 6. Human translation corrections

Purely linguistic improvements may be made directly inside a translated `tx-unit`. Keep the surrounding `tx-unit` comments intact. If the English block remains unchanged, that corrected wording is reused by future differential refreshes.

If the meaning is wrong, fix English first.

## 7. Adding a new article

1. Create the English `.md` file under the appropriate `content/en/` section.
2. Add it to `mkdocs.yml` when it should appear in navigation.
3. Open a PR.
4. The OpenAI translation workflow creates the active-language pages and commits them into that PR.
5. Review and merge after the multilingual checks pass.

## 8. Renaming, moving, or deleting an article

Keep the English and active translation trees aligned. For a move or rename, update navigation/internal links and move the translated files correspondingly when useful. The block-level `tx-unit` memory keeps unchanged translated units reusable.

For deletion, remove the corresponding active translation files.

## 9. Images

Content images principally belong under:

```text
content/en/assets/
```

Only original, properly licensed, or explicitly authorized images may be added. See `content/en/assets/IMAGE_RIGHTS.md`.

Never embed an `<img src="https://...">` pointing at an external website, retailer or CDN, even as a temporary measure — a product photograph found on a reseller's site is not rights-cleared just because it shows a Xinzuo product. When an approved image is not yet available, use the standard editorial image placeholder instead of a temporary external link. See the Images section of `EDITORIAL_REQUIREMENTS.md` for the full rule and the placeholder markup convention.

## 10. Local validation

Validate the differential translation engine without making an API call:

~~~bash
python scripts/test_openai_translate.py
python scripts/openai_translate.py --check-only
~~~

Strict multilingual validation remains:

~~~bash
python scripts/multilingual_site.py --require-translations
~~~

To translate locally, install `requirements-translation.txt`, set `OPENAI_API_KEY` and run:

~~~bash
python scripts/openai_translate.py
~~~

## 11. Generate PDFs

Use **Actions → Export PDF guides → Run workflow** and choose `all`, `en`, `it` or `zh-Hans`.

PDF export never translates. Non-English export fails if committed translations are stale or still use the retired translation engine.

## 12. Publishing and downloadable exports

A successful merge to `main` triggers **Publish book, PDFs and GitHub Pages**. That workflow validates the committed translations, builds every active language, exports the PDFs and packages, creates/verifies the numbered Revision release and deploys GitHub Pages.

**Export multilingual guide** likewise packages only committed, validated translations and makes no translation API call.

## OpenAI translation implementation

Translation uses `scripts/openai_translate.py` with OpenAI Structured Outputs. Protected structural literals are masked before model calls and restored afterwards. The controlled vocabulary remains in `glossaries/master-terms.yml`.

The translation workflow needs the GitHub Actions secret `OPENAI_API_KEY`. Optional repository variables are:

~~~text
OPENAI_TRANSLATION_MODEL
OPENAI_TRANSLATION_REVIEW_MODEL
~~~

Defaults are `gpt-6-sol` and `gpt-6-astra` respectively.

The legacy Marian/OPUS-MT implementation has no active workflow path and is not a fallback.

## Publishing architecture

~~~text
content/en/                               English source of truth
translations/                             Committed localized content + tx-unit memory
localization/locales.yml                  Locale configuration
glossaries/master-terms.yml               Controlled terminology
scripts/openai_translate.py               Differential GPT translation + review
scripts/test_openai_translate.py          Translation regression tests
scripts/multilingual_site.py              Hash validation and multilingual site build
.github/workflows/translate-openai.yml    Translation PR workflow
.github/workflows/pages.yml               Publication and GitHub Pages deployment
.github/workflows/export-pdf.yml          PDF export
.github/workflows/export-multilingual.yml Downloadable multilingual export
~~~

See `PUBLISHING_GUIDE.md` for the full operating model.

## Current content scope

The current book covers:

- the five main dimensions used to explain knife steel;
- alloying elements;
- monosteel, clad, Damascus, and full Damascus construction;
- the self-sharpening effect in selected full Damascus blades;
- single- and double-bevel geometry;
- major knife types and cutting styles;
- safe use and carrying;
- water-stone preparation;
- burr formation, detection, and removal;
- a practical sharpening workflow.

## Contributing

Corrections, questions, and new-topic proposals are welcome through GitHub Issues and pull requests. Read `CONTRIBUTING.md` before submitting material.

## Images and third-party material

Several images are cropped or adapted from the Xinzuo product catalog and are used with authorization from the repository owner. They remain the property of their copyright holder, are not covered by the CC BY-NC-SA 4.0 license below, and require separate authorization for commercial reuse. See `content/en/assets/IMAGE_RIGHTS.md`.

## License

Except where otherwise noted, the original written content is licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International license.

Commercial use requires separate prior written permission from the copyright holder. See `LICENSE.md`.

© 2026 Francesco Claudio Mazza
