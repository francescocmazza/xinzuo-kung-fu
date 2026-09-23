# Translation workflow

English under `content/en/` is the source of truth for every language edition.

Production translations are generated through `scripts/openai_translate.py` and committed to Git. The translator uses semantic `tx-unit` blocks: unchanged English blocks reuse their existing translated text exactly, while changed/new blocks are translated with GPT and then passed through an independent GPT technical-editor review.

Human corrections are expected and supported. When the English meaning is unchanged, edit the target wording inside the existing `tx-unit` comments and leave those comments intact; the corrected wording will remain reusable until that English unit changes.

Translations must preserve technical meaning, chapter structure, cross-references, protected Markdown/HTML structure and the controlled terminology in `glossaries/master-terms.yml`, while reading as native editorial prose rather than translated English.

The retired Marian/OPUS-MT pipeline is not an approved fallback. Publication and export workflows only consume already committed, current translations and fail closed when a translation is missing, stale or from the retired engine.

See `PUBLISHING_GUIDE.md` for the complete workflow.
