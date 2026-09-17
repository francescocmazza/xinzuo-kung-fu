#!/usr/bin/env python3
"""Compatibility entry point for the terminology-aware translation engine.

Public names are re-exported because repair_translated_html.py imports the
translator helpers lazily from this module.

This wrapper also installs a small safety layer around Marian constrained
decoding. A sentence that contains many mandatory technical terms is split
into natural clauses before generation. This prevents constrained beam search
from becoming combinatorially expensive or reaching the model length ceiling
before every required knife/metallurgy term has been emitted.

Every generated sub-clause is routed back through the same guard. This matters
because even a low-density two-term clause can still make Marian omit one forced
term; the recursive route gives that clause the conjunction fallback instead of
failing after a long full-book refresh.
"""

from __future__ import annotations

import re

import translation_engine as _engine
from translation_engine import *  # noqa: F401,F403


_ORIGINAL_GENERATE_UNIT = _engine.MarianTranslator._generate_unit
_CLAUSE_SEPARATOR_RE = re.compile(r"([,;:]\s+|\s+[—–]\s+)")
_CONJUNCTION_SEPARATOR_RE = re.compile(r"(\s+(?:and|or)\s+)", re.IGNORECASE)
_MAX_CONSTRAINTS_PER_UNIT = 2


def _split_constraint_units(text: str, terminology) -> list[str] | None:
    """Split a terminology-dense English sentence at safe clause boundaries.

    Separators are retained as their own list items so translated clauses can be
    joined without altering punctuation. Commas/semicolons/colons/dashes are
    preferred. If a dense segment still remains, coordinating conjunctions are
    used as a second-level split. We only accept a split when it actually lowers
    the maximum number of terminology constraints in an individual prose unit.
    """

    required_count = len(terminology.required_targets(text))
    if required_count <= _MAX_CONSTRAINTS_PER_UNIT:
        return None

    pieces = _CLAUSE_SEPARATOR_RE.split(text)
    if len(pieces) <= 1:
        pieces = _CONJUNCTION_SEPARATOR_RE.split(text)

    prose = [
        piece
        for piece in pieces
        if piece
        and not _CLAUSE_SEPARATOR_RE.fullmatch(piece)
        and not _CONJUNCTION_SEPARATOR_RE.fullmatch(piece)
    ]
    if len(prose) <= 1:
        return None

    # Recursively refine any still-dense clause at a conjunction. Do not split
    # ordinary low-density prose merely because it contains "and" or "or".
    refined: list[str] = []
    for piece in pieces:
        if not piece:
            continue
        if _CLAUSE_SEPARATOR_RE.fullmatch(piece) or _CONJUNCTION_SEPARATOR_RE.fullmatch(piece):
            refined.append(piece)
            continue

        if len(terminology.required_targets(piece)) > _MAX_CONSTRAINTS_PER_UNIT:
            subpieces = _CONJUNCTION_SEPARATOR_RE.split(piece)
            if len(subpieces) > 1:
                refined.extend(subpieces)
                continue
        refined.append(piece)

    refined_prose = [
        piece
        for piece in refined
        if piece
        and not _CLAUSE_SEPARATOR_RE.fullmatch(piece)
        and not _CONJUNCTION_SEPARATOR_RE.fullmatch(piece)
    ]
    if not refined_prose:
        return None

    if max(len(terminology.required_targets(piece)) for piece in refined_prose) >= required_count:
        return None
    return refined


def _generate_unit_with_constraint_splitting(self, text: str) -> str:
    """Generate one unit, recursively splitting when constrained MT drops a term."""

    pieces = _split_constraint_units(text, self.terminology)
    if pieces:
        output: list[str] = []
        for piece in pieces:
            if not piece:
                continue
            if _CLAUSE_SEPARATOR_RE.fullmatch(piece) or _CONJUNCTION_SEPARATOR_RE.fullmatch(piece):
                output.append(piece)
                continue

            # Always route prose subpieces through this wrapper. A piece with only
            # one or two controlled terms can still fail constrained decoding and
            # needs the same conjunction fallback as a top-level unit.
            output.append(_generate_unit_with_constraint_splitting(self, piece))

        translated = "".join(output)
        missing = self.terminology.missing_targets(text, translated)
        if not missing:
            return translated
        raise RuntimeError(
            f"{self.locale}: clause-split constrained translation omitted controlled "
            f"term(s) {', '.join(missing)} while translating: {text!r}"
        )

    try:
        return _ORIGINAL_GENERATE_UNIT(self, text)
    except RuntimeError as exc:
        # If Marian still misses a term in a low-density unit, make one last
        # attempt to split at a coordinating conjunction before failing closed.
        if "constrained translation omitted controlled term(s)" not in str(exc):
            raise
        fallback = _CONJUNCTION_SEPARATOR_RE.split(text)
        if len(fallback) <= 1:
            raise

        output: list[str] = []
        for piece in fallback:
            if not piece:
                continue
            if _CONJUNCTION_SEPARATOR_RE.fullmatch(piece):
                output.append(piece)
            else:
                output.append(_generate_unit_with_constraint_splitting(self, piece))
        translated = "".join(output)
        missing = self.terminology.missing_targets(text, translated)
        if missing:
            raise RuntimeError(
                f"{self.locale}: fallback constrained translation omitted controlled "
                f"term(s) {', '.join(missing)} while translating: {text!r}"
            ) from exc
        return translated


_engine.MarianTranslator._generate_unit = _generate_unit_with_constraint_splitting
# Keep the re-exported name explicitly tied to the patched class for lazy imports.
MarianTranslator = _engine.MarianTranslator


if __name__ == "__main__":
    raise SystemExit(main())
