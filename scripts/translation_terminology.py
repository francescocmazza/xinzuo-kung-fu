#!/usr/bin/env python3
"""Controlled terminology for the multilingual knife guide.

The glossary is deliberately independent from the MT model. The translation
engine asks this module which target-language technical phrases are mandatory
for each source sentence, then uses constrained decoding and a post-generation
check so a generic MT model cannot silently replace them with unrelated words.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import yaml

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_GLOSSARY = ROOT / "glossaries" / "master-terms.yml"


@dataclass(frozen=True)
class TermForm:
    key: str
    source: str
    target: str
    preserve_name: bool = False

    @property
    def pattern(self) -> re.Pattern[str]:
        left = r"(?<!\w)" if self.source and self.source[0].isalnum() else ""
        right = r"(?!\w)" if self.source and self.source[-1].isalnum() else ""
        return re.compile(left + re.escape(self.source) + right, re.IGNORECASE)


@dataclass(frozen=True)
class TermMatch:
    start: int
    end: int
    form: TermForm


class Terminology:
    def __init__(self, locale: str, forms: Iterable[TermForm]) -> None:
        self.locale = locale
        self.forms = tuple(
            sorted(forms, key=lambda item: (-len(item.source), item.source.casefold(), item.key))
        )

    def matches(self, source_text: str) -> list[TermMatch]:
        """Return longest non-overlapping glossary matches in source order."""

        candidates: list[TermMatch] = []
        for form in self.forms:
            for match in form.pattern.finditer(source_text):
                candidates.append(TermMatch(match.start(), match.end(), form))

        # Longest source phrase wins when terms overlap (for example
        # "full tang" over "tang", or "single bevel" over "bevel").
        candidates.sort(
            key=lambda item: (
                -(item.end - item.start),
                item.start,
                item.form.source.casefold(),
            )
        )

        selected: list[TermMatch] = []
        occupied: list[tuple[int, int]] = []
        for candidate in candidates:
            if any(candidate.start < end and candidate.end > start for start, end in occupied):
                continue
            selected.append(candidate)
            occupied.append((candidate.start, candidate.end))

        selected.sort(key=lambda item: (item.start, item.end))
        return selected

    def required_targets(self, source_text: str) -> list[str]:
        """Return unique mandatory target phrases for a source segment."""

        result: list[str] = []
        seen: set[str] = set()
        for match in self.matches(source_text):
            key = match.form.target.casefold()
            if key in seen:
                continue
            seen.add(key)
            result.append(match.form.target)
        return result

    def missing_targets(self, source_text: str, translated_text: str) -> list[str]:
        """Return required technical phrases absent from generated text."""

        translated_folded = translated_text.casefold()
        return [
            target
            for target in self.required_targets(source_text)
            if target.casefold() not in translated_folded
        ]


def _term_forms(entry_key: str, entry: dict, locale: str) -> list[TermForm]:
    if not entry.get("enforce", False):
        return []

    preserve = bool(entry.get("preserve_name", False))
    forms_cfg = entry.get("forms")
    if forms_cfg:
        forms: list[TermForm] = []
        for index, form in enumerate(forms_cfg):
            if not isinstance(form, dict):
                raise ValueError(f"{entry_key}.forms[{index}] must be a mapping")
            source = str(form.get("en", "")).strip()
            target = str(form.get(locale, "")).strip()
            if not source:
                raise ValueError(f"{entry_key}.forms[{index}] is missing its English source form")
            if not target:
                raise ValueError(
                    f"{entry_key}.forms[{index}] has no controlled {locale} translation"
                )
            forms.append(TermForm(entry_key, source, target, preserve))
        return forms

    source = str(entry.get("source_en", "")).strip()
    target = str(entry.get(locale, "")).strip()
    if not source:
        raise ValueError(f"{entry_key} is missing source_en")
    if not target:
        raise ValueError(f"{entry_key} has no controlled {locale} translation")
    return [TermForm(entry_key, source, target, preserve)]


def load_terminology(locale: str, path: Path = DEFAULT_GLOSSARY) -> Terminology:
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    if int(data.get("version", 0)) < 2:
        raise ValueError(
            "The controlled terminology glossary must use version 2 or later."
        )
    terms = data.get("terms")
    if not isinstance(terms, dict) or not terms:
        raise ValueError("The controlled terminology glossary has no terms.")

    forms: list[TermForm] = []
    for key, entry in terms.items():
        if not isinstance(entry, dict):
            raise ValueError(f"Glossary term {key} must be a mapping")
        forms.extend(_term_forms(str(key), entry, locale))

    if not forms:
        raise ValueError(f"No enforced terminology is configured for locale {locale}.")
    return Terminology(locale, forms)


def validate_active_locales(
    locales: Iterable[str],
    path: Path = DEFAULT_GLOSSARY,
) -> dict[str, int]:
    """Fail fast if an active locale lacks any mandatory glossary translation."""

    counts: dict[str, int] = {}
    for locale in locales:
        terminology = load_terminology(locale, path)
        counts[locale] = len(terminology.forms)
    return counts
