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

The repository uses **no translation API and no API credits**. GitHub only calculates which semantic `tx-unit` blocks have changed and writes them to `.translation/queue.json`. Translation is then performed in ChatGPT/Codex using the user's ChatGPT plan.

An unchanged English block reuses its existing target wording exactly, including later human corrections.

# Editing the book — normal workflow

~~~text
Edit English → PR → GitHub prepares translation queue → ChatGPT/Codex translates only changed units → commit translations → validation → merge → publication
~~~

## 1. Edit English

All meaning changes begin under `content/en/`. Use a branch/PR rather than committing unfinished English-only content directly to `main`.

## 2. GitHub prepares the translation queue

**Prepare ChatGPT translation queue** creates `.translation/queue.json` containing only missing or changed units. It includes full page context, locale guidance, relevant specialist glossary terms and protected structural placeholders.

GitHub does not translate anything and requires no model credential.

## 3. Process the queue in ChatGPT/Codex

With this repository connected, ask:

~~~text
Process the translation queue in PR #<number>. Translate and technically review
all queued units, update the translated Markdown in the PR and run the checks.
~~~

ChatGPT/Codex performs the language work using the normal ChatGPT plan allowance. No `OPENAI_API_KEY` is required.

## 4. Differential memory

Completed target blocks are stored between invisible `tx-unit` comments. When English changes later, only affected units return to the queue.

Purely linguistic human improvements can be made directly inside a translated unit; leave the surrounding `tx-unit` comments intact.

## 5. Validation

~~~bash
python scripts/test_chatgpt_translate.py
python scripts/chatgpt_translate.py --check-only
python scripts/multilingual_site.py --require-translations
~~~

Generate a queue locally:

~~~bash
python scripts/chatgpt_translate.py --prepare-queue .translation/queue.json
~~~

No API key is required.

## 6. Adding a new article

Create the English Markdown, update `mkdocs.yml` when needed and open a PR. The queue workflow will identify every active-language unit that needs translation.

## 7. Other languages

The same engine can prepare translation work for any configured locale:

~~~bash
python scripts/chatgpt_translate.py --prepare-queue .translation/queue.json --locales es fr de
~~~

Inactive locales should be reviewed before being enabled for public publication.

## 8. PDFs and publication

PDF, multilingual export and GitHub Pages workflows never translate. They only consume committed translations and fail if a translation is stale, missing, legacy or structurally inconsistent.

## Translation architecture

~~~text
content/en/                                English source of truth
translations/                              Localized content + tx-unit memory
.translation/queue.json                    Changed/missing translation work
glossaries/master-terms.yml                Controlled terminology
localization/locales.yml                   Locale guidance
scripts/chatgpt_translate.py               Queue/apply/validate; no API calls
scripts/test_chatgpt_translate.py          Regression tests
.github/workflows/translation-status.yml   Queue generation and status
.github/workflows/pages.yml                Publication and Pages
.github/workflows/export-pdf.yml           PDF export
.github/workflows/export-multilingual.yml  Multilingual export
~~~

The retired Marian/OPUS-MT system and the temporary API-based translator are not fallback paths.

See `PUBLISHING_GUIDE.md` for the full workflow.

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
