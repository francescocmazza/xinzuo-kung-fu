#!/usr/bin/env python3
"""Prepare, apply and validate Xinzuo Academy ChatGPT translations.

The Academy follows the same policy as the book translation workflow:
English is the sole source of truth, GitHub performs no model/API calls, and
ChatGPT/Codex translates queued semantic strings using the user's ChatGPT plan.
Legacy Marian/OPUS-MT output is never accepted.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
EN_PATH = ROOT / "academy" / "data" / "course.en.json"
IT_PATH = ROOT / "academy" / "data" / "course.it.json"
LOCALES_PATH = ROOT / "localization" / "locales.yml"

ENGINE = "chatgpt-differential-v1"
PROMPT_REVISION = "2026-10-02-academy-depth-v2"

NON_TRANSLATABLE_KEYS = {
    "id", "concept_id", "source_path", "source_paths", "correct", "status",
    "locale", "schema_version", "course_version",
}

FORBIDDEN_ITALIAN_PATTERNS = [
    (re.compile(r"\bknowledge base\b", re.I), "use 'base di conoscenza'"),
    (re.compile(r"\bhandedness\b", re.I), "use 'lateralità d'uso'"),
    (re.compile(r"\bpinch grip\b", re.I), "use 'presa a pinza'"),
    (re.compile(r"\bblade-heavy\b", re.I), "use natural Italian wording"),
    (re.compile(r"\bgeneral-purpose\b", re.I), "use 'multiuso'"),
    (re.compile(r"\bfunction\s*→\s*fit\s*→\s*selection\b", re.I), "use 'funzione → ergonomia → scelta'"),
    (re.compile(r"\brivestiment(?:o|i)\s+damascat(?:o|i)\b", re.I), "layered Damascus must use Damasco"),
    (re.compile(r"\bmotiv(?:o|i)\s+damascat(?:o|i)\b", re.I), "layered Damascus must use Damasco"),
    (re.compile(r"\blam(?:a|e)\s+damascat(?:a|e)\b", re.I), "layered Damascus must use Damasco"),
    (re.compile(r"\bfamigli(?:a|e)\s+damascat(?:a|e)\b", re.I), "layered Damascus must use Damasco"),
]


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def git_blob_sha(path: Path) -> str:
    data = path.read_bytes()
    header = f"blob {len(data)}\0".encode("utf-8")
    return hashlib.sha1(header + data).hexdigest()


def parse_path(path: str) -> list[str | int]:
    tokens: list[str | int] = []
    for key, index in re.findall(r"([^.[\]]+)|\[(\d+)\]", path):
        tokens.append(int(index) if index else key)
    return tokens


def set_path(root: Any, path: str, value: str) -> None:
    tokens = parse_path(path)
    current = root
    for token in tokens[:-1]:
        current = current[token]
    current[tokens[-1]] = value


def translatable_pairs(
    source: Any,
    target: Any,
    path: str = "",
    key: str = "",
    out: list[dict[str, str]] | None = None,
) -> list[dict[str, str]]:
    if out is None:
        out = []

    if isinstance(source, str):
        if key not in NON_TRANSLATABLE_KEYS and "mastery_states" not in path:
            if not isinstance(target, str):
                raise ValueError(f"{path}: Italian value must be a string")
            out.append({"path": path, "source": source, "target": target})
        return out

    if isinstance(source, list):
        if not isinstance(target, list) or len(source) != len(target):
            raise ValueError(f"{path}: locale structure drift")
        for index, item in enumerate(source):
            translatable_pairs(item, target[index], f"{path}[{index}]", key, out)
        return out

    if isinstance(source, dict):
        if not isinstance(target, dict):
            raise ValueError(f"{path}: locale structure drift")
        for child_key, item in source.items():
            if child_key == "translation_provenance":
                continue
            if child_key not in target:
                raise ValueError(f"{path}.{child_key}: missing Italian field")
            child_path = f"{path}.{child_key}" if path else child_key
            translatable_pairs(item, target[child_key], child_path, child_key, out)
        return out

    return out


def current_guidance() -> str:
    text = LOCALES_PATH.read_text(encoding="utf-8")
    marker = "    translation_guidance: >-\n"
    pos = text.find(marker, text.find("\n  it:\n"))
    if pos < 0:
        return "Write polished native Italian technical prose."
    lines = []
    for line in text[pos + len(marker):].splitlines():
        if line.startswith("    translation_rules:"):
            break
        if line.startswith("      "):
            lines.append(line.strip())
        elif line.strip():
            break
    return " ".join(lines)


def validate(source: dict[str, Any], target: dict[str, Any]) -> list[str]:
    failures: list[str] = []
    provenance = target.get("translation_provenance") or {}

    if target.get("locale") != "it":
        failures.append("Italian course locale metadata is not 'it'.")
    if provenance.get("engine") != ENGINE:
        failures.append(f"Italian Academy translation engine must be {ENGINE}.")
    if provenance.get("prompt_revision") != PROMPT_REVISION:
        failures.append(f"Italian Academy prompt revision must be {PROMPT_REVISION}.")
    expected_sha = git_blob_sha(EN_PATH)
    if provenance.get("source_blob_sha") != expected_sha:
        failures.append("Italian Academy translation is stale relative to course.en.json.")

    try:
        pairs = translatable_pairs(source, target)
    except ValueError as exc:
        failures.append(str(exc))
        return failures

    if int(provenance.get("reviewed_translatable_strings") or 0) != len(pairs):
        failures.append(
            f"Translation provenance says {provenance.get('reviewed_translatable_strings')} strings; "
            f"current Academy contains {len(pairs)} translatable strings."
        )

    for row in pairs:
        text = row["target"].strip()
        if not text:
            failures.append(f"{row['path']}: empty Italian translation")
            continue
        for pattern, instruction in FORBIDDEN_ITALIAN_PATTERNS:
            if pattern.search(text):
                failures.append(f"{row['path']}: {instruction}: {text}")

    anatomy = (
        target["levels"][0]["modules"][0]["lessons"][0]["content"]["points"][1]
    ).casefold()
    if "filo" not in anatomy or "tagliente" not in anatomy:
        failures.append("First anatomy introduction must explicitly say that filo and tagliente are synonyms.")

    return failures


def make_queue(source: dict[str, Any], target: dict[str, Any]) -> dict[str, Any]:
    pairs = translatable_pairs(source, target)
    stale = (target.get("translation_provenance") or {}).get("source_blob_sha") != git_blob_sha(EN_PATH)
    units = []
    if stale:
        units = [
            {
                "path": row["path"],
                "source": row["source"],
                "current_target": row["target"],
            }
            for row in pairs
        ]
    return {
        "schema": 1,
        "engine": ENGINE,
        "prompt_revision": PROMPT_REVISION,
        "source_locale": "en",
        "target_locale": "it",
        "translation_guidance": current_guidance(),
        "instructions": (
            "Translate each queued Academy string into polished native Italian. "
            "Preserve technical meaning, question correctness, IDs and structure. "
            "Use the current glossary/Italian terminology rules; never use legacy Marian/OPUS-MT output. "
            "Return results as {results:[{path,text}]}."
        ),
        "units": units,
    }


def apply_results(source: dict[str, Any], target: dict[str, Any], results_path: Path) -> dict[str, Any]:
    payload = read_json(results_path)
    rows = payload.get("results")
    if not isinstance(rows, list) or not rows:
        raise SystemExit("Academy results JSON must contain a non-empty results list.")

    valid_paths = {row["path"] for row in translatable_pairs(source, target)}
    supplied: set[str] = set()
    for row in rows:
        if not isinstance(row, dict):
            continue
        path = str(row.get("path") or "")
        text = str(row.get("text") or "").strip()
        if path not in valid_paths:
            raise SystemExit(f"Unknown Academy translation path: {path}")
        if not text:
            raise SystemExit(f"Empty Academy translation result: {path}")
        set_path(target, path, text)
        supplied.add(path)

    target["translation_provenance"] = {
        "source_locale": "en",
        "engine": ENGINE,
        "prompt_revision": PROMPT_REVISION,
        "source_blob_sha": git_blob_sha(EN_PATH),
        "reviewed_at": "2026-10-02",
        "reviewed_translatable_strings": len(translatable_pairs(source, target)),
        "guidance": "localization/locales.yml#it",
        "note": (
            "Italian Academy course reviewed with the current ChatGPT translation system; "
            "legacy Marian/OPUS-MT output is not accepted."
        ),
    }
    return target


def main() -> int:
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--prepare-queue", metavar="PATH")
    group.add_argument("--apply-results", metavar="PATH")
    group.add_argument("--check-only", action="store_true")
    args = parser.parse_args()

    source = read_json(EN_PATH)
    target = read_json(IT_PATH)

    if args.prepare_queue:
        queue = make_queue(source, target)
        output = Path(args.prepare_queue)
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(queue, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Academy ChatGPT queue: {len(queue['units'])} unit(s)")
        return 0

    if args.apply_results:
        target = apply_results(source, target, Path(args.apply_results))
        IT_PATH.write_text(json.dumps(target, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    failures = validate(source, target)
    if failures:
        print("Academy translation validation failed:")
        for failure in failures:
            print(" -", failure)
        return 1

    pairs = translatable_pairs(source, target)
    print(
        f"Academy ChatGPT translation validation OK: {len(pairs)} Italian strings, "
        f"engine={ENGINE}, prompt={PROMPT_REVISION}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
