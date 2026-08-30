#!/usr/bin/env python3
"""Validate every image referenced from content/**/*.md.

This exists to catch the two failure modes that produced visibly broken
figures in the past and were previously "fixed" with per-image CSS/JS hacks
instead of at the source:

1. A referenced image file is missing, or is present but cannot actually be
   decoded (a truncated/corrupt file that still passes a quick header check
   renders as an obviously cut-off picture in the browser).
2. A raw ``<img src="https://...">`` embeds a third-party URL directly in the
   content instead of a local, rights-cleared asset under assets/ -- see
   EDITORIAL_REQUIREMENTS.md and content/en/assets/IMAGE_RIGHTS.md for why
   that is never allowed, even temporarily.

Run it from the repo root:

    python3 scripts/check_images.py

Exits non-zero (and prints every problem found) if anything is broken.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path
from urllib.parse import urlparse

from PIL import Image, ImageFile

ImageFile.LOAD_TRUNCATED_IMAGES = False

REPO_ROOT = Path(__file__).resolve().parent.parent
CONTENT_DIRS = ["content", "translations"]

MD_IMAGE_RE = re.compile(r'<img[^>]+src="([^"]+)"')
MD_LINK_IMAGE_RE = re.compile(r'!\[[^\]]*\]\(([^)\s]+)\)')


def iter_markdown_files():
    for base in CONTENT_DIRS:
        yield from (REPO_ROOT / base).rglob("*.md")


def extract_srcs(text: str) -> list[str]:
    return MD_IMAGE_RE.findall(text) + MD_LINK_IMAGE_RE.findall(text)


def page_base_dir(md_path: Path) -> Path:
    """Directory a relative link in this page resolves against.

    mkdocs.yml sets use_directory_urls: true, so e.g.
    content/en/05-knife-types/overview.md is served as
    .../en/05-knife-types/overview/index.html -- one directory deeper than
    the source file. index.md is the exception: it already serves as
    .../index.html in its own directory, with no extra nesting.
    """
    if md_path.stem == "index":
        return md_path.parent
    return md_path.parent / md_path.stem


def fallback_to_en_assets(md_path: Path, resolved: Path) -> Path | None:
    """scripts/multilingual_site.py builds each locale by copying the whole
    content/en tree (assets included) into a working docs dir and then
    overlaying translated .md files on top. So a translations/<locale> page
    can reference an asset that, in the source tree, only physically exists
    under content/en/assets/ -- it becomes real only inside the build.
    """
    translations_root = REPO_ROOT / "translations"
    try:
        relative_to_locale_root = resolved.relative_to(translations_root)
    except ValueError:
        return None
    locale, *rest = relative_to_locale_root.parts
    if not rest or rest[0] != "assets":
        return None
    return REPO_ROOT / "content" / "en" / Path(*rest)


def check_file(md_path: Path, src: str, problems: list[str]) -> None:
    parsed = urlparse(src)
    if parsed.scheme in ("http", "https"):
        problems.append(
            f"{md_path.relative_to(REPO_ROOT)}: externally hosted image not allowed: {src}"
        )
        return
    if parsed.scheme.startswith("data"):
        return  # inline data URIs (used by some generated SVGs) are out of scope here

    resolved = (page_base_dir(md_path) / src).resolve()
    if not resolved.exists():
        resolved = fallback_to_en_assets(md_path, resolved) or resolved
    if not resolved.exists():
        problems.append(f"{md_path.relative_to(REPO_ROOT)}: missing image file: {src}")
        return

    if resolved.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
        try:
            with Image.open(resolved) as im:
                im.load()
        except Exception as exc:  # noqa: BLE001
            problems.append(
                f"{md_path.relative_to(REPO_ROOT)}: {resolved.relative_to(REPO_ROOT)} "
                f"cannot be decoded ({exc}) -- likely truncated/corrupt"
            )


def main() -> int:
    problems: list[str] = []
    for md_path in iter_markdown_files():
        text = md_path.read_text(encoding="utf-8")
        for src in extract_srcs(text):
            check_file(md_path, src, problems)

    if problems:
        print(f"Found {len(problems)} image problem(s):\n")
        for problem in problems:
            print(f"  - {problem}")
        return 1

    print("All referenced images resolve to local, decodable files.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
