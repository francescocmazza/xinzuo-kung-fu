#!/usr/bin/env python3
"""Repair translated markup/literals if Marian placeholders leak into output.

Older translations may contain damaged temporary placeholders such as
``KBTOKEN`` or ``KBLINK``. These placeholders protected raw HTML, inline code,
URLs, links, formulae and other literals while prose was sent through Marian.

This repair is deterministic and does not call a translation model. When English
and translated bodies remain line-aligned, damaged protected literals are restored
from the English line while retaining the translated surrounding prose. If a
literal cannot be recovered unambiguously, that one line falls back to the English
source rather than publishing corrupted markup. Raw HTML structure is then checked
and, when needed, restored from the English source or from complete figure blocks.
"""

from __future__ import annotations

import re
from pathlib import Path

from multilingual_site import LOCALES, SOURCE, TRANSLATIONS, read_yaml, split_document

TOKEN_HINT_RE = re.compile(r"KB(?:TO|LINK)", re.IGNORECASE)
# Old Marian output exists both as bare KBLINK000/KBTOKEN000 and wrapped in
# braces such as {KBLINK000}. Consume the wrapper too so restoration cannot
# leave invalid Markdown like {[label](target)} behind.
TOKEN_FRAGMENT_RE = re.compile(
    r"\{?[A-Za-z0-9]*KB(?:TO|LINK)[A-Za-z0-9]*\}?", re.IGNORECASE
)
FIGCAPTION_RE = re.compile(r"<figcaption>(.*?)</figcaption>", re.IGNORECASE | re.DOTALL)
FIGURE_BLOCK_RE = re.compile(r"<figure\b[^>]*>.*?</figure>", re.IGNORECASE | re.DOTALL)
HTML_TAG_RE = re.compile(r"</?[A-Za-z][^>]*>")
# Keep the same body boundary used by multilingual_site.split_document(): the
# newline after the closing front-matter delimiter belongs to the body. The old
# pattern swallowed that newline, making every otherwise line-aligned translated
# document appear one line shorter than its English source and disabling literal
# recovery outside figure blocks.
FRONTMATTER_RE = re.compile(r"\A(---\n.*?\n---\n)(.*)\Z", re.DOTALL)
PROTECTED_LITERAL_RE = re.compile(
    r"!?\[[^]\n]+\]\([^)\n]+\)"
    r"|`[^`\n]+`"
    r"|https?://[^\s)>]+"
    r"|\$[^$\n]+\$"
    r"|The Gongfu of Xinzuo"
    r"|</?[A-Za-z][^>]*>",
    re.IGNORECASE,
)


def _translation_body_with_header(text: str) -> tuple[str, str]:
    match = FRONTMATTER_RE.match(text)
    if not match:
        raise RuntimeError("Translated Markdown is missing its expected front matter")
    return match.group(1), match.group(2)


def _line_ending(line: str) -> str:
    return "\n" if line.endswith("\n") else ""


def _source_literals(line: str) -> list[str]:
    """Return protected source literals in their physical left-to-right order."""

    return [match.group(0) for match in PROTECTED_LITERAL_RE.finditer(line)]


def _repair_literal_line(source_line: str, target_line: str) -> str:
    """Recover damaged Marian placeholders while preserving translated prose."""

    if not TOKEN_HINT_RE.search(target_line):
        return target_line

    token_matches = list(TOKEN_FRAGMENT_RE.finditer(target_line))
    literals = _source_literals(source_line)

    if token_matches and len(token_matches) == len(literals):
        repaired = target_line
        for token_match, literal in reversed(list(zip(token_matches, literals))):
            repaired = repaired[: token_match.start()] + literal + repaired[token_match.end() :]
        if not TOKEN_HINT_RE.search(repaired):
            return repaired

    # Ambiguous recovery is deliberately fail-safe: preserve correctness by using
    # the source line rather than publishing a damaged token or malformed URL/tag.
    source_core = source_line[:-1] if source_line.endswith("\n") else source_line
    return source_core + (_line_ending(target_line) or _line_ending(source_line))


def _repair_literals_by_alignment(
    source_lines: list[str], target_lines: list[str]
) -> list[str] | None:
    """Repair placeholder residues when source/translation line alignment survives."""

    if len(source_lines) != len(target_lines):
        return None

    repaired = list(target_lines)
    for index, target_line in enumerate(target_lines):
        if TOKEN_HINT_RE.search(target_line):
            repaired[index] = _repair_literal_line(source_lines[index], target_line)
    return repaired


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


def _restore_html_lines_by_alignment(
    source_lines: list[str], target_lines: list[str]
) -> str | None:
    """Restore raw-HTML source lines when physical line alignment is intact."""

    if len(source_lines) != len(target_lines):
        return None

    repaired = list(target_lines)
    for index, source_line in enumerate(source_lines):
        if HTML_TAG_RE.search(source_line):
            target_line = repaired[index]
            if TOKEN_HINT_RE.search(target_line):
                repaired[index] = _repair_literal_line(source_line, target_line)
            elif not HTML_TAG_RE.search(target_line):
                repaired[index] = source_line
    return "".join(repaired)


def _restore_figure_blocks(source_body: str, target_body: str, target_path: Path) -> str:
    """Restore complete source figure blocks when translated HTML lost structure."""

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

    # Most translation files contain no leaked placeholders. Return before making
    # structural assumptions about human-edited translations.
    if not TOKEN_HINT_RE.search(target_text):
        return False

    source_text = source_path.read_text(encoding="utf-8")
    _, source_body = split_document(source_text)
    header, target_body = _translation_body_with_header(target_text)

    source_lines = source_body.splitlines(keepends=True)
    target_lines = target_body.splitlines(keepends=True)

    # First recover all damaged inline literals if line alignment survived. This
    # removes code/link/url placeholder residues before HTML slot accounting, so a
    # literal such as ``assets/foo.svg`` can never be mistaken for a missing tag.
    aligned_literals = _repair_literals_by_alignment(source_lines, target_lines)
    if aligned_literals is not None:
        target_lines = aligned_literals
        target_body = "".join(target_lines)

    source_html_slots = [line for line in source_lines if HTML_TAG_RE.search(line)]
    target_html_indexes = [
        index for index, line in enumerate(target_lines) if HTML_TAG_RE.search(line)
    ]

    if len(source_html_slots) != len(target_html_indexes):
        aligned_body = _restore_html_lines_by_alignment(source_lines, target_lines)
        if aligned_body is not None:
            target_body = aligned_body
        else:
            target_body = _restore_figure_blocks(source_body, target_body, target_path)

        target_lines = target_body.splitlines(keepends=True)
        target_html_indexes = [
            index for index, line in enumerate(target_lines) if HTML_TAG_RE.search(line)
        ]
        if len(source_html_slots) != len(target_html_indexes):
            raise RuntimeError(
                f"Cannot safely repair {target_path}: HTML structural slot counts still differ "
                f"after structural restoration ({len(source_html_slots)} source vs "
                f"{len(target_html_indexes)} translation)"
            )

    # A final aligned literal pass also handles any placeholder residue exposed by
    # structural restoration.
    final_lines = _repair_literals_by_alignment(source_lines, target_lines)
    if final_lines is not None:
        target_lines = final_lines

    repaired_body = "".join(target_lines)
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
                print(f"Repaired translated markup/literals: {locale}/{relative}")

    print(f"Translated markup integrity check complete: {checked} file(s), {changed} repaired")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
