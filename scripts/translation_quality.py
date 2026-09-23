#!/usr/bin/env python3
"""Fail-closed quality checks for generated translations.

This module catches machine-translation failure modes that structural/hash checks
cannot detect: runaway token loops, repeated phrases, implausible expansion and
Italian headings that have been copied from English unchanged.

The checks are deliberately conservative. They target obvious degeneration, not
subjective prose quality. The translator calls quality_issues_for_pair() before a
page is written; workflows also run this file across committed/generated active
translations before publication.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

from multilingual_site import LOCALES, SOURCE, TRANSLATIONS, read_yaml, split_document

WORD_RE = re.compile(r"[^\W_]+(?:-[^\W_]+)*", re.UNICODE)
HEADING_RE = re.compile(r"^(#{1,6})\s+(.+?)\s*$")

MAX_IDENTICAL_TOKEN_RUN = 4
MAX_CONSECUTIVE_PHRASE_REPEATS = 3
MIN_EXPANSION_CHARS = 240
MAX_CHAR_EXPANSION_RATIO = 3.8
MAX_WORD_EXPANSION_RATIO = 3.6

ITALIAN_IDENTICAL_HEADING_ALLOWLIST = {
    "The Gongfu of Xinzuo",
}


@dataclass(frozen=True)
class TranslationQualityIssue:
    line: int
    code: str
    detail: str

    def render(self, relative: Path | str, locale: str) -> str:
        return f"{locale}:{relative}:{self.line}: {self.code}: {self.detail}"


def _words(text: str) -> list[str]:
    return [word.casefold() for word in WORD_RE.findall(text)]


def _same_token_loop(words: list[str]) -> tuple[str, int] | None:
    previous: str | None = None
    run = 0
    for word in words:
        if word == previous:
            run += 1
        else:
            previous = word
            run = 1
        if (
            run > MAX_IDENTICAL_TOKEN_RUN
            and len(word) >= 2
            and any(char.isalpha() for char in word)
        ):
            return word, run
    return None


def _repeated_phrase_loop(words: list[str]) -> tuple[str, int] | None:
    # Two- to six-word loops catch patterns such as "fondello del manico"
    # repeating many times while avoiding ordinary single-word emphasis.
    if len(words) < 8:
        return None
    for width in range(2, min(6, len(words) // 4) + 1):
        for start in range(0, len(words) - width * 4 + 1):
            phrase = words[start : start + width]
            if not any(any(char.isalpha() for char in token) for token in phrase):
                continue
            repeats = 1
            cursor = start + width
            while (
                cursor + width <= len(words)
                and words[cursor : cursor + width] == phrase
            ):
                repeats += 1
                cursor += width
            if repeats > MAX_CONSECUTIVE_PHRASE_REPEATS:
                return " ".join(phrase), repeats
    return None


def _looks_like_table(line: str) -> bool:
    return line.count("|") >= 2


def _identical_italian_heading(source_line: str, target_line: str) -> str | None:
    source_match = HEADING_RE.match(source_line.strip())
    target_match = HEADING_RE.match(target_line.strip())
    if not source_match or not target_match:
        return None
    source_heading = source_match.group(2).strip()
    target_heading = target_match.group(2).strip()
    if source_heading != target_heading:
        return None
    if source_heading in ITALIAN_IDENTICAL_HEADING_ALLOWLIST:
        return None

    words = _words(source_heading)
    # Single-token headings are often international knife names (Gyuto,
    # Santoku, AUS-10, etc.). Multi-word English headings should not silently
    # survive unchanged in the Italian edition.
    if len(words) < 2:
        return None
    return source_heading


def quality_issues_for_pair(
    source_body: str,
    translated_body: str,
    locale: str,
) -> list[TranslationQualityIssue]:
    """Return objective quality failures for one source/translation body pair."""

    issues: list[TranslationQualityIssue] = []
    source_lines = source_body.splitlines()
    target_lines = translated_body.splitlines()

    for index, target_line in enumerate(target_lines, start=1):
        words = _words(target_line)
        same_loop = _same_token_loop(words)
        if same_loop:
            token, count = same_loop
            issues.append(
                TranslationQualityIssue(
                    index,
                    "repeated-token-loop",
                    f"{token!r} repeats at least {count} times consecutively",
                )
            )

        if not _looks_like_table(target_line):
            phrase_loop = _repeated_phrase_loop(words)
            if phrase_loop:
                phrase, count = phrase_loop
                issues.append(
                    TranslationQualityIssue(
                        index,
                        "repeated-phrase-loop",
                        f"{phrase!r} repeats {count} times consecutively",
                    )
                )

    # Line-by-line expansion and untranslated-heading checks are valid only while
    # the translator's structure-preserving invariant is intact.
    if len(source_lines) == len(target_lines):
        for index, (source_line, target_line) in enumerate(
            zip(source_lines, target_lines),
            start=1,
        ):
            source_words = _words(source_line)
            target_words = _words(target_line)

            if (
                len(target_line) >= MIN_EXPANSION_CHARS
                and len(source_line.strip()) >= 20
                and len(target_line) > len(source_line) * MAX_CHAR_EXPANSION_RATIO
                and len(target_words)
                > max(24, len(source_words) * MAX_WORD_EXPANSION_RATIO)
            ):
                issues.append(
                    TranslationQualityIssue(
                        index,
                        "implausible-expansion",
                        (
                            f"target line expanded from {len(source_line)} to "
                            f"{len(target_line)} characters"
                        ),
                    )
                )

            if locale == "it":
                heading = _identical_italian_heading(source_line, target_line)
                if heading:
                    issues.append(
                        TranslationQualityIssue(
                            index,
                            "untranslated-heading",
                            f"Italian heading is unchanged English: {heading!r}",
                        )
                    )

    # Avoid flooding logs with many manifestations of the same broken line while
    # still preserving enough context to diagnose more than one failure.
    deduped: list[TranslationQualityIssue] = []
    seen: set[tuple[int, str]] = set()
    for issue in issues:
        key = (issue.line, issue.code)
        if key in seen:
            continue
        seen.add(key)
        deduped.append(issue)
    return deduped


def validate_tree() -> list[str]:
    locale_cfg = read_yaml(LOCALES).get("locales", {})
    active = [
        code
        for code, cfg in locale_cfg.items()
        if code != "en" and cfg.get("deploy")
    ]

    rendered: list[str] = []
    for locale in active:
        locale_root = TRANSLATIONS / locale
        for source_path in sorted(SOURCE.rglob("*.md")):
            if source_path.name == "README.md":
                continue
            relative = source_path.relative_to(SOURCE)
            target_path = locale_root / relative
            if not target_path.exists():
                continue

            _, source_body = split_document(source_path.read_text(encoding="utf-8"))
            _, target_body = split_document(target_path.read_text(encoding="utf-8"))
            for issue in quality_issues_for_pair(source_body, target_body, locale):
                rendered.append(issue.render(relative, locale))
    return rendered


def main() -> int:
    failures = validate_tree()
    if failures:
        print("Translation quality guard rejected the following output:")
        for failure in failures[:100]:
            print(f"  {failure}")
        if len(failures) > 100:
            print(f"  ... and {len(failures) - 100} more issue(s)")
        return 1

    print("Translation quality guard: no degeneration detected")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
