#!/usr/bin/env python3
"""High-quality differential book translation using the OpenAI Responses API.

English under content/en remains the sole source of truth. Markdown is split into
semantic blocks; unchanged translated blocks are reused, while changed/new blocks
are translated and independently reviewed. Invisible tx-unit markers in translated
Markdown act as translation memory, so human edits to unchanged units survive.

The legacy Marian/OPUS-MT engine is never used as a fallback.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))
from multilingual_site import (  # noqa: E402
    GLOSSARY,
    LOCALES,
    SOURCE,
    TRANSLATIONS,
    digest,
    read_yaml,
    split_document,
)

ENGINE_REVISION = "openai-responses-v1"
PROMPT_REVISION = "2026-09-23-technical-book-v1"
DEFAULT_TRANSLATOR_MODEL = "gpt-6-sol"
DEFAULT_REVIEWER_MODEL = "gpt-6-astra"

UNIT_START_RE = re.compile(r"^<!-- tx-unit:([0-9a-f]{64}) -->\s*$")
UNIT_END = "<!-- /tx-unit -->"
PLACEHOLDER_RE = re.compile(r"⟦KBT\d{4}⟧")
FENCE_RE = re.compile(r"^\s*(\x60\x60\x60|~~~)")
HTML_BLOCK_TAG_RE = re.compile(
    r"</?(?:figure|div|table|svg|details|section|aside|style|script)\b[^>]*>",
    re.IGNORECASE,
)
HTML_TAG_RE = re.compile(r"</?[A-Za-z][^>]*>")
INLINE_CODE_RE = re.compile(r"\x60[^\x60\n]+\x60")
URL_RE = re.compile(r"https?://[^\s)>]+")
INLINE_MATH_RE = re.compile(r"\$[^$\n]+\$")
MARKDOWN_DEST_RE = re.compile(r"(?<=\]\()[^)\n]+(?=\))")
WORD_RE = re.compile(r"[^\W_]+(?:-[^\W_]+)*", re.UNICODE)

MAX_IDENTICAL_TOKEN_RUN = 4
MAX_PHRASE_REPEATS = 3


@dataclass(frozen=True)
class SourceBlock:
    text: str
    separator: str


@dataclass(frozen=True)
class PreparedUnit:
    unit_id: str
    unit_key: str
    source: str
    masked_source: str
    placeholders: dict[str, str]
    relevant_glossary: tuple[tuple[str, str], ...]
    verbatim: bool


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--locales", nargs="*")
    parser.add_argument("--force-full", action="store_true")
    parser.add_argument("--check-only", action="store_true")
    parser.add_argument("--paths", nargs="*")
    return parser.parse_args()


def _hash(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _normalize_source_body(body: str) -> str:
    return body.lstrip("\n").rstrip() + "\n"


def _html_depth_delta(line: str) -> int:
    delta = 0
    for match in HTML_BLOCK_TAG_RE.finditer(line):
        token = match.group(0)
        if token.startswith("</"):
            delta -= 1
        elif token.rstrip().endswith("/>"):
            continue
        else:
            delta += 1
    return delta


def split_markdown_blocks(body: str) -> list[SourceBlock]:
    """Split into stable paragraph-like units without splitting fences/raw HTML."""
    body = _normalize_source_body(body)
    lines = body.splitlines(keepends=True)
    blocks: list[SourceBlock] = []
    current: list[str] = []
    separator: list[str] = []
    fence: str | None = None
    html_depth = 0

    def flush() -> None:
        nonlocal current, separator
        if current:
            blocks.append(SourceBlock("".join(current).rstrip("\n"), "".join(separator)))
        elif separator and blocks:
            prev = blocks[-1]
            blocks[-1] = SourceBlock(prev.text, prev.separator + "".join(separator))
        current = []
        separator = []

    for line in lines:
        stripped = line.strip()
        fence_match = FENCE_RE.match(line)
        if fence_match:
            marker = fence_match.group(1)
            if fence is None:
                fence = marker
            elif marker == fence:
                fence = None

        if fence is None:
            html_depth = max(0, html_depth + _html_depth_delta(line))

        protected = fence is not None or html_depth > 0
        if not protected and stripped == "":
            if current:
                separator.append(line)
            elif blocks:
                prev = blocks[-1]
                blocks[-1] = SourceBlock(prev.text, prev.separator + line)
            continue

        if separator and current:
            flush()
        current.append(line)

    flush()
    return blocks


def _replace_matches(
    text: str,
    pattern: re.Pattern[str],
    mapping: dict[str, str],
    counter: list[int],
) -> str:
    def repl(match: re.Match[str]) -> str:
        token = f"⟦KBT{counter[0]:04d}⟧"
        counter[0] += 1
        mapping[token] = match.group(0)
        return token

    return pattern.sub(repl, text)


def mask_protected_literals(text: str) -> tuple[str, dict[str, str]]:
    """Mask structure/literals that must survive translation byte-for-byte."""
    mapping: dict[str, str] = {}
    counter = [1]
    masked = text
    for pattern in (
        HTML_TAG_RE,
        MARKDOWN_DEST_RE,
        INLINE_CODE_RE,
        URL_RE,
        INLINE_MATH_RE,
    ):
        masked = _replace_matches(masked, pattern, mapping, counter)
    return masked, mapping


def restore_protected_literals(text: str, mapping: dict[str, str]) -> str:
    seen = PLACEHOLDER_RE.findall(text)
    expected = list(mapping.keys())
    if Counter(seen) != Counter(expected):
        raise RuntimeError(
            "Model changed, omitted or reordered protected placeholders: "
            f"expected {expected}, got {seen}"
        )
    restored = text
    for token, literal in mapping.items():
        restored = restored.replace(token, literal)
    if PLACEHOLDER_RE.search(restored):
        raise RuntimeError("Protected placeholder residue remained after restoration")
    return restored


def glossary_pairs(locale: str) -> list[tuple[str, str]]:
    data = read_yaml(GLOSSARY)
    pairs: list[tuple[str, str]] = []
    for entry in (data.get("terms") or {}).values():
        if not isinstance(entry, dict) or not entry.get("enforce", False):
            continue
        forms = entry.get("forms")
        if isinstance(forms, list):
            for form in forms:
                if not isinstance(form, dict):
                    continue
                source = str(form.get("en", "")).strip()
                target = str(form.get(locale, "")).strip()
                if source and target:
                    pairs.append((source, target))
        else:
            source = str(entry.get("source_en", "")).strip()
            target = str(entry.get(locale, "")).strip()
            if source and target:
                pairs.append((source, target))
    pairs.sort(key=lambda item: (-len(item[0]), item[0].casefold(), item[1].casefold()))
    unique: list[tuple[str, str]] = []
    seen: set[tuple[str, str]] = set()
    for pair in pairs:
        folded = (pair[0].casefold(), pair[1].casefold())
        if folded not in seen:
            seen.add(folded)
            unique.append(pair)
    return unique


def relevant_glossary(
    text: str,
    pairs: list[tuple[str, str]],
) -> tuple[tuple[str, str], ...]:
    found: list[tuple[str, str]] = []
    occupied: list[tuple[int, int]] = []
    for source, target in pairs:
        pattern = re.compile(
            (r"(?<!\w)" if source[:1].isalnum() else "")
            + re.escape(source)
            + (r"(?!\w)" if source[-1:].isalnum() else ""),
            re.IGNORECASE,
        )
        for match in pattern.finditer(text):
            if any(match.start() < end and match.end() > start for start, end in occupied):
                continue
            occupied.append((match.start(), match.end()))
            found.append((source, target))
            break
    return tuple(found)


def is_verbatim_block(text: str) -> bool:
    stripped = text.strip()
    if not stripped:
        return True
    if FENCE_RE.match(stripped):
        return True
    if re.fullmatch(r"[-*_]{3,}", stripped):
        return True
    without_tags = HTML_TAG_RE.sub("", stripped)
    return bool(HTML_TAG_RE.search(stripped) and not without_tags.strip())


def unit_key(
    locale: str,
    source: str,
    relevant_terms: tuple[tuple[str, str], ...],
    locale_guidance: str = "",
) -> str:
    payload = json.dumps(
        {
            "prompt_revision": PROMPT_REVISION,
            "locale": locale,
            "source": source,
            "relevant_glossary": relevant_terms,
            "locale_guidance": locale_guidance.strip(),
        },
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )
    return _hash(payload)


def prepare_units(
    blocks: list[SourceBlock],
    locale: str,
    pairs: list[tuple[str, str]],
    locale_guidance: str = "",
) -> list[PreparedUnit]:
    result: list[PreparedUnit] = []
    occurrences: dict[str, int] = {}
    for index, block in enumerate(blocks, start=1):
        masked, mapping = mask_protected_literals(block.text)
        terms = relevant_glossary(block.text, pairs)
        base_key = unit_key(locale, block.text, terms, locale_guidance)
        occurrence = occurrences.get(base_key, 0) + 1
        occurrences[base_key] = occurrence
        unique_key = _hash(f"{base_key}:{occurrence}")
        result.append(
            PreparedUnit(
                unit_id=f"u{index:04d}",
                unit_key=unique_key,
                source=block.text,
                masked_source=masked,
                placeholders=mapping,
                relevant_glossary=terms,
                verbatim=is_verbatim_block(block.text),
            )
        )
    return result


def parse_existing_units(body: str) -> dict[str, str]:
    lines = body.splitlines(keepends=True)
    result: dict[str, str] = {}
    index = 0
    while index < len(lines):
        start = UNIT_START_RE.match(lines[index].strip())
        if not start:
            index += 1
            continue
        key = start.group(1)
        index += 1
        payload: list[str] = []
        while index < len(lines) and lines[index].strip() != UNIT_END:
            payload.append(lines[index])
            index += 1
        if index >= len(lines):
            raise RuntimeError(f"Unclosed tx-unit marker for {key}")
        result[key] = "".join(payload).rstrip("\n")
        index += 1
    return result


def render_units(
    blocks: list[SourceBlock],
    units: list[PreparedUnit],
    translations: dict[str, str],
) -> str:
    output: list[str] = []
    for block, unit in zip(blocks, units):
        target = translations[unit.unit_key].rstrip()
        output.append(f"<!-- tx-unit:{unit.unit_key} -->\n")
        output.append(target)
        output.append(f"\n{UNIT_END}")
        output.append(block.separator or "\n\n")
    return "".join(output).rstrip() + "\n"


def _words(text: str) -> list[str]:
    return [word.casefold() for word in WORD_RE.findall(text)]


def _degeneration_problem(text: str) -> str | None:
    words = _words(text)
    previous: str | None = None
    run = 0
    for word in words:
        if word == previous:
            run += 1
        else:
            previous = word
            run = 1
        if run > MAX_IDENTICAL_TOKEN_RUN and len(word) >= 2:
            return f"repeated-token loop: {word!r} occurs {run} times consecutively"

    for width in range(2, min(6, max(2, len(words) // 4)) + 1):
        for start in range(0, max(0, len(words) - width * 4 + 1)):
            phrase = words[start : start + width]
            repeats = 1
            cursor = start + width
            while cursor + width <= len(words) and words[cursor : cursor + width] == phrase:
                repeats += 1
                cursor += width
            if repeats > MAX_PHRASE_REPEATS:
                return (
                    "repeated-phrase loop: "
                    f"{' '.join(phrase)!r} occurs {repeats} times consecutively"
                )
    return None


def validate_unit_translation(unit: PreparedUnit, translated: str) -> None:
    if not translated.strip():
        raise RuntimeError(f"{unit.unit_id}: model returned an empty translation")
    placeholders = PLACEHOLDER_RE.findall(translated)
    expected = PLACEHOLDER_RE.findall(unit.masked_source)
    if placeholders != expected:
        raise RuntimeError(
            f"{unit.unit_id}: protected placeholders changed. "
            f"Expected {expected}, got {placeholders}"
        )
    problem = _degeneration_problem(translated)
    if problem:
        raise RuntimeError(f"{unit.unit_id}: {problem}")

    source_words = _words(unit.masked_source)
    target_words = _words(translated)
    if (
        len(unit.masked_source) >= 80
        and len(translated) > len(unit.masked_source) * 3.8
        and len(target_words) > max(30, len(source_words) * 3.5)
    ):
        raise RuntimeError(
            f"{unit.unit_id}: implausible expansion "
            f"({len(unit.masked_source)} -> {len(translated)} characters)"
        )


def _glossary_prompt(pairs: list[tuple[str, str]]) -> str:
    if not pairs:
        return "No reviewed controlled terminology is configured for this locale."
    rows = "\n".join(f"- {source} => {target}" for source, target in pairs)
    return (
        "CONTROLLED TERMINOLOGY\n"
        "When the English source uses one of these terms in the matching technical "
        "sense, use the approved target form. Grammar may be inflected naturally "
        "when required by the target language.\n"
        + rows
    )


def _target_language(locale: str, cfg: dict[str, Any]) -> str:
    return f"{cfg.get('name', locale)} ({locale})"


def _translator_system_prompt(language: str, glossary: str) -> str:
    return f"""You are the senior publishing translator for a technical book about kitchen knives, metallurgy, sharpening and cutting technique.

Translate from English into {language}. Prioritize semantic accuracy, natural professional prose and established specialist vocabulary over literal word-for-word correspondence.

Rules:
- Preserve every factual distinction, qualification and degree of certainty.
- Do not summarize, omit, embellish, market, or add claims.
- Use idiomatic target-language publishing prose; avoid calques and awkward machine-translation syntax.
- Respect the controlled terminology below.
- Keep brand names, model names, steel grades, chemical symbols, standards and established international knife-type names unchanged unless the glossary supplies a target form.
- Preserve Markdown structure and all placeholder tokens such as ⟦KBT0001⟧ exactly, once each, and in the same order.
- Placeholders represent HTML tags, URLs, link destinations, code or mathematical literals. Never translate or alter them.
- Translate reader-facing headings, captions, labels and alt text unless they are proper names or bibliographic titles.
- Preserve bibliographic work titles in their original language.
- Return only the requested units through the supplied structured schema.

{glossary}
"""


def _reviewer_system_prompt(language: str, glossary: str) -> str:
    return f"""You are the senior bilingual technical editor for a published book about kitchen knives and metallurgy.

Review candidate translations from English into {language}. Produce final publication-ready wording for every supplied unit.

Correct technical meaning, terminology, omissions, additions, changed qualifications, awkward literal translation, false friends, unnatural syntax, headings/captions left in English without a valid reason, malformed Markdown and altered placeholder tokens.

Keep all placeholder tokens exactly, once each, and in the same order. Return every requested unit even when no correction is needed.

{glossary}
"""


def _call_model(
    *,
    model: str,
    system_prompt: str,
    user_payload: str,
) -> dict[str, str]:
    try:
        from openai import OpenAI
        from pydantic import BaseModel
    except ImportError as exc:
        raise RuntimeError(
            "OpenAI translation dependencies are missing. "
            "Install requirements-translation.txt."
        ) from exc

    class UnitResult(BaseModel):
        id: str
        text: str

    class TranslationResult(BaseModel):
        units: list[UnitResult]

    client = OpenAI()
    response = client.responses.parse(
        model=model,
        input=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_payload},
        ],
        text_format=TranslationResult,
    )
    parsed = response.output_parsed
    if parsed is None:
        raise RuntimeError(f"{model}: no structured translation output was returned")
    return {item.id: item.text for item in parsed.units}


def _batch_payload(
    *,
    relative: Path,
    page_context: str,
    units: list[PreparedUnit],
    candidates: dict[str, str] | None = None,
) -> str:
    rows = []
    for unit in units:
        row: dict[str, str] = {"id": unit.unit_id, "english": unit.masked_source}
        if candidates is not None:
            row["candidate_translation"] = candidates[unit.unit_id]
        rows.append(row)

    task = (
        "Review and revise these candidate translations"
        if candidates is not None
        else "Translate these units"
    )
    return (
        f"PAGE: {relative.as_posix()}\n\n"
        "FULL ENGLISH PAGE CONTEXT (reference only; translate only listed units):\n"
        f"{page_context}\n\n"
        f"{task}:\n"
        + json.dumps(rows, ensure_ascii=False, indent=2)
    )


def _expect_exact_ids(
    returned: dict[str, str],
    units: list[PreparedUnit],
    model: str,
) -> None:
    expected = [unit.unit_id for unit in units]
    if Counter(returned.keys()) != Counter(expected):
        raise RuntimeError(
            f"{model}: structured output IDs do not match requested units. "
            f"Expected {expected}, got {list(returned.keys())}"
        )


def translate_changed_units(
    *,
    locale: str,
    locale_cfg: dict[str, Any],
    relative: Path,
    source_body: str,
    units: list[PreparedUnit],
    translator_model: str,
    reviewer_model: str,
    glossary: list[tuple[str, str]],
) -> dict[str, str]:
    language = _target_language(locale, locale_cfg)
    glossary_text = _glossary_prompt(glossary)
    guidance = str(locale_cfg.get("translation_guidance", "")).strip()
    if guidance:
        glossary_text += (
            "\n\nLOCALE-SPECIFIC EDITORIAL GUIDANCE\n" + guidance
        )
    page_context = source_body

    first = _call_model(
        model=translator_model,
        system_prompt=_translator_system_prompt(language, glossary_text),
        user_payload=_batch_payload(
            relative=relative,
            page_context=page_context,
            units=units,
        ),
    )
    _expect_exact_ids(first, units, translator_model)
    for unit in units:
        validate_unit_translation(unit, first[unit.unit_id])

    final = _call_model(
        model=reviewer_model,
        system_prompt=_reviewer_system_prompt(language, glossary_text),
        user_payload=_batch_payload(
            relative=relative,
            page_context=page_context,
            units=units,
            candidates=first,
        ),
    )
    _expect_exact_ids(final, units, reviewer_model)
    for unit in units:
        validate_unit_translation(unit, final[unit.unit_id])
    return final


def _translation_header(
    *,
    locale: str,
    source_text: str,
    glossary_text: str,
    translator_model: str,
    reviewer_model: str,
) -> str:
    return (
        "---\n"
        f"source_hash: {digest(locale, source_text, glossary_text)}\n"
        f"translation_engine: {ENGINE_REVISION}\n"
        f"prompt_revision: {PROMPT_REVISION}\n"
        f"translation_model: {translator_model}\n"
        f"review_model: {reviewer_model}\n"
        f"glossary_hash: {_hash(glossary_text)}\n"
        "---\n\n"
    )


def _selected_paths(options: argparse.Namespace) -> list[Path]:
    paths = (
        [Path(item) for item in options.paths]
        if options.paths
        else [
            path.relative_to(SOURCE)
            for path in sorted(SOURCE.rglob("*.md"))
            if path.name != "README.md"
        ]
    )
    invalid = [path for path in paths if not (SOURCE / path).exists()]
    if invalid:
        raise SystemExit(
            "Unknown English source path(s): "
            + ", ".join(path.as_posix() for path in invalid)
        )
    return paths


def _selected_locales(options: argparse.Namespace) -> tuple[dict[str, Any], list[str]]:
    locale_cfg = read_yaml(LOCALES).get("locales", {})
    selected = options.locales or [
        code
        for code, cfg in locale_cfg.items()
        if code != "en" and cfg.get("deploy")
    ]
    unknown = [code for code in selected if code not in locale_cfg or code == "en"]
    if unknown:
        raise SystemExit("Unknown/non-target locale(s): " + ", ".join(unknown))
    return locale_cfg, selected


def _check_page(
    *,
    locale: str,
    relative: Path,
    source_text: str,
    source_body: str,
    target_path: Path,
    pairs: list[tuple[str, str]],
    glossary_text: str,
    locale_guidance: str,
) -> list[str]:
    if not target_path.exists():
        return [f"{locale}:{relative}: missing translation"]

    problems: list[str] = []
    metadata, target_body = split_document(target_path.read_text(encoding="utf-8"))
    if metadata.get("source_hash") != digest(locale, source_text, glossary_text):
        problems.append(f"{locale}:{relative}: stale source_hash")
    if metadata.get("translation_engine") != ENGINE_REVISION:
        problems.append(f"{locale}:{relative}: legacy translation engine")
    if metadata.get("prompt_revision") != PROMPT_REVISION:
        problems.append(f"{locale}:{relative}: stale prompt revision")

    blocks = split_markdown_blocks(source_body)
    units = prepare_units(blocks, locale, pairs, locale_guidance)
    existing = parse_existing_units(target_body)
    if list(existing.keys()) != [unit.unit_key for unit in units]:
        problems.append(f"{locale}:{relative}: tx-unit sequence mismatch")
        return problems

    for unit in units:
        translated = existing.get(unit.unit_key, "")
        if unit.verbatim and translated != unit.source:
            problems.append(f"{locale}:{relative}:{unit.unit_id}: verbatim block changed")
        problem = _degeneration_problem(translated)
        if problem:
            problems.append(f"{locale}:{relative}:{unit.unit_id}: {problem}")
    return problems


def main() -> int:
    options = parse_args()
    locale_cfg, selected_locales = _selected_locales(options)
    paths = _selected_paths(options)
    glossary_text = GLOSSARY.read_text(encoding="utf-8") if GLOSSARY.exists() else ""

    translator_model = os.getenv("OPENAI_TRANSLATION_MODEL", DEFAULT_TRANSLATOR_MODEL)
    reviewer_model = os.getenv(
        "OPENAI_TRANSLATION_REVIEW_MODEL",
        DEFAULT_REVIEWER_MODEL,
    )

    if options.check_only:
        failures: list[str] = []
        for locale in selected_locales:
            pairs = glossary_pairs(locale)
            for relative in paths:
                source_path = SOURCE / relative
                source_text = source_path.read_text(encoding="utf-8")
                _, source_body = split_document(source_text)
                failures.extend(
                    _check_page(
                        locale=locale,
                        relative=relative,
                        source_text=source_text,
                        source_body=source_body,
                        target_path=TRANSLATIONS / locale / relative,
                        pairs=pairs,
                        glossary_text=glossary_text,
                        locale_guidance=str(locale_cfg[locale].get("translation_guidance", "")),
                    )
                )
        if failures:
            print("OpenAI translation integrity check failed:")
            for failure in failures:
                print(f"  {failure}")
            return 1
        print("OpenAI translation integrity check passed")
        return 0

    if not os.getenv("OPENAI_API_KEY"):
        raise SystemExit(
            "OPENAI_API_KEY is not set. Configure it as a GitHub Actions secret "
            "or environment variable before refreshing translations."
        )

    total_api_units = 0
    total_reused_units = 0
    total_pages = 0

    for locale in selected_locales:
        cfg = locale_cfg[locale]
        pairs = glossary_pairs(locale)
        locale_guidance = str(cfg.get("translation_guidance", ""))
        print(
            f"{locale}: {len(pairs)} controlled glossary form(s); "
            f"translator={translator_model}; reviewer={reviewer_model}"
        )

        for relative in paths:
            source_path = SOURCE / relative
            source_text = source_path.read_text(encoding="utf-8")
            _, raw_source_body = split_document(source_text)
            source_body = _normalize_source_body(raw_source_body)
            blocks = split_markdown_blocks(source_body)
            units = prepare_units(blocks, locale, pairs, locale_guidance)

            target_path = TRANSLATIONS / locale / relative
            existing_units: dict[str, str] = {}
            if target_path.exists() and not options.force_full:
                try:
                    _, existing_body = split_document(
                        target_path.read_text(encoding="utf-8")
                    )
                    existing_units = parse_existing_units(existing_body)
                except RuntimeError:
                    existing_units = {}

            translations: dict[str, str] = {}
            changed: list[PreparedUnit] = []
            for unit in units:
                if unit.verbatim:
                    translations[unit.unit_key] = unit.source
                elif unit.unit_key in existing_units:
                    translations[unit.unit_key] = existing_units[unit.unit_key]
                    total_reused_units += 1
                else:
                    changed.append(unit)

            if changed:
                print(
                    f"  {relative}: translating/reviewing {len(changed)} changed "
                    f"unit(s), reusing {len(units) - len(changed)}"
                )
                final_masked = translate_changed_units(
                    locale=locale,
                    locale_cfg=cfg,
                    relative=relative,
                    source_body=source_body,
                    units=changed,
                    translator_model=translator_model,
                    reviewer_model=reviewer_model,
                    glossary=pairs,
                )
                for unit in changed:
                    translations[unit.unit_key] = restore_protected_literals(
                        final_masked[unit.unit_id],
                        unit.placeholders,
                    )
                total_api_units += len(changed)
            else:
                print(f"  {relative}: no API call; every unit is reusable")

            rendered = render_units(blocks, units, translations)
            header = _translation_header(
                locale=locale,
                source_text=source_text,
                glossary_text=glossary_text,
                translator_model=translator_model,
                reviewer_model=reviewer_model,
            )
            target_path.parent.mkdir(parents=True, exist_ok=True)
            target_path.write_text(header + rendered, encoding="utf-8")
            total_pages += 1

    print(
        "OpenAI translation refresh complete: "
        f"{total_pages} page(s), {total_api_units} API-translated unit(s), "
        f"{total_reused_units} reused reviewed unit(s)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
