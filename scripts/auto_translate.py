#!/usr/bin/env python3
"""Compatibility entry point for the terminology-aware translation engine.

Public names are re-exported because repair_translated_html.py imports the
translator helpers lazily from this module.

The first controlled-terminology implementation forced every glossary phrase
through Marian constrained beam search. That was both very slow on CPU and
could still fail after a long full-book refresh when Marian did not emit a
required phrase. This wrapper now uses a three-stage strategy:

1. translate normally first and accept the result when all controlled terms are
   already correct;
2. if terminology is missing, split dense sentences and/or retry that small unit
   with constrained decoding;
3. if Marian still omits a required phrase, fall back to deterministic glossary
   insertion while translating only the prose around the matched technical term.

The final terminology check remains strict, but a model quirk can no longer
waste an hour of CI and abort the whole publication. Output is line-buffered so
GitHub Actions shows page progress while the refresh is running.

On the main publication workflow, each fully translated page is also committed
and pushed immediately with ``[skip ci]``. A later model error, runner failure,
or job timeout therefore loses at most the page currently being generated.
The next publication run resumes automatically because checkpointed pages carry
current source/engine/glossary metadata and are no longer considered stale.
"""

from __future__ import annotations

import os
import re
import subprocess
import sys
import time
from pathlib import Path

import translation_engine as _engine
from translation_engine import *  # noqa: F401,F403


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(line_buffering=True)
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(line_buffering=True)

_CLAUSE_SEPARATOR_RE = re.compile(r"([,;:]\s+|\s+[—–]\s+)")
_CONJUNCTION_SEPARATOR_RE = re.compile(r"(\s+(?:and|or)\s+)", re.IGNORECASE)
_MAX_CONSTRAINTS_PER_UNIT = 2
_NORMAL_BEAMS = 2
_CONSTRAINED_BEAMS = 2
_MAX_NEW_TOKENS = 256

_ORIGINAL_PATH_WRITE_TEXT = Path.write_text
_CHECKPOINT_WORKFLOW = "Publish book, PDFs and GitHub Pages"
_CHECKPOINT_BRANCH = "main"
_CHECKPOINT_PUSH_RETRIES = 3
_CHECKPOINT_RETRY_DELAYS = (2, 5, 10)


def _checkpoint_enabled() -> bool:
    """Return True only inside the write-enabled main publication workflow."""

    return (
        os.getenv("GITHUB_ACTIONS", "").lower() == "true"
        and os.getenv("GITHUB_WORKFLOW") == _CHECKPOINT_WORKFLOW
        and os.getenv("GITHUB_REF") == f"refs/heads/{_CHECKPOINT_BRANCH}"
    )


def _repo_relative(path: Path) -> Path:
    """Return a repository-relative path suitable for git commands."""

    resolved = path.resolve()
    root = Path.cwd().resolve()
    try:
        return resolved.relative_to(root)
    except ValueError as exc:
        raise RuntimeError(f"Translation checkpoint path is outside the repository: {path}") from exc


def _is_translation_page(path: Path) -> bool:
    """Limit automatic checkpoints to completed Markdown translation pages."""

    if path.suffix.lower() != ".md":
        return False
    try:
        path.resolve().relative_to(_engine.TRANSLATIONS.resolve())
        return True
    except ValueError:
        return False


def _run_git(args: list[str], *, check: bool = True) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(
        ["git", *args],
        text=True,
        capture_output=True,
        check=False,
    )
    if check and result.returncode != 0:
        detail = (result.stderr or result.stdout).strip()
        raise RuntimeError(f"git {' '.join(args)} failed: {detail}")
    return result


def _checkpoint_translation_page(path: Path) -> None:
    """Commit and push one completed translation page immediately.

    The page has already been fully generated and written before this function is
    called. If the push cannot be persisted after a few retries, fail promptly
    instead of spending more compute on work that could be lost.
    """

    relative = _repo_relative(path)
    relative_text = relative.as_posix()

    _run_git(["config", "user.name", "github-actions[bot]"])
    _run_git(
        [
            "config",
            "user.email",
            "41898282+github-actions[bot]@users.noreply.github.com",
        ]
    )
    _run_git(["add", "--", relative_text])

    staged = _run_git(
        ["diff", "--cached", "--quiet", "--", relative_text],
        check=False,
    )
    if staged.returncode == 0:
        return
    if staged.returncode not in (0, 1):
        detail = (staged.stderr or staged.stdout).strip()
        raise RuntimeError(f"Unable to inspect translation checkpoint {relative_text}: {detail}")

    _run_git(
        [
            "commit",
            "-m",
            f"Checkpoint translation {relative_text} [skip ci]",
        ]
    )

    last_error = "unknown push failure"
    for attempt in range(1, _CHECKPOINT_PUSH_RETRIES + 1):
        pushed = _run_git(
            ["push", "origin", f"HEAD:{_CHECKPOINT_BRANCH}"],
            check=False,
        )
        if pushed.returncode == 0:
            print(f"  checkpointed {relative_text} to {_CHECKPOINT_BRANCH}", flush=True)
            return

        last_error = (pushed.stderr or pushed.stdout).strip()
        if attempt < _CHECKPOINT_PUSH_RETRIES:
            delay = _CHECKPOINT_RETRY_DELAYS[attempt - 1]
            print(
                f"  checkpoint push attempt {attempt} failed for {relative_text}; "
                f"retrying in {delay}s",
                flush=True,
            )
            time.sleep(delay)

    raise RuntimeError(
        f"Unable to persist translation checkpoint {relative_text} after "
        f"{_CHECKPOINT_PUSH_RETRIES} attempts: {last_error}"
    )


def _checkpointing_write_text(self: Path, data: str, *args, **kwargs) -> int:
    """Wrap Path.write_text so a completed translated page becomes durable."""

    written = _ORIGINAL_PATH_WRITE_TEXT(self, data, *args, **kwargs)
    if _checkpoint_enabled() and _is_translation_page(self):
        _checkpoint_translation_page(self)
    return written


def _install_translation_checkpointing() -> None:
    if not _checkpoint_enabled():
        return
    Path.write_text = _checkpointing_write_text  # type: ignore[method-assign]
    print(
        "Translation checkpointing enabled: each completed page is committed "
        "and pushed to main with [skip ci].",
        flush=True,
    )


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


def _generate_model(self, text: str, *, force_terms: bool) -> str:
    """Run Marian once, usually without constrained beam search.

    Constrained decoding is reserved for the minority of units where the fast
    ordinary translation did not already contain every approved target term.
    """

    if not text.strip():
        return text
    if text.strip() == "The Gongfu of Xinzuo":
        return text.strip()

    model_input = text
    target_prefix = _engine.TARGET_PREFIX_BY_LOCALE.get(self.locale)
    if target_prefix:
        model_input = f"{target_prefix} {text}"

    encoded = self.tokenizer(model_input, return_tensors="pt", add_special_tokens=True)
    token_count = int(encoded["input_ids"].shape[1])
    if token_count > _engine.MODEL_MAX_INPUT_TOKENS:
        # translation_engine._translate_long routes each resulting piece back
        # through self._generate_unit, which is patched to this safe wrapper.
        return self._translate_long(text)

    generation_kwargs = {
        "max_new_tokens": _MAX_NEW_TOKENS,
        "num_beams": _CONSTRAINED_BEAMS if force_terms else _NORMAL_BEAMS,
        "early_stopping": True,
    }
    if force_terms:
        forced_words_ids = self._forced_words_ids(text)
        if forced_words_ids:
            generation_kwargs["force_words_ids"] = forced_words_ids

    with self.torch.inference_mode():
        generated = self.model.generate(**encoded, **generation_kwargs)

    return self.tokenizer.batch_decode(
        generated,
        skip_special_tokens=True,
    )[0].strip()


def _deterministic_term_fallback(self, text: str) -> str:
    """Guarantee approved terminology if constrained generation still fails.

    Only this rare fallback splits at the exact glossary matches. Non-technical
    spans continue through Marian, while each approved target phrase is inserted
    verbatim. This keeps the fail-closed terminology policy without making the
    entire publication depend on constrained-beam-search quirks.
    """

    matches = self.terminology.matches(text)
    if not matches:
        return _generate_model(self, text, force_terms=False)

    output: list[str] = []
    cursor = 0
    for match in matches:
        before = text[cursor : match.start]
        if before:
            output.append(self._translate_segment(before))
        output.append(match.form.target)
        cursor = match.end

    tail = text[cursor:]
    if tail:
        output.append(self._translate_segment(tail))

    translated = "".join(output)
    missing = self.terminology.missing_targets(text, translated)
    if missing:
        raise RuntimeError(
            f"{self.locale}: deterministic terminology fallback still omitted "
            f"controlled term(s) {', '.join(missing)} while translating: {text!r}"
        )
    return translated


def _translate_pieces(self, pieces: list[str]) -> str:
    output: list[str] = []
    for piece in pieces:
        if not piece:
            continue
        if _CLAUSE_SEPARATOR_RE.fullmatch(piece) or _CONJUNCTION_SEPARATOR_RE.fullmatch(piece):
            output.append(piece)
        else:
            output.append(_generate_unit_terminology_safe(self, piece))
    return "".join(output)


def _generate_unit_terminology_safe(self, text: str) -> str:
    """Translate one unit quickly while guaranteeing controlled terminology."""

    if not text.strip():
        return text
    if text.strip() == "The Gongfu of Xinzuo":
        return text.strip()

    # Fast path: most sentences already use the desired technical vocabulary
    # when translated normally, so do not pay constrained-beam-search cost.
    translated = _generate_model(self, text, force_terms=False)
    missing = self.terminology.missing_targets(text, translated)
    if not missing:
        return translated

    # Dense terminology is safer and faster as small natural clauses. Each
    # clause gets its own normal-first attempt before any constrained retry.
    pieces = _split_constraint_units(text, self.terminology)
    if pieces:
        split_translation = _translate_pieces(self, pieces)
        split_missing = self.terminology.missing_targets(text, split_translation)
        if not split_missing:
            return split_translation

    # Low-density retry: force the approved phrases only for the problematic
    # unit, rather than for every technical sentence in the entire book.
    try:
        constrained = _generate_model(self, text, force_terms=True)
        constrained_missing = self.terminology.missing_targets(text, constrained)
        if not constrained_missing:
            return constrained
    except (RuntimeError, ValueError):
        pass

    # Final guaranteed route. A glossary/model mismatch can no longer abort an
    # hour-long publication after all previous pages have been translated.
    return _deterministic_term_fallback(self, text)


_engine.MarianTranslator._generate_unit = _generate_unit_terminology_safe
# Keep the re-exported name explicitly tied to the patched class for lazy imports.
MarianTranslator = _engine.MarianTranslator


if __name__ == "__main__":
    _install_translation_checkpointing()
    raise SystemExit(main())
