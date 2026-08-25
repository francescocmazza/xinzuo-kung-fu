#!/usr/bin/env python3
"""Build the multilingual MkDocs site from English plus committed translations."""

from __future__ import annotations

import argparse
import hashlib
import html
import re
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))
from publication_metadata import PublicationMetadata, get_metadata  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content" / "en"
TRANSLATIONS = ROOT / "translations"
LOCALES = ROOT / "localization" / "locales.yml"
GLOSSARY = ROOT / "glossaries" / "master-terms.yml"
BASE_CONFIG = ROOT / "mkdocs.yml"
WORK = ROOT / ".site-work"
SITE = ROOT / "site"
BASE_URL = "https://francescocmazza.github.io/xinzuo-kung-fu"
TRANSLATION_SCHEMA_VERSION = "2026-08-07-v3-committed"


def args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    # Kept temporarily for compatibility with older helper scripts. It performs
    # no API call: translations are always read from committed repository files.
    parser.add_argument("--translate", action="store_true", help=argparse.SUPPRESS)
    parser.add_argument("--require-translations", action="store_true")
    parser.add_argument("--locales", nargs="*")
    return parser.parse_args()


def read_yaml(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as handle:
        return yaml.safe_load(handle) or {}


def split_document(text: str) -> tuple[dict[str, Any], str]:
    if text.startswith("---\n") and "\n---\n" in text:
        raw, body = text.split("\n---\n", 1)
        return yaml.safe_load(raw[4:]) or {}, body
    return {}, text


def join_document(metadata: dict[str, Any], body: str) -> str:
    front = yaml.safe_dump(metadata, allow_unicode=True, sort_keys=False).strip()
    return f"---\n{front}\n---\n\n{body.lstrip()}"


def digest(locale: str, source: str, glossary: str) -> str:
    raw = "\0".join((TRANSLATION_SCHEMA_VERSION, locale, source, glossary)).encode()
    return hashlib.sha256(raw).hexdigest()


def title_from(body: str, fallback: str | None = None) -> str | None:
    found = re.search(r"^#\s+(.+?)\s*$", body, re.MULTILINE)
    return found.group(1).strip() if found else fallback


def translation_status(code: str, relative: Path, source_text: str, glossary: str) -> tuple[str, str | None]:
    """Return (status, translated body). Status is current/missing/stale."""
    path = TRANSLATIONS / code / relative
    if not path.exists():
        return "missing", None
    metadata, body = split_document(path.read_text(encoding="utf-8"))
    expected = digest(code, source_text, glossary)
    if metadata.get("source_hash") != expected:
        return "stale", body
    return "current", body


def prepare_docs(
    code: str,
    cfg: dict[str, Any],
    require_translations: bool,
    glossary: str,
) -> Path:
    target = WORK / "docs" / code
    shutil.rmtree(target, ignore_errors=True)
    target.mkdir(parents=True)

    for source_path in sorted(SOURCE.rglob("*")):
        if not source_path.is_file():
            continue
        relative = source_path.relative_to(SOURCE)
        if relative.name == "README.md":
            continue
        output = target / relative
        output.parent.mkdir(parents=True, exist_ok=True)

        if code == "en" or source_path.suffix.lower() != ".md":
            shutil.copy2(source_path, output)
            continue

        source_text = source_path.read_text(encoding="utf-8")
        source_metadata, source_body = split_document(source_text)
        expected = digest(code, source_text, glossary)
        status, translated = translation_status(code, relative, source_text, glossary)
        fallback = status != "current"

        if fallback and require_translations:
            raise RuntimeError(
                f"Required committed translation is {status} for {code}:{relative}. "
                "Refresh it with Claude Code before publishing."
            )
        if translated is None or fallback:
            translated = source_body

        metadata = dict(source_metadata)
        metadata.update({
            "title": title_from(translated, source_metadata.get("title")),
            "language": code,
            "source_language": "en",
            "translation_status": "fallback-english" if fallback else "committed-translation",
            "human_review_required": True,
            "source_hash": expected,
        })

        if fallback:
            notice = (
                '!!! warning "Translation temporarily unavailable"\n'
                '    This English source is shown only in local/development builds because the committed translation is missing or stale.\n\n'
            )
        else:
            notice = (
                '!!! warning "Translation notice"\n'
                '    This committed translation was generated from the English source and may still require human review, especially for specialist terminology.\n\n'
            )
        output.write_text(join_document(metadata, notice + translated), encoding="utf-8")
    return target


def report_translation_status(selected: list[str], glossary: str) -> tuple[int, int]:
    missing = stale = 0
    for code in selected:
        if code == "en":
            continue
        for source_path in sorted(SOURCE.rglob("*.md")):
            if source_path.name == "README.md":
                continue
            relative = source_path.relative_to(SOURCE)
            status, _ = translation_status(code, relative, source_path.read_text(encoding="utf-8"), glossary)
            if status == "missing":
                missing += 1
                print(f"MISSING {code}:{relative}")
            elif status == "stale":
                stale += 1
                print(f"STALE   {code}:{relative}")
    print(f"Translation status: {missing} missing, {stale} stale")
    return missing, stale


def localize_nav(node: Any, docs: Path) -> Any:
    if isinstance(node, list):
        return [localize_nav(item, docs) for item in node]
    if isinstance(node, dict):
        result: dict[str, Any] = {}
        for label, value in node.items():
            if isinstance(value, str) and value.endswith(".md"):
                page = docs / value
                if page.exists():
                    metadata, body = split_document(page.read_text(encoding="utf-8"))
                    label = str(metadata.get("title") or title_from(body, label))
                result[label] = value
            else:
                result[label] = localize_nav(value, docs)
        return result
    return node


def build(
    code: str,
    cfg: dict[str, Any],
    locales: dict[str, dict[str, Any]],
    docs: Path,
    metadata: PublicationMetadata,
) -> None:
    config = read_yaml(BASE_CONFIG)
    config["copyright"] = f"{config.get('copyright', '')} · {metadata.compact_footer}"
    config["site_url"] = f"{BASE_URL}/{code}/"
    config["docs_dir"] = str(docs)
    config["site_dir"] = str(SITE / code)
    config["edit_uri"] = "edit/main/content/en/" if code == "en" else ""
    config["nav"] = localize_nav(config.get("nav", []), docs)

    theme = dict(config.get("theme", {}))
    theme["language"] = cfg.get("mkdocs_language", code)
    theme["direction"] = cfg.get("direction", "ltr")
    if code != "en":
        theme["features"] = [
            item for item in theme.get("features", [])
            if item not in {"content.action.edit", "content.action.view"}
        ]
    config["theme"] = theme
    config["extra"] = {
        **dict(config.get("extra", {})),
        "alternate": [
            {"name": data["name"], "link": f"/xinzuo-kung-fu/{locale}/", "lang": locale}
            for locale, data in locales.items() if data.get("deploy")
        ],
    }

    config_path = WORK / "configs" / f"mkdocs.{code}.yml"
    config_path.parent.mkdir(parents=True, exist_ok=True)
    config_path.write_text(yaml.safe_dump(config, allow_unicode=True, sort_keys=False), encoding="utf-8")
    subprocess.run([sys.executable, "-m", "mkdocs", "build", "--strict", "-f", str(config_path)], cwd=ROOT, check=True)


def root_index(locales: dict[str, dict[str, Any]]) -> None:
    SITE.mkdir(parents=True, exist_ok=True)
    links = "".join(
        f'<li><a href="{html.escape(code)}/">{html.escape(data["name"])}</a></li>'
        for code, data in locales.items() if data.get("deploy")
    )
    page = f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta http-equiv="refresh" content="0; url=en/"><link rel="canonical" href="{BASE_URL}/en/">
<title>The Gongfu of Xinzuo</title></head><body><ul>{links}</ul><p><a href="en/">Continue in English</a></p></body></html>"""
    (SITE / "index.html").write_text(page, encoding="utf-8")
    (SITE / ".nojekyll").write_text("\n", encoding="utf-8")


def main() -> int:
    options = args()
    locale_cfg = read_yaml(LOCALES).get("locales", {})
    selected = options.locales or [code for code, cfg in locale_cfg.items() if cfg.get("deploy")]
    unknown = [code for code in selected if code not in locale_cfg]
    if unknown:
        raise SystemExit(f"Unknown locales: {', '.join(unknown)}")

    shutil.rmtree(WORK, ignore_errors=True)
    shutil.rmtree(SITE, ignore_errors=True)
    glossary = GLOSSARY.read_text(encoding="utf-8") if GLOSSARY.exists() else ""

    if options.require_translations:
        missing, stale = report_translation_status(selected, glossary)
        if missing or stale:
            raise SystemExit(
                "Committed translations are incomplete or stale. Refresh them with Claude Code before publishing."
            )

    metadata = get_metadata()
    print(f"Publication metadata: {metadata.full_label} · {metadata.publication_date}")
    print("Translation source: committed repository files (no translation API)")

    for code in selected:
        print(f"Preparing {code}")
        docs = prepare_docs(code, locale_cfg[code], options.require_translations, glossary)
        print(f"Building {code}")
        build(code, locale_cfg[code], locale_cfg, docs, metadata)
    root_index(locale_cfg)
    print(f"Built {len(selected)} locale(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
