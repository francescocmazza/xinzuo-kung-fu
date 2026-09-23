# Translation workflow

English under `content/en/` is the source of truth for every language edition.

The repository does **not** call a translation API. `scripts/chatgpt_translate.py` splits English pages into semantic `tx-unit` blocks, compares them with the committed translation memory and generates a deterministic queue containing only blocks that are new or changed.

That queue is translated in ChatGPT or Codex using the user's normal ChatGPT plan. The completed results are written back to the translated Markdown and validated before publication. Unchanged target units are reused exactly, so later human corrections survive until the corresponding English unit changes.

Human corrections are expected and supported. Keep the surrounding `tx-unit` comments intact.

Translations must preserve technical meaning, chapter structure, cross-references, protected Markdown/HTML structure and the controlled terminology in `glossaries/master-terms.yml`, while reading as native editorial prose rather than translated English.

The retired Marian/OPUS-MT pipeline is not an approved fallback. Publication and export workflows only consume committed, current ChatGPT translations and fail closed when a translation is missing, stale or from the retired engine.

See `PUBLISHING_GUIDE.md` for the complete workflow.
