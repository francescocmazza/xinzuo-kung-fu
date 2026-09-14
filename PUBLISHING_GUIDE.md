# Publishing and exporting the multilingual guide

English under `content/en/` is the only source of truth. Active translations live under `translations/<locale>/` and are automatically refreshed by GitHub Actions when the English source changes.

## Current active languages

The current publication scope is intentionally limited to:

- English (`en`) — source of truth
- Italian (`it`)
- Simplified Chinese (`zh-Hans`)

Other locale definitions remain inactive. They are not deployed, validated, automatically translated, exported, or offered by the PDF workflow unless deliberately activated later.

## Normal publishing routine

For an ordinary content change:

1. Edit the English source under `content/en/`.
2. Choose **Create a new branch for this commit and start a pull request** rather than committing an unfinished English change directly to `main`.
3. GitHub Actions detects which active translations became stale.
4. `scripts/auto_translate.py` refreshes only stale/missing active pages using local Marian/OPUS-MT models.
5. Where the previous English source and existing translation have matching line structure, unchanged translated lines are reused and only changed/inserted English lines are machine-translated.
6. Simplified Chinese is explicitly generated as Simplified Mandarin (`cmn_Hans`).
7. Strict multilingual validation runs after the refresh. The PR must report `0 missing, 0 stale`.
8. Merge the PR when the English edit and checks are correct.
9. On the resulting push to `main`, the publication workflow locks the next revision number, refreshes translations, builds every active language, exports the PDFs and downloadable packages, publishes the numbered GitHub Release and deploys GitHub Pages.

You therefore do **not** need to manually ask Claude Code to translate Italian and Chinese after every English edit.

## Translation engine and cost

Automatic translation uses these local open-source models:

- `Helsinki-NLP/opus-mt-en-it`
- `Helsinki-NLP/opus-mt-en-zh`

They run inside the GitHub Actions runner through Transformers/PyTorch and are cached between runs when possible.

There is no OpenAI API, GitHub Models API, translation API key, or paid translation API in this workflow. The model checkpoints are downloaded from Hugging Face when they are not already cached.

Machine translation is still subject to review. This is especially important for specialist Chinese knife terminology and any technical statement where a wording difference could change the meaning.

## Why the previous `index.md` edit failed

Each translated Markdown file contains a `source_hash`. The build system calculates the expected hash from:

- the English source page;
- the target locale;
- the translation schema version;
- the controlled glossary.

Before automatic refresh existed, changing even one English sentence immediately made the corresponding Italian and Simplified Chinese files stale. Pull-request validation then failed intentionally rather than publishing an old translation.

The protection remains in place. The difference is that CI now refreshes the stale translations **before** strict validation.

## Translation files and stale-page protection

The active translation tree mirrors `content/en/`, for example:

```text
content/en/10-sharpening/the-burr.md
translations/it/10-sharpening/the-burr.md
translations/zh-Hans/10-sharpening/the-burr.md
```

Strict validation is still performed with:

```text
python scripts/multilingual_site.py --require-translations
```

A successful active-language run must report:

```text
0 missing
0 stale
```

The automatic refresh command is:

```text
python scripts/auto_translate.py
```

Running it locally requires the dependencies in `requirements-translation.txt` plus a CPU-compatible PyTorch installation. For routine browser-based editing, letting GitHub Actions run it is simpler.

## What the automatic translator preserves

The helper is deliberately conservative. It attempts to preserve:

- unchanged translated lines;
- Markdown headings and list markers;
- links and link destinations;
- inline code;
- URLs;
- HTML tags;
- inline math;
- fenced code blocks and commands;
- Markdown table structure;
- existing translation wording when an English edit is formatting-only and does not change meaning.

If a page cannot safely reuse the previous line alignment, the helper falls back to translating the current page rather than marking an unknown/outdated translation as current.

## Human corrections to a translation

English remains authoritative, but a purely linguistic improvement to Italian or Simplified Chinese may still be committed directly to the matching file under `translations/` as long as it does not introduce a new technical or commercial claim.

A human correction does not need to change the English source when the meaning is unchanged.

If the English meaning is wrong, change English first and let the automatic refresh propagate the new source meaning.

## Adding a new article

1. Create the English `.md` page under the appropriate `content/en/` folder.
2. Add it to `mkdocs.yml` if it should appear in navigation.
3. Open a PR.
4. Automatic translation creates the missing Italian and Simplified Chinese pages in the CI workspace and strict validation checks them.
5. After merge, the `main` workflow commits the generated active translations to the repository and publishes the next complete revision.

## Renaming, moving, or deleting an article

Structural changes still need care because source and translation paths must remain aligned.

For a rename/move, update the English path, navigation and internal links. Existing translated files should normally be renamed/moved correspondingly so reviewed wording can be retained. The automatic translator is intended primarily for content refresh and missing-page generation, not for guessing file-renaming intent.

For deletion, remove the corresponding active translated files and update navigation/internal links.

## Images

Content images used by the English source belong under the approved asset structure, principally:

```text
content/en/assets/
```

Only original, properly licensed, or explicitly authorized images may be published. See `content/en/assets/IMAGE_RIGHTS.md`.

## GitHub Pages deployment and complete revisions

The public site and downloadable edition are published by:

**Actions → Publish book, PDFs and GitHub Pages**

On pull requests the supporting workflows refresh translations in the temporary Actions workspace and validate/export them, but they do not create a new revision.

On `main` the publication workflow:

1. counts completed historical publications and resolves one sequential **Revision** number;
2. locks that Revision number for the entire workflow run;
3. refreshes stale translations;
4. commits changed translation files using `github-actions[bot]` when necessary;
5. runs the strict multilingual build from the resulting committed state;
6. exports the three PDFs and the HTML/Markdown packages;
7. publishes and verifies the numbered GitHub Release;
8. uploads the Pages artifact and deploys the site.

The bot commit uses the repository `GITHUB_TOKEN`, preventing a recursive second push workflow while the current deployment continues. Because the Revision number is locked before that commit is created, automatic translation commits do not change the Revision number.

## Downloadable multilingual export

Go to **Actions → Export multilingual guide → Run workflow**.

Before building, the workflow automatically refreshes stale active translations using the same local models. The resulting artifact contains:

```text
html/      complete built website for every active locale
markdown/  per-locale source trees used for that build
```

This is an export operation, not a publication, so it does not consume a new Revision number.

## Official GitHub Releases

The normal `main` publication workflow creates one permanent GitHub Release for every complete Revision. New-style release tags use the machine-friendly form `revision-N`, while the reader-facing nomenclature is **Revision N**.

A Revision is considered complete only when the release has the full publication package: English PDF, Italian PDF, Simplified Chinese PDF, HTML archive, Markdown archive and SHA-256 checksum file.

The latest downloadable Revision is always available from the repository's **Releases** menu and the “Download the latest official release” link in `README.md`.

The old manual semantic-version release workflow has been removed so it cannot create a parallel `v1.0.0`/`vXYZ` numbering scheme.

## PDF export

Go to **Actions → Export PDF guides → Run workflow** and choose:

- `all`
- `en`
- `it`
- `zh-Hans`

For Italian, Simplified Chinese, or `all`, stale active translations are refreshed automatically before PDF generation. English-only PDF exports skip the translation-model installation.

The generated artifact contains the current requested PDF guide(s). CJK exports continue to install Noto fonts for full character coverage. A manual/test PDF export reports the latest completed Revision; it does not reserve the next Revision.

## Revision numbers and publication dates

Website pages, PDFs and release packages use the shared publication metadata implementation in `scripts/publication_metadata.py`.

- **Public nomenclature:** `Revision N`.
- **Meaning:** `N` is the number of complete published revisions, not the number of commits, workflow runs or attempted releases.
- Historical `edition-vXYZ` releases remain archived unchanged for traceability, but their `vXYZ` number is not carried into the new nomenclature.
- There are **49 complete historical numbered publications through the legacy `v372` release**. Therefore that current legacy publication corresponds to **Revision 49**.
- The first new-style publication is therefore **Revision 50**.
- After that the sequence is strictly `Revision 50`, `Revision 51`, `Revision 52`, and so on.
- Ordinary commits do not increment the Revision.
- Failed publication attempts do not increment the Revision. If a new-style release is incomplete, the next publication attempt reuses the same Revision number.
- Automatic translation commits created during publication do not change the locked Revision number.
- **Date:** actual build/export date in `Europe/Rome`, formatted `YYYY-MM-DD`.

## Important rules

- English is always the source of truth.
- Meaning changes must start in English.
- Do not bypass strict multilingual validation.
- Automatic translation removes the manual synchronization step; it does not remove the need for human review of important technical wording.
- Simplified Chinese specialist terminology deserves extra review.
- Inactive locales remain inactive until a model/review policy is deliberately configured for them.
- Images and third-party material may have rights different from the written-content licence.
