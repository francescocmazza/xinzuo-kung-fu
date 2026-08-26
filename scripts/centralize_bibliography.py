#!/usr/bin/env python3
"""Move chapter-level bibliography blocks into one final bibliography page.

The book should contain bibliographic/source lists only in ``content/en/bibliography.md``.
This script is intentionally idempotent: once chapter source blocks have been moved,
subsequent runs preserve the existing centralized entries. If a later edit adds a new
source block to a chapter, its entries are merged into that chapter's bibliography
section and the local block is removed again.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "content" / "en"
BIBLIOGRAPHY = SOURCE_DIR / "bibliography.md"

BIBLIOGRAPHY_HEADER = """---
title: Bibliography
status: review
audience: general-reader
language: en
reviewed: 2026-08-26
translation_priority: high
---

# Bibliography

All bibliographic, technical and historical sources cited throughout the book are collected here so that the individual chapters remain focused on the explanation itself. Entries are grouped by the chapter in which they are used.
"""

SOURCE_HEADING_RE = re.compile(
    r"^(?P<level>#{2,6})\s+(?P<title>.+?)\s*$",
    re.IGNORECASE,
)
SOURCE_WORD_RE = re.compile(
    r"\b(?:bibliograph(?:y|ic)|references?|sources?|further\s+reading)\b",
    re.IGNORECASE,
)
START_MARKER_RE = re.compile(r"^<!-- bibliography-source: (?P<path>.+?) -->$")
END_MARKER = "<!-- /bibliography-source -->"

EXCLUDED_FILES = {
    BIBLIOGRAPHY.resolve(),
    (SOURCE_DIR / "README.md").resolve(),
}


def document_title(text: str, fallback: str) -> str:
    frontmatter = re.match(r"^---\n(?P<meta>.*?)\n---\n", text, re.DOTALL)
    if frontmatter:
        for line in frontmatter.group("meta").splitlines():
            if line.lower().startswith("title:"):
                value = line.split(":", 1)[1].strip().strip('"').strip("'")
                if value:
                    return value
    for line in text.splitlines():
        if line.startswith("# "):
            return line[2:].strip()
    return fallback


def find_trailing_source_heading(lines: list[str]) -> int | None:
    """Return the start of the last bibliography-like heading near the document end."""
    candidates: list[int] = []
    for index, line in enumerate(lines):
        match = SOURCE_HEADING_RE.match(line.strip())
        if not match:
            continue
        if SOURCE_WORD_RE.search(match.group("title")):
            candidates.append(index)

    if not candidates:
        return None

    # Bibliographic blocks in this book are terminal appendices to a chapter. Requiring
    # the candidate to be in the latter half prevents a conceptual heading such as
    # "source of ..." from being mistaken for a bibliography.
    minimum = max(0, len(lines) // 2)
    late = [index for index in candidates if index >= minimum]
    return late[-1] if late else None


def parse_existing_bibliography(text: str) -> dict[str, tuple[str, str]]:
    """Return path -> (chapter title, bibliography body) from generated markers."""
    sections: dict[str, tuple[str, str]] = {}
    lines = text.splitlines()
    index = 0
    while index < len(lines):
        start = START_MARKER_RE.match(lines[index].strip())
        if not start:
            index += 1
            continue
        path = start.group("path")
        index += 1
        title = Path(path).stem.replace("-", " ").title()
        if index < len(lines) and lines[index].startswith("## "):
            title = lines[index][3:].strip()
            index += 1
        body: list[str] = []
        while index < len(lines) and lines[index].strip() != END_MARKER:
            body.append(lines[index])
            index += 1
        sections[path] = (title, "\n".join(body).strip())
        index += 1
    return sections


def merge_bibliography_body(old: str, new: str) -> str:
    """Merge a later chapter source block without duplicating identical entries."""
    if not old:
        return new.strip()
    if not new:
        return old.strip()

    merged: list[str] = []
    seen: set[str] = set()
    for line in [*old.splitlines(), *new.splitlines()]:
        stripped = line.strip()
        if not stripped:
            if merged and merged[-1] != "":
                merged.append("")
            continue
        key = re.sub(r"\s+", " ", stripped)
        if key in seen:
            continue
        seen.add(key)
        merged.append(line.rstrip())
    while merged and not merged[-1]:
        merged.pop()
    return "\n".join(merged).strip()


def write_bibliography(sections: dict[str, tuple[str, str]]) -> None:
    parts = [BIBLIOGRAPHY_HEADER.rstrip(), ""]
    for path in sorted(sections):
        title, body = sections[path]
        if not body.strip():
            continue
        parts.extend(
            [
                f"<!-- bibliography-source: {path} -->",
                f"## {title}",
                "",
                body.strip(),
                END_MARKER,
                "",
            ]
        )
    BIBLIOGRAPHY.write_text("\n".join(parts).rstrip() + "\n", encoding="utf-8")


def main() -> int:
    existing_text = BIBLIOGRAPHY.read_text(encoding="utf-8") if BIBLIOGRAPHY.exists() else ""
    sections = parse_existing_bibliography(existing_text)
    changed_files: list[str] = []

    for path in sorted(SOURCE_DIR.rglob("*.md")):
        if path.resolve() in EXCLUDED_FILES:
            continue
        text = path.read_text(encoding="utf-8")
        lines = text.splitlines()
        start = find_trailing_source_heading(lines)
        if start is None:
            continue

        relative = path.relative_to(SOURCE_DIR).as_posix()
        title = document_title(text, path.stem)
        source_body = "\n".join(lines[start + 1 :]).strip()
        old_title, old_body = sections.get(relative, (title, ""))
        sections[relative] = (title or old_title, merge_bibliography_body(old_body, source_body))

        cleaned = "\n".join(lines[:start]).rstrip() + "\n"
        if cleaned != text:
            path.write_text(cleaned, encoding="utf-8")
            changed_files.append(relative)

    write_bibliography(sections)

    if changed_files:
        print("Centralized bibliography from:")
        for path in changed_files:
            print(f"- {path}")
    else:
        print("Bibliography already centralized; no chapter source blocks found.")
    print(f"Bibliography sections: {len(sections)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
