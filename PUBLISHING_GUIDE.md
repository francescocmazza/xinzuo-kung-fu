# Publishing and translating the multilingual guide

English under `content/en/` is the only source of truth. Active translations live under `translations/<locale>/` and are committed to Git so they can be reviewed exactly like any other book change.

## Current active languages

The current publication scope is:

- English (`en`) — source of truth
- Italian (`it`)
- Simplified Chinese (`zh-Hans`)

Other locales remain configured but inactive until their terminology and review policy are ready.

## Core rule: no translation API and no API credits

The repository never calls the OpenAI API or any other paid translation API.

GitHub performs only deterministic work:

1. split English Markdown into semantic translation units;
2. compare those units with committed translation memory;
3. create `.translation/queue.json` containing only missing or changed units;
4. validate completed translations;
5. block publication if any active translation is stale, missing, legacy or structurally invalid.

The actual language work is performed in ChatGPT or Codex using the user's ChatGPT plan. This uses the plan's included ChatGPT/agentic allowance rather than API billing. If the included allowance is exhausted, the workflow can wait for the plan reset rather than buying API credits.

## Differential translation memory

Each translated semantic block is wrapped in invisible HTML comments:

~~~text
<!-- tx-unit:<hash> -->
translated text
<!-- /tx-unit -->
~~~

The key depends on:

- the English block;
- the target locale;
- the translation prompt revision;
- the locale-specific writing guidance;
- only the controlled glossary terms relevant to that block.

An unchanged English block therefore reuses its existing translated text exactly, including later human edits. A change to one paragraph does not force the rest of the page or book to be translated again.

The first migration from the retired translation system is necessarily a full regeneration because the legacy files have no `tx-unit` memory.

## Translation queue

The workflow **Prepare ChatGPT translation queue** runs on trusted pull requests and creates:

~~~text
.translation/queue.json
~~~

The queue includes, for each affected page/language:

- target locale and language;
- full English page context;
- target-language editorial guidance;
- only the units that actually need translation;
- protected placeholder tokens;
- only the glossary entries relevant to each unit;
- the deterministic unit key that must be returned with the translated text.

The queue is also uploaded as a GitHub Actions artifact.

## How translation is performed

A ChatGPT/Codex translation session reads the queue and produces publication-quality target text.

For each queued unit it should:

- preserve every factual distinction and degree of certainty;
- use natural native-language editorial prose rather than literal English syntax;
- respect the supplied specialist knife/metallurgy terminology;
- preserve placeholder tokens exactly and in order;
- avoid omissions, added claims and marketing embellishment;
- translate headings, captions and labels unless they are genuine names/titles;
- keep bibliographic work titles in the source language where appropriate.

A second review pass inside the ChatGPT task should check meaning, terminology, fluency, omissions/additions and untranslated reader-facing text before results are committed.

## Applying results

The deterministic helper can apply a completed result JSON:

~~~bash
python scripts/chatgpt_translate.py --apply-results translation-results.json
~~~

It restores protected HTML/URLs/code/math, writes the translated Markdown with `tx-unit` markers and validates it.

Normal validation is:

~~~bash
python scripts/chatgpt_translate.py --check-only
python scripts/multilingual_site.py --require-translations
~~~

Generate a queue locally with:

~~~bash
python scripts/chatgpt_translate.py --prepare-queue .translation/queue.json
~~~

No API key is required for any command.

## Normal publishing routine

For an ordinary content change:

1. edit English under `content/en/`;
2. create a branch and PR;
3. **Prepare ChatGPT translation queue** creates/updates `.translation/queue.json`;
4. ask ChatGPT/Codex to process the translation queue for that PR;
5. the completed translation files are committed into the same PR;
6. review the translation diff where appropriate;
7. merge only after translation checks are green;
8. the `main` publication workflow builds and publishes from the committed translations.

Publication never generates a translation itself.

## Working directly from ChatGPT

With the repository connected, a practical instruction is:

~~~text
Process the translation queue in PR #<number>. Translate all queued units,
review them for technical accuracy and natural target-language prose,
write the completed translations back to the PR, and run the translation checks.
~~~

This is the default workflow for this project. It avoids API billing entirely.

## Optional Work/Codex automation

Eligible ChatGPT accounts can use GitHub pull-request activity as an event trigger in ChatGPT Work. This can be used later to automatically notice a PR update and start a translation task.

Codex is also available through ChatGPT plans and is appropriate when the task needs to run repository commands and commit changes.

These are ChatGPT product workflows, not OpenAI API calls. Their usage is governed by the ChatGPT plan allowance.

## Human corrections

A linguistic correction may be made directly inside a translated `tx-unit` when the English meaning is already correct. Leave the surrounding comments intact.

Because the unit key is derived from English, the corrected target wording is reused until that English block changes.

If the meaning itself is wrong, edit English first.

## Controlled terminology

`glossaries/master-terms.yml` remains the controlled vocabulary for knife anatomy, metallurgy, sharpening, ergonomics and established knife names.

Only glossary rows relevant to a queued unit are included with that translation task. Updating a technical term therefore invalidates only units that use it instead of the entire book.

## Adding other languages

The queue generator can target any configured locale:

~~~bash
python scripts/chatgpt_translate.py \
  --prepare-queue .translation/queue.json \
  --locales es fr de
~~~

A locale should not be activated for public publication until its specialist terminology and review policy are ready.

## Publication and exports

**Publish book, PDFs and GitHub Pages**, **Export PDF guides** and **Export multilingual guide** consume committed translations only.

Before non-English publication/export they run `scripts/chatgpt_translate.py --check-only`. Missing, stale, legacy or structurally inconsistent translations stop the job.

This separation is deliberate: translation is reviewable content work; publication is deterministic packaging and deployment.

## Revision numbers

Website pages, PDFs and release packages use `scripts/publication_metadata.py`.

- Public nomenclature: `Revision N`.
- Revision numbers count complete published editions, not commits or workflow attempts.
- Historical numbered publications through legacy `v372` correspond to Revision 49.
- The first new-style publication is Revision 50.
- Failed or incomplete publication attempts do not consume a Revision number.
- Translation PRs and ordinary commits do not consume a Revision number.
- Publication date uses `Europe/Rome` and format `YYYY-MM-DD`.

## Key files

~~~text
content/en/                                English source of truth
translations/                              Committed localized Markdown + tx-unit memory
.translation/queue.json                    Current deterministic translation queue
glossaries/master-terms.yml                Controlled technical terminology
localization/locales.yml                   Locale configuration and language guidance
scripts/chatgpt_translate.py               Queue/apply/validation engine; no model calls
scripts/test_chatgpt_translate.py          Differential translation regression tests
scripts/multilingual_site.py               Source-hash validation and multilingual build
.github/workflows/translation-status.yml   Queue generation + translation status
.github/workflows/pages.yml                Publication and GitHub Pages deployment
.github/workflows/export-pdf.yml           PDF export
.github/workflows/export-multilingual.yml  Multilingual package export
~~~

## Retired translation systems

Marian/OPUS-MT and the API-based translator are not part of the active architecture and must not be used as fallback paths. If ChatGPT translation has not been completed, publication fails rather than silently using a lower-quality translator.
