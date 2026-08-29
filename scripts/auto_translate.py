#!/usr/bin/env python3
"""Refresh stale active translations with local open-source Marian models.

The script is intentionally API-key free. It reuses unchanged translated lines and
only machine-translates English lines that changed since TRANSLATION_BASE_SHA.
"""

from __future__ import annotations

import difflib
import gc
import os
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

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

MODEL_BY_LOCALE = {
    "it": "Helsinki-NLP/opus-mt-en-it",
    "zh-Hans": "Helsinki-NLP/opus-mt-en-zh",
}
MODEL_LICENSE = "Apache-2.0"
MODEL_MAX_INPUT_TOKENS = 450
TARGET_PREFIX_BY_LOCALE = {
    "zh-Hans": ">>cmn_Hans<<",
}
HTML_TAG_RE = re.compile(r"<[^>]+>")


@dataclass
class TranslationPlan:
    body: str
    translated_line_count: int
    reused_line_count: int


def join_translation(source_hash: str, body: str) -> str:
    return f"---\nsource_hash: {source_hash}\n---\n\n{body.lstrip()}"


def git_file_at(revision: str | None, path: Path) -> str | None:
    if not revision or set(revision) == {"0"}:
        return None
    result = subprocess.run(
        ["git", "show", f"{revision}:{path.as_posix()}"],
        text=True,
        capture_output=True,
        check=False,
    )
    return result.stdout if result.returncode == 0 else None


def default_base_revision() -> str | None:
    configured = os.getenv("TRANSLATION_BASE_SHA", "").strip()
    if configured and set(configured) != {"0"}:
        return configured
    result = subprocess.run(
        ["git", "rev-parse", "HEAD^"],
        text=True,
        capture_output=True,
        check=False,
    )
    return result.stdout.strip() if result.returncode == 0 else None


def equivalent_formatting_only(old: str, new: str) -> bool:
    """Recognize the dangling compound hyphen style change used in English prose.

    Example: ``single- and double-bevel`` -> ``single and double-bevel``.
    This preserves an already-reviewed localized line when English meaning did not
    change.
    """

    def normalize(value: str) -> str:
        value = re.sub(r"(?<=\w)[\-‐‑](?=\s+and\b)", "", value, flags=re.IGNORECASE)
        return re.sub(r"\s+", " ", value).strip()

    return normalize(old) == normalize(new)


def verbatim_line_indices(lines: list[str]) -> set[int]:
    """Return current-source line indexes that must never be translated.

    Fenced code blocks are content, not prose. Copying them byte-for-byte avoids
    corrupting commands, code examples, model numbers, and other literals.
    """

    protected: set[int] = set()
    fence: str | None = None
    for index, line in enumerate(lines):
        stripped = line.lstrip()
        marker = None
        if stripped.startswith("```"):
            marker = "```"
        elif stripped.startswith("~~~"):
            marker = "~~~"

        if fence is not None:
            protected.add(index)
            if marker == fence:
                fence = None
            continue

        if marker is not None:
            protected.add(index)
            fence = marker

    return protected


def _protect_inline(text: str) -> tuple[str, Callable[[str], str]]:
    replacements: list[str] = []

    patterns = [
        re.compile(r"The Gongfu of Xinzuo"),
        re.compile(r"`[^`\n]+`"),
        re.compile(r"(?<=\]\()[^)]+(?=\))"),
        re.compile(r"https?://[^\s)>]+"),
        re.compile(r"<[^>]+>"),
        re.compile(r"\$[^$\n]+\$"),
    ]

    def protect_match(match: re.Match[str]) -> str:
        token = f"ZZZKBTOKEN{len(replacements):03d}ZZZ"
        replacements.append(match.group(0))
        return token

    protected = text
    for pattern in patterns:
        protected = pattern.sub(protect_match, protected)

    def restore(value: str) -> str:
        restored = value
        for index, original in enumerate(replacements):
            token = f"ZZZKBTOKEN{index:03d}ZZZ"
            restored = restored.replace(token, original)
            spaced = r"\s*".join(map(re.escape, token))
            restored = re.sub(spaced, original, restored, flags=re.IGNORECASE)
        return restored

    return protected, restore


def _split_markdown_prefix(text: str) -> tuple[str, str]:
    patterns = [
        r"^(\s*#{1,6}\s+)(.*)$",
        r"^(\s*[-*+]\s+)(.*)$",
        r"^(\s*\d+[.)]\s+)(.*)$",
        r"^(\s*>\s+)(.*)$",
    ]
    for pattern in patterns:
        match = re.match(pattern, text)
        if match:
            return match.group(1), match.group(2)
    leading = re.match(r"^(\s*)(.*)$", text)
    assert leading is not None
    return leading.group(1), leading.group(2)


def _should_keep_verbatim(text: str) -> bool:
    stripped = text.strip()
    if not stripped:
        return True
    if re.fullmatch(r"[-*_]{3,}", stripped):
        return True
    if re.fullmatch(r"<[^>]+>", stripped):
        return True
    return False


class MarianTranslator:
    def __init__(self, locale: str, model_name: str) -> None:
        try:
            import torch
            from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
        except ImportError as exc:  # pragma: no cover - CI setup issue
            raise RuntimeError(
                "Translation dependencies are missing. Install requirements-translation.txt "
                "and the CPU build of torch before running auto_translate.py."
            ) from exc

        self.locale = locale
        self.torch = torch
        print(f"Loading {model_name} for {locale}")
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
        self.model.eval()

    def close(self) -> None:
        del self.model
        del self.tokenizer
        gc.collect()

    def _translate_plain(self, text: str) -> str:
        if not text.strip():
            return text
        if text.strip() == "The Gongfu of Xinzuo":
            return text.strip()
        model_input = text
        target_prefix = TARGET_PREFIX_BY_LOCALE.get(self.locale)
        if target_prefix:
            model_input = f"{target_prefix} {text}"
        encoded = self.tokenizer(model_input, return_tensors="pt", add_special_tokens=True)
        token_count = int(encoded["input_ids"].shape[1])
        if token_count > MODEL_MAX_INPUT_TOKENS:
            return self._translate_long(text)
        with self.torch.inference_mode():
            generated = self.model.generate(
                **encoded,
                max_new_tokens=512,
                num_beams=4,
                early_stopping=True,
            )
        return self.tokenizer.batch_decode(generated, skip_special_tokens=True)[0].strip()

    def _translate_long(self, text: str) -> str:
        pieces = re.split(r"(?<=[.!?;:。！？；：])\s+", text)
        if len(pieces) == 1:
            midpoint = max(1, len(text) // 2)
            split_at = text.rfind(" ", 0, midpoint)
            if split_at < 1:
                split_at = text.find(" ", midpoint)
            if split_at < 1:
                raise RuntimeError("A source line exceeds the translation model input limit and cannot be split safely.")
            pieces = [text[:split_at], text[split_at + 1 :]]
        return " ".join(self._translate_plain(piece) for piece in pieces if piece)

    def _protect_markdown_links(self, text: str) -> tuple[str, Callable[[str], str]]:
        """Translate link/image labels separately while preserving Markdown destinations."""

        replacements: list[str] = []
        pattern = re.compile(r"(!?)\[([^]\n]+)\]\(([^)\n]+)\)")

        def replace(match: re.Match[str]) -> str:
            bang, label, destination = match.groups()
            translated_label = self._translate_plain(label)
            rendered = f"{bang}[{translated_label}]({destination})"
            token = f"ZZZKBLINK{len(replacements):03d}ZZZ"
            replacements.append(rendered)
            return token

        protected = pattern.sub(replace, text)

        def restore(value: str) -> str:
            restored = value
            for index, original in enumerate(replacements):
                token = f"ZZZKBLINK{index:03d}ZZZ"
                restored = restored.replace(token, original)
                spaced = r"\s*".join(map(re.escape, token))
                restored = re.sub(spaced, original, restored, flags=re.IGNORECASE)
            return restored

        return protected, restore

    def _translate_payload(self, payload: str) -> str:
        linked, restore_links = self._protect_markdown_links(payload)
        title_pattern = re.compile(r"(\*{0,2}The Gongfu of Xinzuo\*{0,2})")
        parts = title_pattern.split(linked)
        translated_parts: list[str] = []
        for part in parts:
            if not part:
                continue
            if title_pattern.fullmatch(part):
                translated_parts.append(part)
                continue
            protected, restore_inline = _protect_inline(part)
            translated_parts.append(restore_inline(self._translate_plain(protected)))
        return restore_links("".join(translated_parts))

    def _translate_html_line(self, raw: str) -> str:
        """Translate visible HTML text while preserving every tag byte-for-byte.

        Passing raw HTML tags through Marian behind placeholder tokens proved unsafe:
        the Chinese model can alter or drop those placeholders. Splitting the line
        into tags and text nodes keeps markup and attributes completely outside the
        model while still translating captions and other visible text nodes.
        """

        parts = re.split(r"(<[^>]+>)", raw)
        translated_parts: list[str] = []
        for part in parts:
            if not part:
                continue
            if HTML_TAG_RE.fullmatch(part):
                translated_parts.append(part)
                continue
            if not part.strip():
                translated_parts.append(part)
                continue

            left = part[: len(part) - len(part.lstrip())]
            right = part[len(part.rstrip()) :]
            core = part.strip()
            translated_parts.append(left + self._translate_payload(core) + right)

        return "".join(translated_parts)

    def translate_line(self, line: str) -> str:
        ending = "\n" if line.endswith("\n") else ""
        raw = line[:-1] if ending else line
        if _should_keep_verbatim(raw):
            return line

        # Keep raw HTML markup out of Marian entirely. Only visible text between
        # tags is translated; attributes and structure stay byte-for-byte stable.
        if HTML_TAG_RE.search(raw):
            return self._translate_html_line(raw) + ending

        prefix, payload = _split_markdown_prefix(raw)
        if not payload.strip():
            return line

        if "|" in payload and payload.count("|") >= 2:
            cells = payload.split("|")
            translated_cells: list[str] = []
            for cell in cells:
                if re.fullmatch(r"\s*:?-{3,}:?\s*", cell) or not cell.strip():
                    translated_cells.append(cell)
                    continue
                left = cell[: len(cell) - len(cell.lstrip())]
                right = cell[len(cell.rstrip()) :]
                core = cell.strip()
                translated_cells.append(left + self._translate_payload(core) + right)
            return prefix + "|".join(translated_cells) + ending

        translated = self._translate_payload(payload)
        return prefix + translated + ending


def plan_translation(
    current_source_body: str,
    previous_source_body: str | None,
    existing_translation_body: str | None,
    translator: MarianTranslator,
) -> TranslationPlan:
    current_lines = current_source_body.splitlines(keepends=True)
    if current_source_body and not current_lines:
        current_lines = [current_source_body]
    verbatim = verbatim_line_indices(current_lines)

    def translate_current(index: int) -> str:
        line = current_lines[index]
        return line if index in verbatim else translator.translate_line(line)

    if previous_source_body is None or existing_translation_body is None:
        translated = [translate_current(index) for index in range(len(current_lines))]
        translated_count = sum(1 for index in range(len(current_lines)) if index not in verbatim)
        return TranslationPlan("".join(translated), translated_count, 0)

    previous_lines = previous_source_body.splitlines(keepends=True)
    translated_lines = existing_translation_body.splitlines(keepends=True)
    if len(previous_lines) != len(translated_lines):
        print(
            "Existing translation line structure does not match its previous English source; "
            "retranslating this page once to normalize alignment."
        )
        translated = [translate_current(index) for index in range(len(current_lines))]
        translated_count = sum(1 for index in range(len(current_lines)) if index not in verbatim)
        return TranslationPlan("".join(translated), translated_count, 0)

    output: list[str] = []
    translated_count = 0
    reused_count = 0
    matcher = difflib.SequenceMatcher(a=previous_lines, b=current_lines, autojunk=False)
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            output.extend(translated_lines[i1:i2])
            reused_count += i2 - i1
            continue
        if tag == "delete":
            continue

        if tag == "replace" and (i2 - i1) == (j2 - j1):
            old_slice = previous_lines[i1:i2]
            old_translation_slice = translated_lines[i1:i2]
            for offset, (old, translated_old) in enumerate(zip(old_slice, old_translation_slice)):
                current_index = j1 + offset
                new = current_lines[current_index]
                if current_index in verbatim:
                    output.append(new)
                    reused_count += 1
                elif equivalent_formatting_only(old, new):
                    output.append(translated_old)
                    reused_count += 1
                else:
                    output.append(translator.translate_line(new))
                    translated_count += 1
        else:
            for current_index in range(j1, j2):
                output.append(translate_current(current_index))
                if current_index in verbatim:
                    reused_count += 1
                else:
                    translated_count += 1

    return TranslationPlan("".join(output), translated_count, reused_count)


def stale_pages(locale: str, glossary: str) -> list[Path]:
    stale: list[Path] = []
    for source_path in sorted(SOURCE.rglob("*.md")):
        if source_path.name == "README.md":
            continue
        relative = source_path.relative_to(SOURCE)
        source_text = source_path.read_text(encoding="utf-8")
        expected = digest(locale, source_text, glossary)
        target = TRANSLATIONS / locale / relative
        if not target.exists():
            stale.append(relative)
            continue
        metadata, _ = split_document(target.read_text(encoding="utf-8"))
        if metadata.get("source_hash") != expected:
            stale.append(relative)
    return stale


def main() -> int:
    locale_cfg = read_yaml(LOCALES).get("locales", {})
    active = [
        code
        for code, cfg in locale_cfg.items()
        if code != "en" and cfg.get("deploy")
    ]
    unsupported = [code for code in active if code not in MODEL_BY_LOCALE]
    if unsupported:
        raise SystemExit(
            "No local automatic-translation model is configured for active locale(s): "
            + ", ".join(unsupported)
        )

    glossary = GLOSSARY.read_text(encoding="utf-8") if GLOSSARY.exists() else ""
    base_revision = default_base_revision()
    print(f"Translation base revision: {base_revision or 'none (full translation fallback)'}")
    print(f"Automatic translation models are local Marian/OPUS-MT checkpoints ({MODEL_LICENSE}); no translation API key is used.")

    total_pages = 0
    for locale in active:
        pages = stale_pages(locale, glossary)
        if not pages:
            print(f"{locale}: all translations current")
            continue

        print(f"{locale}: refreshing {len(pages)} stale/missing page(s)")
        translator = MarianTranslator(locale, MODEL_BY_LOCALE[locale])
        try:
            for relative in pages:
                source_path = SOURCE / relative
                source_text = source_path.read_text(encoding="utf-8")
                _, source_body = split_document(source_text)

                previous_text = git_file_at(base_revision, Path("content/en") / relative)
                previous_body = split_document(previous_text)[1] if previous_text is not None else None

                target_path = TRANSLATIONS / locale / relative
                existing_body: str | None = None
                if target_path.exists():
                    _, existing_body = split_document(target_path.read_text(encoding="utf-8"))

                if previous_body == source_body and existing_body is not None:
                    plan = TranslationPlan(existing_body, 0, len(existing_body.splitlines()))
                else:
                    plan = plan_translation(source_body, previous_body, existing_body, translator)

                expected = digest(locale, source_text, glossary)
                target_path.parent.mkdir(parents=True, exist_ok=True)
                target_path.write_text(join_translation(expected, plan.body), encoding="utf-8")
                print(
                    f"  {relative}: translated {plan.translated_line_count} line(s), "
                    f"reused {plan.reused_line_count} existing line(s)"
                )
                total_pages += 1
        finally:
            translator.close()

    print(f"Automatic translation refresh complete: {total_pages} page(s) updated")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
