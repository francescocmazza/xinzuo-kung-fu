#!/usr/bin/env python3
"""Repair translated raw-HTML lines if translation placeholders leaked into output.

The automatic translation layer protects HTML tags with temporary tokens. Older
translations can contain damaged remnants of those tokens (for example
``KBTOKEN``/``KBTO``), which may turn an image tag into an invalid relative URL and
break PDF rendering. This script restores the HTML structure from the English
source while retaining a translated figcaption when it can be recovered safely.

If a translation model has dropped enough protected tags that line-by-line slot
repair is no longer safe, the complete figure block is restored from the English
source. This deliberately prefers an intact figure with source-language SVG labels
over publishing malformed HTML/SVG. A translated figcaption is still retained when
it can be recovered without placeholder residue.

It is intentionally deterministic and does not call a translation model. It can
therefore run before every build/export as a final markup-integrity guard.
"""

from __future__ import annotations

import re
from pathlib import Path

from multilingual_site import LOCALES, SOURCE, TRANSLATIONS, read_yaml, split_document

TOKEN_HINT_RE = re.compile(r"KBTO", re.IGNORECASE)
TOKEN_FRAGMENT_RE = re.compile(r"Z*KBT[A-Z]*\d{3}Z*", re.IGNORECASE)
FIGCAPTION_RE = re.compile(r"<figcaption>(.*?)</figcaption>", re.IGNORECASE | re.DOTALL)
FIGURE_BLOCK_RE = re.compile(r"<figure\b[^>]*>.*?</figure>", re.IGNORECASE | re.DOTALL)
HTML_TAG_RE = re.compile(r"<[^>]+>")
FRONTMATTER_RE = re.compile(r"\A(---\n.*?\n---\n\n?)(.*)\Z", re.DOTALL)


def _translation_body_with_header(text: str) -> tuple[str, str]:
    match = FRONTMATTER_RE.match(text)
    if not match:
        raise RuntimeError("Translated Markdown is missing its expected front matter")
    return match.group(1), match.group(2)


def _line_ending(line: str) -> str:
    return "\n" if line.endswith("\n") else ""


def _clean_recovered_caption(target_line: str) -> str:
    match = FIGCAPTION_RE.search(target_line)
    if match:
        candidate = match.group(1)
    else:
        candidate = HTML_TAG_RE.sub(" ", target_line)

    candidate = TOKEN_FRAGMENT_RE.sub(" ", candidate)
    candidate = re.sub(r"\bZ{2,}\b", " ", candidate)
    candidate = re.sub(r"\s+", " ", candidate).strip()
    return candidate


def _repair_line(source_line: str, target_line: str) -> str:
    if not TOKEN_HINT_RE.search(target_line):
        return target_line

    source_core = source_line[:-1] if source_line.endswith("\n") else source_line
    ending = _line_ending(target_line) or _line_ending(source_line)

    if not HTML_TAG_RE.search(source_core):
        return target_line

    source_caption = FIGCAPTION_RE.search(source_core)
    if not source_caption:
        return source_core + ending

    recovered = _clean_recovered_caption(target_line)
    if not recovered or "src=" in recovered.lower() or "alt=" in recovered.lower():
        recovered = source_caption.group(1)

    repaired_core = (
        source_core[: source_caption.start(1)]
        + recovered
        + source_core[source_caption.end(1) :]
    )
    return repaired_core + ending


def _restore_figure_blocks(source_body: str, target_body: str, target_path: Path) -> str:
    """Restore complete source figure blocks when translated HTML lost structure.

    Figure boundaries are much coarser and safer alignment anchors than individual
    SVG/HTML tags. The source block is copied byte-for-byte, while a clean translated
    figcaption is retained where possible. SVG labels may therefore fall back to
    English in the exceptional recovery case, but the published figure remains valid.
    """

    source_figures = list(FIGURE_BLOCK_RE.finditer(source_body))
    target_figures = list(FIGURE_BLOCK_RE.finditer(target_body))
    if not source_figures or len(source_figures) != len(target_figures):
        raise RuntimeError(
            f"Cannot safely repair {target_path}: figure block counts differ "
            f"({len(source_figures)} source vs {len(target_figures)} translation)"
        )

    repaired = target_body
    for source_match, target_match in reversed(list(zip(source_figures, target_figures))):
        source_block = source_match.group(0)
        target_block = target_match.group(0)

        source_caption = FIGCAPTION_RE.search(source_block)
        target_caption = FIGCAPTION_RE.search(target_block)
        if source_caption and target_caption:
            recovered = _clean_recovered_caption(target_caption.group(0))
            if recovered and not TOKEN_HINT_RE.search(recovered):
                source_block = (
                    source_block[: source_caption.start(1)]
                    + recovered
                    + source_block[source_caption.end(1) :]
                )

        repaired = repaired[: target_match.start()] + source_block + repaired[target_match.end() :]

    return repaired


def repair_file(source_path: Path, target_path: Path) -> bool:
    target_text = target_path.read_text(encoding="utf-8")

    # Most translation files contain no leaked placeholders. Return before any
    # structural assumptions so unrelated, human-edited translations are not
    # required to have exactly the same physical line count as English.
    if not TOKEN_HINT_RE.search(target_text):
        return False

    source_text = source_path.read_text(encoding="utf-8")
    _, source_body = split_document(source_text)
    header, target_body = _translation_body_with_header(target_text)

    source_lines = source_body.splitlines(keepends=True)
    target_lines = target_body.splitlines(keepends=True)

    # Translation may legitimately add or remove a prose line, so do not align
    # the whole document by physical line number. Raw HTML blocks, however,
    # retain their order. Treat every source HTML line as a structural slot and
    # pair it with every translated line that either still contains HTML or has
    # leaked one of the temporary HTML-protection tokens.
    source_html_slots = [line for line in source_lines if HTML_TAG_RE.search(line)]
    target_htmlish_indexes = [
        index
        for index, line in enumerate(target_lines)
        if HTML_TAG_RE.search(line) or TOKEN_HINT_RE.search(line)
    ]

    if len(source_html_slots) != len(target_htmlish_indexes):
        target_body = _restore_figure_blocks(source_body, target_body, target_path)
        target_lines = target_body.splitlines(keepends=True)
        target_htmlish_indexes = [
            index
            for index, line in enumerate(target_lines)
            if HTML_TAG_RE.search(line) or TOKEN_HINT_RE.search(line)
        ]
        if len(source_html_slots) != len(target_htmlish_indexes):
            raise RuntimeError(
                f"Cannot safely repair {target_path}: HTML structural slot counts still differ "
                f"after figure restoration ({len(source_html_slots)} source vs "
                f"{len(target_htmlish_indexes)} translation)"
            )

    repaired_lines = list(target_lines)
    for source_line, target_index in zip(source_html_slots, target_htmlish_indexes):
        target_line = repaired_lines[target_index]
        if TOKEN_HINT_RE.search(target_line):
            repaired_lines[target_index] = _repair_line(source_line, target_line)

    repaired_body = "".join(repaired_lines)

    if TOKEN_HINT_RE.search(repaired_body):
        residues = [
            line.strip()
            for line in repaired_body.splitlines()
            if TOKEN_HINT_RE.search(line)
        ][:5]
        raise RuntimeError(
            f"Unrepaired translation placeholder residue remains in {target_path}: {residues}"
        )

    repaired_text = header + repaired_body
    if repaired_text == target_text:
        return False

    target_path.write_text(repaired_text, encoding="utf-8")
    return True


def main() -> int:
    locale_cfg = read_yaml(LOCALES).get("locales", {})
    active = [
        code
        for code, cfg in locale_cfg.items()
        if code != "en" and cfg.get("deploy")
    ]

    changed = 0
    checked = 0
    for locale in active:
        locale_root = TRANSLATIONS / locale
        for target_path in sorted(locale_root.rglob("*.md")):
            relative = target_path.relative_to(locale_root)
            source_path = SOURCE / relative
            if not source_path.exists():
                continue
            checked += 1
            if repair_file(source_path, target_path):
                changed += 1
                print(f"Repaired translated HTML: {locale}/{relative}")

    print(f"Translated HTML integrity check complete: {checked} file(s), {changed} repaired")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())