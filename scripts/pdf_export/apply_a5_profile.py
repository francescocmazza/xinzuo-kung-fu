#!/usr/bin/env python3
"""Apply the A5 print-publication profile before GitHub PDF export.

The base exporter remains usable on its own, while every GitHub publication
workflow calls this helper before rendering PDFs. Keeping the print profile in
one place makes trim-size and layout tuning explicit and easy to adjust while
preparing the physical edition.

The publication cover is also assembled here. Its artwork remains an image,
while title, subtitle and author stay live/selectable text. Cover wording is
read from the translated ``index.md`` files, so the normal translation engine
remains the single localization path instead of baking words into an image.
The final back cover is injected by ``back_cover.py`` using the same localized
publication pipeline.
"""

from __future__ import annotations

import pprint
import re
from pathlib import Path

import yaml

from back_cover import apply_back_cover_profile

ROOT = Path(__file__).resolve().parents[2]
EXPORTER = ROOT / "scripts" / "export_pdf_guides.py"
PRINT_CSS = ROOT / "scripts" / "pdf_export" / "print.css"
COVER_CSS = ROOT / "scripts" / "pdf_export" / "cover.css"
LOCALES_CONFIG = ROOT / "localization" / "locales.yml"
SOURCE_INDEX = ROOT / "content" / "en" / "index.md"
TRANSLATIONS = ROOT / "translations"
FRONT_COVER_ASSET = ROOT / "content" / "en" / "assets" / "CoverFront.png"
BACK_COVER_ASSET = ROOT / "content" / "en" / "assets" / "CoverBack.png"


def replace_checked(text: str, old: str, new: str, label: str) -> str:
    """Replace an expected value, while remaining safe to run twice."""
    if old in text:
        return text.replace(old, new)
    if new in text:
        return text
    raise RuntimeError(f"Could not apply A5 profile: expected {label!r} was not found.")


def _strip_front_matter(markdown: str) -> str:
    if not markdown.startswith("---"):
        return markdown
    match = re.match(r"\A---\s*\n.*?\n---\s*\n", markdown, flags=re.DOTALL)
    return markdown[match.end() :] if match else markdown


def _plain_text(value: str) -> str:
    value = re.sub(r"<[^>]+>", "", value)
    value = re.sub(r"[`*_]+", "", value)
    return " ".join(value.split()).strip()


def _extract_cover_text(markdown: str, path: Path) -> dict[str, str]:
    """Read the title and two subtitle lines from a localized home page."""
    body = _strip_front_matter(markdown)
    title_match = re.search(r"(?m)^#\s+(.+?)\s*$", body)
    if not title_match:
        raise RuntimeError(f"Could not find the book title in {path}")

    after_title = body[title_match.end() :]
    emphasized = re.findall(r"(?m)^\*\s*(.+?)\s*\*(?:<br>)?\s*$", after_title)
    if len(emphasized) < 2:
        raise RuntimeError(
            f"Could not find the two cover subtitle lines immediately after the title in {path}"
        )

    return {
        "title": _plain_text(title_match.group(1)),
        "subtitle": _plain_text(emphasized[0]),
        "strapline": _plain_text(emphasized[1]),
    }


def _localized_cover_copy() -> dict[str, dict[str, str]]:
    """Build exporter cover copy from the same Markdown used by localization."""
    cfg = yaml.safe_load(LOCALES_CONFIG.read_text(encoding="utf-8")) or {}
    locales = cfg.get("locales", {})
    cover_copy: dict[str, dict[str, str]] = {}

    for code, locale in locales.items():
        if not locale.get("deploy"):
            continue
        path = SOURCE_INDEX if code == "en" else TRANSLATIONS / code / "index.md"
        if not path.exists():
            raise RuntimeError(
                f"Active locale {code!r} has no translated index page at {path}; "
                "refresh translations before applying the publication profile."
            )
        cover_copy[locale["name"]] = _extract_cover_text(path.read_text(encoding="utf-8"), path)

    if "English" not in cover_copy:
        raise RuntimeError("The English source locale must remain active for publication export.")
    return cover_copy


def _inject_localized_cover_copy(exporter: str) -> str:
    """Replace the legacy hand-maintained cover dictionary with localized text."""
    generated = pprint.pformat(_localized_cover_copy(), width=100, sort_dicts=False)
    pattern = re.compile(r"COVER_COPY = \{.*?\n\}\nEDITION_COPY = \{", flags=re.DOTALL)
    replacement = f"COVER_COPY = {generated}\nEDITION_COPY = {{"
    updated, count = pattern.subn(replacement, exporter, count=1)
    if count != 1:
        raise RuntimeError("Could not locate COVER_COPY in the PDF exporter.")
    return updated


def main() -> int:
    for asset in (FRONT_COVER_ASSET, BACK_COVER_ASSET):
        if not asset.is_file() or asset.stat().st_size == 0:
            raise RuntimeError(f"Missing publication cover asset: {asset}")

    exporter = EXPORTER.read_text(encoding="utf-8")
    exporter = replace_checked(
        exporter,
        "prints that document to an A4 PDF with Chromium.",
        "prints that document to an A5 PDF with Chromium.",
        "exporter format description",
    )
    exporter = replace_checked(
        exporter,
        'PDF_MARGIN = {"top": "20mm", "bottom": "18mm", "left": "18mm", "right": "18mm"}',
        'PDF_MARGIN = {"top": "14mm", "bottom": "15mm", "left": "14mm", "right": "14mm"}',
        "PDF margins",
    )
    exporter = replace_checked(
        exporter,
        'HERO_IMAGE_REL = "assets/images/approved/home-hero-xinzuo-neutral.png"',
        'HERO_IMAGE_REL = "assets/CoverFront.png"',
        "next-edition front cover artwork",
    )
    exporter = replace_checked(
        exporter,
        'HERO_IMAGE_ALT = "A craftsman inspecting a Xinzuo Damascus kitchen knife."',
        'HERO_IMAGE_ALT = "Front cover artwork for The Gongfu of Xinzuo."',
        "next-edition cover alternative text",
    )
    exporter = replace_checked(
        exporter,
        'PRINT_SKIP_VISUAL_IDS = {"index": ["VIS-HOME-01"]}',
        'PRINT_SKIP_VISUAL_IDS = {}',
        "home illustration retention after changing cover artwork",
    )
    exporter = replace_checked(
        exporter,
        'format="A4"',
        'format="A5"',
        "Chromium paper format",
    )
    exporter = replace_checked(
        exporter,
        'page.pdf(path=str(cover_pdf), format="A5", print_background=True, margin=PDF_MARGIN)',
        'page.pdf(path=str(cover_pdf), format="A5", print_background=True, margin={"top": "0", "bottom": "0", "left": "0", "right": "0"})',
        "full-bleed front-cover margins",
    )
    exporter = replace_checked(
        exporter,
        "  const h1 = clone.querySelector('h1');\n  return { title: h1 ? h1.textContent.trim() : '', html: clone.innerHTML };",
        "  if (window.location.pathname.includes('/02-steels-and-metallurgy/xinzuo-blade-steels/')) {\n"
        "    clone.querySelector('table')?.classList.add('kb-steel-comparison');\n"
        "  }\n\n"
        "  const h1 = clone.querySelector('h1');\n  return { title: h1 ? h1.textContent.trim() : '', html: clone.innerHTML };",
        "Xinzuo steel comparison print marker",
    )
    exporter = _inject_localized_cover_copy(exporter)
    exporter = apply_back_cover_profile(exporter)
    EXPORTER.write_text(exporter, encoding="utf-8")

    css = PRINT_CSS.read_text(encoding="utf-8")
    replacements = [
        ("size: A4;", "size: A5;", "CSS page size"),
        ("min-height: 250mm;", "min-height: 172mm;", "cover height"),
        ("padding: 18mm 15mm 6mm;", "padding: 9mm 7mm 4mm;", "cover padding"),
        ("max-width: 135mm;", "max-width: 108mm;", "cover/edition text width"),
        ("margin: 8mm 0;", "margin: 5mm 0;", "cover hero spacing"),
        ("max-width: 115mm;", "max-width: 100mm;", "cover hero width"),
        ("max-height: 160mm;", "max-height: 78mm;", "cover hero height"),
        ("max-width: 130mm;", "max-width: 106mm;", "cover rights width"),
        ("margin: 2rem auto 0;", "margin: 1rem auto 0;", "cover rights spacing"),
        ("min-height: 240mm;", "min-height: 170mm;", "edition page height"),
        (
            "The printable A4 content area is roughly 259mm tall (297mm minus the\n * 20mm/18mm top/bottom margins). A full-width portrait image can render",
            "The printable A5 content area is roughly 181mm tall (210mm minus the\n * 14mm/15mm top/bottom margins). A full-width portrait image can render",
            "learning-figure page-height comment",
        ),
        ("max-height: 195mm;", "max-height: 135mm;", "learning-figure image height"),
    ]
    for old, new, label in replacements:
        css = replace_checked(css, old, new, label)

    # Preserve every comparison point in the source table and optimize only its
    # A5 print rendering. The exporter marks the first table in the Xinzuo Blade
    # Steels chapter with a stable class derived from its URL, so this remains
    # correct even if chapters are added or reordered later. Narrow technical
    # columns leave more width for the explanatory columns, while reduced cell
    # spacing and a modest font reduction save vertical space without deleting
    # information.
    steel_table_css = """

/* ---------- A5 compact Xinzuo steel comparison ---------- */
.kb-steel-comparison {
  table-layout: fixed;
  margin: 0.65rem 0 0.8rem;
  font-size: 0.78rem;
  line-height: 1.28;
}

.kb-steel-comparison th,
.kb-steel-comparison td {
  padding: 0.18rem 0.26rem;
  vertical-align: top;
  hyphens: auto;
  overflow-wrap: anywhere;
}

.kb-steel-comparison th {
  line-height: 1.18;
}

.kb-steel-comparison th:nth-child(1),
.kb-steel-comparison td:nth-child(1) {
  width: 15%;
}

.kb-steel-comparison th:nth-child(2),
.kb-steel-comparison td:nth-child(2) {
  width: 15%;
}

.kb-steel-comparison th:nth-child(3),
.kb-steel-comparison td:nth-child(3) {
  width: 13%;
  text-align: center;
}

.kb-steel-comparison th:nth-child(4),
.kb-steel-comparison td:nth-child(4) {
  width: 30%;
}

.kb-steel-comparison th:nth-child(5),
.kb-steel-comparison td:nth-child(5) {
  width: 27%;
}
"""
    if "A5 compact Xinzuo steel comparison" not in css:
        css += steel_table_css

    cover_css = COVER_CSS.read_text(encoding="utf-8")
    if 'background-image: url("assets/CoverFront.png")' not in css:
        css += "\n\n" + cover_css

    PRINT_CSS.write_text(css, encoding="utf-8")

    print(
        "Applied A5 publication profile: 148 x 210 mm, full-bleed approved front/back cover artwork, "
        "localized live front/back cover text, QR-linked digital edition and "
        "14/15/14/14 mm interior PDF margins."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
