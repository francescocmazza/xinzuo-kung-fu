# Publishing and translating the multilingual guide

English under `content/en/` is the only source of truth. Active translations live under `translations/<locale>/` and are committed to Git so they can be reviewed exactly like any other book change.

## Current active languages

The current publication scope is:

- English (`en`) — source of truth
- Italian (`it`)
- Simplified Chinese (`zh-Hans`)

Other locales remain defined but inactive until their terminology and review policy are ready.

## Translation architecture

The book no longer uses Marian, OPUS-MT, Transformers or any local generic machine-translation model.

Translation is performed by `scripts/openai_translate.py` through the OpenAI Responses API. The default roles are intentionally separated:

- translation model: `gpt-6-sol`;
- independent review model: `gpt-6-astra`.

The model IDs can be changed without code edits through GitHub repository variables `OPENAI_TRANSLATION_MODEL` and `OPENAI_TRANSLATION_REVIEW_MODEL`.

The translation workflow requires one GitHub Actions secret:

`OPENAI_API_KEY`

The publication, PDF export and multilingual export workflows do **not** need that secret and never call the translation API.

## Differential translation memory

Each English Markdown page is split into semantic blocks such as headings, paragraphs, lists, tables, figure markup and fenced code. A translated block is surrounded by invisible HTML comments containing a deterministic `tx-unit` key.

That key depends on:

- the English block;
- the target locale;
- the translation prompt revision;
- only the controlled glossary terms relevant to that block.

This has two important effects.

First, an unchanged block is reused exactly, including any human correction made inside its `tx-unit` markers. Second, a change to one English paragraph does not force the rest of the page or book through the API again.

On the first OpenAI migration, legacy translations have no `tx-unit` markers, so they are fully regenerated once. After that, refreshes are differential.

## Translation quality and structure protection

Changed units are processed in two model passes.

The first pass translates the requested units with the full English page supplied as context and with the controlled knife/metallurgy glossary. The second pass acts as a bilingual technical editor and independently checks meaning, terminology, omissions, additions, awkward literal wording and untranslated headings/captions.

The API response uses Structured Outputs, so the workflow expects a defined unit schema rather than free-form prose.

Before text reaches the model, structural literals are masked and later restored byte-for-byte. This includes HTML tags and attributes, URLs, Markdown link destinations, inline code and inline mathematics.

The engine also fails closed if it detects missing/reordered protected placeholders, empty output, pathological repeated-token or repeated-phrase loops, implausible text expansion, stale unit markers or stale source hashes.

There is no Marian fallback. If GPT translation or validation fails, the workflow fails and nothing is silently published.

## Normal publishing routine

For an ordinary content change:

1. Edit the English source under `content/en/`.
2. Create a branch and pull request. Avoid putting unfinished English-only edits directly on `main`.
3. **Translate book with OpenAI** runs on the trusted PR branch.
4. Only new or changed `tx-unit` blocks are sent to the translation model and then to the independent review model.
5. The workflow commits the refreshed translation files back into the same PR.
6. Review the English change and, when relevant, the generated translation diff.
7. Merge only when translation integrity and multilingual checks are green.
8. The `main` publication workflow validates the already-committed translations, builds all active languages, exports PDFs and packages, publishes the numbered Revision and deploys GitHub Pages.

The publication workflow never generates or repairs translations on the fly.

## Manual translation refresh

A maintainer can also use:

**Actions → Translate book with OpenAI → Run workflow**

Select the source ref, normally `main`. Keep **force_full** off for an ordinary differential refresh. Turn it on only when you deliberately want to regenerate every unit, for example during the initial migration or after a major translation-policy change.

When started manually, the workflow creates a dedicated `translations/openai-...` branch and opens a pull request instead of writing translations directly to `main`.

## Local use

Install the translation dependencies:

~~~bash
pip install -r requirements-translation.txt
~~~

Set the API key in the environment and run:

~~~bash
python scripts/openai_translate.py
~~~

Force a complete regeneration:

~~~bash
python scripts/openai_translate.py --force-full
~~~

Run the integrity check without making any API request:

~~~bash
python scripts/openai_translate.py --check-only
~~~

Strict multilingual validation remains:

~~~bash
python scripts/multilingual_site.py --require-translations
~~~

## Human corrections

A linguistic correction can be made directly inside a translated `tx-unit` while the English meaning is already correct. Leave the surrounding `tx-unit` comments intact. Because the key is derived from the English source, the corrected target text will be reused as long as that English unit remains unchanged.

If the meaning itself is wrong, edit English first and let the translation workflow regenerate the affected unit.

## Controlled terminology

`glossaries/master-terms.yml` remains the controlled vocabulary for technical knife, metallurgy, sharpening and ergonomics terminology.

For a configured locale, relevant reviewed target terms are included in both the translation and review prompts. Because relevant glossary rows are part of each unit key, correcting one glossary translation invalidates only blocks that use that term rather than the entire book.

A new locale can be translated by the engine, but it should not be activated for publication until its specialist glossary and review policy are ready.

## Adding, moving or deleting an article

For a new article, add the English Markdown under `content/en/`, update `mkdocs.yml` when needed and open a PR. The OpenAI translation workflow creates the corresponding active-language pages.

For a move or rename, update the English path, navigation and internal links. Because translation memory is block-based, unchanged block text remains reusable when the target page already contains its `tx-unit` markers, but the translated file path should still mirror the English tree.

For deletion, remove the corresponding active translated files and update navigation/internal links.

## Publication and exports

**Publish book, PDFs and GitHub Pages**, **Export PDF guides** and **Export multilingual guide** are consumers of committed translations. They never call OpenAI.

Before publishing/exporting a non-English edition they run the OpenAI translation integrity check. If any active translation is missing, stale, generated by the retired engine or has a mismatched unit sequence, the operation fails and instructs the maintainer to run the translation workflow first.

This separation is deliberate: translation is reviewable content work; publication is deterministic packaging and deployment.

## Revision numbers

Website pages, PDFs and release packages use the shared publication metadata in `scripts/publication_metadata.py`.

- Public nomenclature: `Revision N`.
- Revision numbers count complete published editions, not commits or workflow attempts.
- There are 49 complete historical numbered publications through legacy `v372`, corresponding to Revision 49.
- The first new-style publication is Revision 50.
- Failed or incomplete publication attempts do not consume a Revision number.
- Translation PRs and ordinary commits do not consume a Revision number.
- Publication date uses `Europe/Rome` and format `YYYY-MM-DD`.

## Key files

~~~text
content/en/                              English source of truth
translations/                            Committed, reviewable localized Markdown
glossaries/master-terms.yml              Controlled technical vocabulary
localization/locales.yml                 Locale activation and language metadata
scripts/openai_translate.py              Differential GPT translation + review
scripts/test_openai_translate.py         Translation-memory/structure regressions
scripts/multilingual_site.py             Source-hash validation and site build
.github/workflows/translate-openai.yml   Translation PR workflow
.github/workflows/pages.yml              Deterministic publication/deployment
.github/workflows/export-pdf.yml         PDF export from committed translations
.github/workflows/export-multilingual.yml Multilingual package export
~~~

## Retired translation system

The previous Marian/OPUS-MT implementation is not part of any active workflow and must not be used as a fallback. Its poor technical-language quality and degeneration failure modes are the reason the translation architecture was replaced.
