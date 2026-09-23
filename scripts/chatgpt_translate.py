#!/usr/bin/env python3
"""Prepare, apply and validate differential ChatGPT translation work.

This script deliberately performs NO model or API call. GitHub computes the
translation delta; ChatGPT/Codex translates the queued semantic units using the
user's ChatGPT plan; the completed results are then applied and validated here.

English under content/en is the sole source of truth.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from collections import Counter
from dataclasses import asdict, dataclass
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

ENGINE_REVISION = "chatgpt-differential-v1"
PROMPT_REVISION = "2026-09-23-technical-book-v2"
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


@dataclass(frozen=True)
class SourceBlock:
    text: str
    separator: str


@dataclass(frozen=True)
class PreparedUnit:
    id: str
    key: str
    source: str
    masked_source: str
    placeholders: dict[str, str]
    glossary: tuple[tuple[str, str], ...]
    verbatim: bool


def _hash(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _normalize(body: str) -> str:
    return body.lstrip("\n").rstrip() + "\n"


def _html_delta(line: str) -> int:
    delta = 0
    for match in HTML_BLOCK_TAG_RE.finditer(line):
        token = match.group(0)
        if token.startswith("</"):
            delta -= 1
        elif not token.rstrip().endswith("/>"):
            delta += 1
    return delta


def split_blocks(body: str) -> list[SourceBlock]:
    lines = _normalize(body).splitlines(keepends=True)
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
            old = blocks[-1]
            blocks[-1] = SourceBlock(old.text, old.separator + "".join(separator))
        current, separator = [], []

    for line in lines:
        match = FENCE_RE.match(line)
        if match:
            marker = match.group(1)
            if fence is None:
                fence = marker
            elif marker == fence:
                fence = None
        if fence is None:
            html_depth = max(0, html_depth + _html_delta(line))

        protected = fence is not None or html_depth > 0
        if not protected and not line.strip():
            if current:
                separator.append(line)
            elif blocks:
                old = blocks[-1]
                blocks[-1] = SourceBlock(old.text, old.separator + line)
            continue
        if separator and current:
            flush()
        current.append(line)
    flush()
    return blocks


def _replace(text: str, pattern: re.Pattern[str], mapping: dict[str, str], counter: list[int]) -> str:
    def repl(match: re.Match[str]) -> str:
        token = f"⟦KBT{counter[0]:04d}⟧"
        counter[0] += 1
        mapping[token] = match.group(0)
        return token
    return pattern.sub(repl, text)


def mask_literals(text: str) -> tuple[str, dict[str, str]]:
    mapping: dict[str, str] = {}
    counter = [1]
    masked = text
    for pattern in (HTML_TAG_RE, MARKDOWN_DEST_RE, INLINE_CODE_RE, URL_RE, INLINE_MATH_RE):
        masked = _replace(masked, pattern, mapping, counter)
    return masked, mapping


def restore_literals(text: str, mapping: dict[str, str]) -> str:
    seen = PLACEHOLDER_RE.findall(text)
    if Counter(seen) != Counter(mapping.keys()):
        raise RuntimeError(
            f"protected placeholders changed: expected {list(mapping)}, got {seen}"
        )
    restored = text
    for token, literal in mapping.items():
        restored = restored.replace(token, literal)
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
                if isinstance(form, dict):
                    s, t = str(form.get("en", "")).strip(), str(form.get(locale, "")).strip()
                    if s and t:
                        pairs.append((s, t))
        else:
            s, t = str(entry.get("source_en", "")).strip(), str(entry.get(locale, "")).strip()
            if s and t:
                pairs.append((s, t))
    pairs.sort(key=lambda x: (-len(x[0]), x[0].casefold(), x[1].casefold()))
    out: list[tuple[str, str]] = []
    seen: set[tuple[str, str]] = set()
    for p in pairs:
        k = (p[0].casefold(), p[1].casefold())
        if k not in seen:
            seen.add(k)
            out.append(p)
    return out


def relevant_glossary(text: str, pairs: list[tuple[str, str]]) -> tuple[tuple[str, str], ...]:
    found: list[tuple[str, str]] = []
    occupied: list[tuple[int, int]] = []
    for source, target in pairs:
        pat = re.compile(
            (r"(?<!\w)" if source[:1].isalnum() else "")
            + re.escape(source)
            + (r"(?!\w)" if source[-1:].isalnum() else ""),
            re.IGNORECASE,
        )
        for m in pat.finditer(text):
            if any(m.start() < e and m.end() > s for s, e in occupied):
                continue
            occupied.append((m.start(), m.end()))
            found.append((source, target))
            break
    return tuple(found)


def is_verbatim(text: str) -> bool:
    stripped = text.strip()
    if not stripped or FENCE_RE.match(stripped) or re.fullmatch(r"[-*_]{3,}", stripped):
        return True
    no_tags = HTML_TAG_RE.sub("", stripped)
    return bool(HTML_TAG_RE.search(stripped) and not no_tags.strip())


def prepare_units(
    blocks: list[SourceBlock],
    locale: str,
    pairs: list[tuple[str, str]],
    guidance: str,
) -> list[PreparedUnit]:
    result: list[PreparedUnit] = []
    occurrences: dict[str, int] = {}
    for index, block in enumerate(blocks, 1):
        masked, placeholders = mask_literals(block.text)
        terms = relevant_glossary(block.text, pairs)
        base = _hash(json.dumps(
            {
                "prompt": PROMPT_REVISION,
                "locale": locale,
                "source": block.text,
                "glossary": terms,
                "guidance": guidance.strip(),
            },
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
        ))
        n = occurrences.get(base, 0) + 1
        occurrences[base] = n
        result.append(PreparedUnit(
            id=f"u{index:04d}",
            key=_hash(f"{base}:{n}"),
            source=block.text,
            masked_source=masked,
            placeholders=placeholders,
            glossary=terms,
            verbatim=is_verbatim(block.text),
        ))
    return result


def parse_units(body: str) -> dict[str, str]:
    lines = body.splitlines(keepends=True)
    out: dict[str, str] = {}
    i = 0
    while i < len(lines):
        match = UNIT_START_RE.match(lines[i].strip())
        if not match:
            i += 1
            continue
        key = match.group(1)
        i += 1
        chunk: list[str] = []
        while i < len(lines) and lines[i].strip() != UNIT_END:
            chunk.append(lines[i])
            i += 1
        if i >= len(lines):
            raise RuntimeError(f"unclosed tx-unit {key}")
        out[key] = "".join(chunk).rstrip("\n")
        i += 1
    return out


def _words(text: str) -> list[str]:
    return [w.casefold() for w in WORD_RE.findall(text)]


def degeneration(text: str) -> str | None:
    words = _words(text)
    prev: str | None = None
    run = 0
    for word in words:
        if word == prev:
            run += 1
        else:
            prev, run = word, 1
        if run > 4 and len(word) >= 2:
            return f"repeated-token loop: {word!r}"
    for width in range(2, min(6, max(2, len(words) // 4)) + 1):
        for start in range(max(0, len(words) - width * 4 + 1)):
            phrase = words[start:start + width]
            repeats, cursor = 1, start + width
            while cursor + width <= len(words) and words[cursor:cursor + width] == phrase:
                repeats += 1
                cursor += width
            if repeats > 3:
                return f"repeated-phrase loop: {' '.join(phrase)!r}"
    return None


def validate_candidate(unit: PreparedUnit, text: str) -> None:
    if not text.strip():
        raise RuntimeError(f"{unit.id}: empty translation")
    expected = PLACEHOLDER_RE.findall(unit.masked_source)
    actual = PLACEHOLDER_RE.findall(text)
    if actual != expected:
        raise RuntimeError(f"{unit.id}: placeholder sequence changed: {actual} != {expected}")
    problem = degeneration(text)
    if problem:
        raise RuntimeError(f"{unit.id}: {problem}")
    sw, tw = _words(unit.masked_source), _words(text)
    if len(unit.masked_source) >= 80 and len(text) > len(unit.masked_source) * 3.8 and len(tw) > max(30, len(sw) * 3.5):
        raise RuntimeError(f"{unit.id}: implausible expansion")


def render(blocks: list[SourceBlock], units: list[PreparedUnit], translations: dict[str, str]) -> str:
    out: list[str] = []
    for block, unit in zip(blocks, units):
        out.append(f"<!-- tx-unit:{unit.key} -->\n")
        out.append(translations[unit.key].rstrip())
        out.append(f"\n{UNIT_END}")
        out.append(block.separator or "\n\n")
    return "".join(out).rstrip() + "\n"


def selected_locales(values: list[str] | None) -> tuple[dict[str, Any], list[str]]:
    cfg = read_yaml(LOCALES).get("locales", {})
    selected = values or [code for code, item in cfg.items() if code != "en" and item.get("deploy")]
    bad = [code for code in selected if code not in cfg or code == "en"]
    if bad:
        raise SystemExit("Unknown/non-target locale(s): " + ", ".join(bad))
    return cfg, selected


def source_paths(values: list[str] | None) -> list[Path]:
    if values:
        paths = [Path(v) for v in values]
    else:
        paths = [p.relative_to(SOURCE) for p in sorted(SOURCE.rglob("*.md")) if p.name != "README.md"]
    bad = [p for p in paths if not (SOURCE / p).exists()]
    if bad:
        raise SystemExit("Unknown source path(s): " + ", ".join(map(str, bad)))
    return paths


def queue(locale_cfg: dict[str, Any], locales: list[str], paths: list[Path]) -> dict[str, Any]:
    pages: list[dict[str, Any]] = []
    for locale in locales:
        cfg = locale_cfg[locale]
        guidance = str(cfg.get("translation_guidance", ""))
        pairs = glossary_pairs(locale)
        for relative in paths:
            source_text = (SOURCE / relative).read_text(encoding="utf-8")
            _, source_body = split_document(source_text)
            blocks = split_blocks(source_body)
            units = prepare_units(blocks, locale, pairs, guidance)
            target = TRANSLATIONS / locale / relative
            existing: dict[str, str] = {}
            if target.exists():
                try:
                    _, body = split_document(target.read_text(encoding="utf-8"))
                    existing = parse_units(body)
                except RuntimeError:
                    existing = {}
            changed = [
                asdict(unit)
                for unit in units
                if not unit.verbatim and unit.key not in existing
            ]
            if changed:
                pages.append({
                    "locale": locale,
                    "language": cfg.get("name", locale),
                    "translation_guidance": guidance,
                    "path": relative.as_posix(),
                    "page_context": source_body,
                    "units": changed,
                })
    return {
        "schema": 1,
        "engine": ENGINE_REVISION,
        "prompt_revision": PROMPT_REVISION,
        "instructions": (
            "Translate only queued units. Use natural publication-quality target-language prose, "
            "preserve meaning exactly, obey each unit glossary, and preserve every placeholder "
            "token exactly and in the same order. Return results using the result schema."
        ),
        "result_schema": {
            "results": [
                {"locale": "it", "path": "relative/path.md", "key": "<tx key>", "text": "<masked translation>"}
            ]
        },
        "pages": pages,
    }


def apply_results(
    data: dict[str, Any],
    locale_cfg: dict[str, Any],
    locales: list[str],
    paths: list[Path],
) -> None:
    results = data.get("results")
    if not isinstance(results, list):
        raise SystemExit("Results JSON must contain a results list")
    supplied: dict[tuple[str, str, str], str] = {}
    for row in results:
        if not isinstance(row, dict):
            continue
        supplied[(str(row.get("locale")), str(row.get("path")), str(row.get("key")))] = str(row.get("text", ""))

    glossary_text = GLOSSARY.read_text(encoding="utf-8") if GLOSSARY.exists() else ""
    missing: list[str] = []

    for locale in locales:
        cfg = locale_cfg[locale]
        guidance = str(cfg.get("translation_guidance", ""))
        pairs = glossary_pairs(locale)
        for relative in paths:
            source_path = SOURCE / relative
            source_text = source_path.read_text(encoding="utf-8")
            _, source_body = split_document(source_text)
            blocks = split_blocks(source_body)
            units = prepare_units(blocks, locale, pairs, guidance)
            target = TRANSLATIONS / locale / relative
            existing: dict[str, str] = {}
            if target.exists():
                try:
                    _, body = split_document(target.read_text(encoding="utf-8"))
                    existing = parse_units(body)
                except RuntimeError:
                    existing = {}

            translations: dict[str, str] = {}
            for unit in units:
                if unit.verbatim:
                    translations[unit.key] = unit.source
                elif unit.key in existing:
                    translations[unit.key] = existing[unit.key]
                else:
                    result = supplied.get((locale, relative.as_posix(), unit.key))
                    if result is None:
                        missing.append(f"{locale}:{relative}:{unit.id}")
                        continue
                    validate_candidate(unit, result)
                    translations[unit.key] = restore_literals(result, unit.placeholders)

            if any(unit.key not in translations for unit in units):
                continue

            header = (
                "---\n"
                f"source_hash: {digest(locale, source_text, glossary_text)}\n"
                f"translation_engine: {ENGINE_REVISION}\n"
                f"prompt_revision: {PROMPT_REVISION}\n"
                f"glossary_hash: {_hash(glossary_text)}\n"
                "---\n\n"
            )
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(header + render(blocks, units, translations), encoding="utf-8")

    if missing:
        raise SystemExit("Missing translation result(s):\n  " + "\n  ".join(missing))


def apply_page_dir(root: Path, locale_cfg: dict[str, Any]) -> list[tuple[str, Path]]:
    """Apply full-page ChatGPT translations while preserving source block identity.

    Files live under <root>/<locale>/<source-relative-path>. Each temporary page
    contains the translated Markdown body only (no front matter). The block
    structure and all protected literals must match the English source.
    """
    applied: list[tuple[str, Path]] = []
    if not root.exists():
        raise SystemExit(f"Page translation directory does not exist: {root}")

    glossary_text = GLOSSARY.read_text(encoding="utf-8") if GLOSSARY.exists() else ""

    for temp in sorted(root.rglob("*.md")):
        rel_to_root = temp.relative_to(root)
        if len(rel_to_root.parts) < 2:
            raise SystemExit(f"Expected <locale>/<path> under {root}: {rel_to_root}")
        locale = rel_to_root.parts[0]
        if locale == "en" or locale not in locale_cfg:
            raise SystemExit(f"Unknown/non-target locale in page batch: {locale}")
        relative = Path(*rel_to_root.parts[1:])
        source_path = SOURCE / relative
        if not source_path.exists():
            raise SystemExit(f"Unknown English source for page batch: {relative}")

        cfg = locale_cfg[locale]
        guidance = str(cfg.get("translation_guidance", ""))
        pairs = glossary_pairs(locale)
        source_text = source_path.read_text(encoding="utf-8")
        _, source_body = split_document(source_text)
        source_blocks = split_blocks(source_body)
        units = prepare_units(source_blocks, locale, pairs, guidance)

        translated_body = temp.read_text(encoding="utf-8")
        translated_blocks = split_blocks(translated_body)
        if len(translated_blocks) != len(source_blocks):
            raise SystemExit(
                f"{locale}:{relative}: translated block count {len(translated_blocks)} "
                f"does not match English block count {len(source_blocks)}"
            )

        translations: dict[str, str] = {}
        for index, (source_block, target_block, unit) in enumerate(
            zip(source_blocks, translated_blocks, units), 1
        ):
            if unit.verbatim:
                if target_block.text != source_block.text:
                    raise SystemExit(
                        f"{locale}:{relative}: block {index} is verbatim but changed"
                    )
                translations[unit.key] = source_block.text
                continue

            target_masked, target_mapping = mask_literals(target_block.text)
            if list(target_mapping.values()) != list(unit.placeholders.values()):
                raise SystemExit(
                    f"{locale}:{relative}: block {index} changed protected HTML/URL/code/math literals"
                )
            validate_candidate(unit, target_masked)
            translations[unit.key] = target_block.text

        header = (
            "---\n"
            f"source_hash: {digest(locale, source_text, glossary_text)}\n"
            f"translation_engine: {ENGINE_REVISION}\n"
            f"prompt_revision: {PROMPT_REVISION}\n"
            f"glossary_hash: {_hash(glossary_text)}\n"
            "---\n\n"
        )
        target = TRANSLATIONS / locale / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(header + render(source_blocks, units, translations), encoding="utf-8")
        applied.append((locale, relative))

    if not applied:
        raise SystemExit(f"No Markdown page translations found under {root}")
    return applied


def check(locale_cfg: dict[str, Any], locales: list[str], paths: list[Path]) -> list[str]:
    glossary_text = GLOSSARY.read_text(encoding="utf-8") if GLOSSARY.exists() else ""
    failures: list[str] = []
    for locale in locales:
        cfg = locale_cfg[locale]
        guidance = str(cfg.get("translation_guidance", ""))
        pairs = glossary_pairs(locale)
        for relative in paths:
            source_text = (SOURCE / relative).read_text(encoding="utf-8")
            _, source_body = split_document(source_text)
            target = TRANSLATIONS / locale / relative
            if not target.exists():
                failures.append(f"{locale}:{relative}: missing")
                continue
            meta, body = split_document(target.read_text(encoding="utf-8"))
            if meta.get("source_hash") != digest(locale, source_text, glossary_text):
                failures.append(f"{locale}:{relative}: stale source_hash")
            if meta.get("translation_engine") != ENGINE_REVISION:
                failures.append(f"{locale}:{relative}: legacy engine")
            if meta.get("prompt_revision") != PROMPT_REVISION:
                failures.append(f"{locale}:{relative}: stale prompt")
            units = prepare_units(split_blocks(source_body), locale, pairs, guidance)
            existing = parse_units(body)
            if list(existing) != [u.key for u in units]:
                failures.append(f"{locale}:{relative}: tx-unit sequence mismatch")
                continue
            for unit in units:
                text = existing[unit.key]
                if unit.verbatim and text != unit.source:
                    failures.append(f"{locale}:{relative}:{unit.id}: verbatim block changed")
                problem = degeneration(text)
                if problem:
                    failures.append(f"{locale}:{relative}:{unit.id}: {problem}")
    return failures


def main() -> int:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--prepare-queue", metavar="PATH")
    mode.add_argument("--apply-results", metavar="PATH")
    mode.add_argument("--apply-page-dir", metavar="DIR")
    mode.add_argument("--check-only", action="store_true")
    parser.add_argument("--locales", nargs="*")
    parser.add_argument("--paths", nargs="*")
    args = parser.parse_args()

    cfg, locales = selected_locales(args.locales)
    paths = source_paths(args.paths)

    if args.apply_page_dir:
        applied = apply_page_dir(Path(args.apply_page_dir), cfg)
        scoped_locales = sorted({locale for locale, _ in applied})
        scoped_paths = sorted({path for _, path in applied}, key=lambda p: p.as_posix())
        failures = check(cfg, scoped_locales, scoped_paths)
        if failures:
            print("Translation validation failed after full-page apply:")
            for item in failures:
                print(" ", item)
            return 1
        print(f"Applied and validated {len(applied)} full-page ChatGPT translation(s)")
        return 0

    # Result batches may intentionally cover only one or a few page/locale pairs.
    # When --apply-results is used without explicit selectors, infer the exact
    # batch scope from the result rows so ChatGPT can migrate the book page by page.
    prefetched_results: dict[str, Any] | None = None
    if args.apply_results and not args.locales and not args.paths:
        prefetched_results = json.loads(Path(args.apply_results).read_text(encoding="utf-8"))
        rows = prefetched_results.get("results")
        if not isinstance(rows, list) or not rows:
            raise SystemExit("Results JSON contains no results")
        inferred_locales = sorted({str(row.get("locale")) for row in rows if isinstance(row, dict)})
        inferred_paths = sorted({str(row.get("path")) for row in rows if isinstance(row, dict)})
        cfg, locales = selected_locales(inferred_locales)
        paths = source_paths(inferred_paths)

    if args.prepare_queue:
        data = queue(cfg, locales, paths)
        out = Path(args.prepare_queue)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        units = sum(len(page["units"]) for page in data["pages"])
        print(f"Translation queue: {len(data['pages'])} page-locale pair(s), {units} changed unit(s)")
        return 0

    if args.apply_results:
        data = prefetched_results or json.loads(Path(args.apply_results).read_text(encoding="utf-8"))
        apply_results(data, cfg, locales, paths)
        failures = check(cfg, locales, paths)
        if failures:
            print("Translation validation failed after apply:")
            for item in failures:
                print(" ", item)
            return 1
        print("Translation results applied and validated")
        return 0

    failures = check(cfg, locales, paths)
    if failures:
        print("Committed ChatGPT translations are incomplete/stale:")
        for item in failures:
            print(" ", item)
        return 1
    print("Committed ChatGPT translations are current")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
