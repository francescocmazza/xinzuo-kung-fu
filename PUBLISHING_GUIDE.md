# Publishing and translating the multilingual guide

English under `content/en/` is the only source of truth. Active translations live under `translations/<locale>/` and are committed to Git so they can be reviewed exactly like any other book change.

## Publication-ready languages

English (`en`) is always published. Every configured non-English locale with `publish_when_complete: true` is published **automatically as soon as its complete committed translation is current and structurally valid**.

Publication is therefore dynamic rather than controlled by a fixed language list. An incomplete language is simply skipped and never blocks languages that are already ready. For example, the book can publish English and Italian while Simplified Chinese is still being translated; as soon as Simplified Chinese reaches 100%, the next publication automatically includes its website and PDF too. The same rule applies to future languages such as Dutch.

The current translation set includes Italian and Simplified Chinese. Other left-to-right locales are prepared for the same publish-when-complete mechanism. Right-to-left locales remain excluded from automatic publication until the RTL publication path is explicitly enabled.

## Core rule: no translation API and no API credits

The repository never calls the OpenAI API or any other paid translation API.

GitHub performs only deterministic work:

1. split English Markdown into semantic translation units;
2. compare those units with committed translation memory;
3. create `.translation/queue.json` containing only missing or changed units;
4. validate completed translations;
5. classify each configured locale as READY or WAIT;
6. publish only the READY set, while incomplete locales remain in the translation queue.

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
8. the `main` publication workflow resolves the READY locale set and builds only those languages;
9. one PDF is generated automatically for every READY locale and attached to the numbered GitHub Release.

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

Locale-specific semantic distinctions that cannot be represented safely as a simple one-to-one glossary entry live under the locale's `translation_rules` in `localization/locales.yml`. A rule is injected only into queued units whose English source matches its declared triggers, and the validator can reject explicitly forbidden target-language formulations. The Italian distinction between genuine **Damasco** construction and merely surface-**damascato** decoration is enforced this way so future translations cannot silently collapse the two concepts.

## Adding other languages

The queue generator can target any configured locale:

~~~bash
python scripts/chatgpt_translate.py \
  --prepare-queue .translation/queue.json \
  --locales es fr de
~~~

For left-to-right locales configured with `publish_when_complete: true`, no later workflow edit is required: once every page passes the translation validator, `scripts/publication_locales.py` automatically promotes the locale into the website, downloadable packages and PDF release. Locale-specific PDF cover/edition copy can be supplied in `localization/locales.yml`; Dutch is already prepared as an example.

## Publication and exports

**Publish book, PDFs and GitHub Pages**, **Export PDF guides** and **Export multilingual guide** consume committed translations only.

Publication first runs `scripts/publication_locales.py`. A locale is READY only when every English Markdown source has a complete, current and structurally valid ChatGPT translation. Missing, stale, legacy or malformed translations make **that locale** WAIT; they do not block other READY languages.

The release asset list is dynamic: checksum + HTML package + Markdown package + one PDF for every READY locale. When a new language becomes complete, the next Revision gains its PDF automatically.

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
scripts/publication_locales.py              READY/WAIT resolver + dynamic release asset list
.github/workflows/translation-status.yml   Queue generation + translation status
.github/workflows/pages.yml                Publication and GitHub Pages deployment
.github/workflows/export-pdf.yml           PDF export
.github/workflows/export-multilingual.yml  Multilingual package export
~~~

## Retired translation systems

Marian/OPUS-MT and the API-based translator are not part of the active architecture and must not be used as fallback paths. If ChatGPT translation has not been completed, publication fails rather than silently using a lower-quality translator.
