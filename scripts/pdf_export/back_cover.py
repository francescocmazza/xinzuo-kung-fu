#!/usr/bin/env python3
"""Inject the localized printed back cover into the PDF exporter.

The source copy lives in ``content/en/back-cover.md`` and is translated by the
same localization engine used for the rest of the book. During pull-request
smoke tests only English is required; missing translated back-cover files fall
back to English until the main publication workflow refreshes translations.
"""

from __future__ import annotations

import pprint
import re
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]
LOCALES_CONFIG = ROOT / "localization" / "locales.yml"
SOURCE_BACK_COVER = ROOT / "content" / "en" / "back-cover.md"
TRANSLATIONS = ROOT / "translations"


def _replace_checked(text: str, old: str, new: str, label: str) -> str:
    if old in text:
        return text.replace(old, new)
    if new in text:
        return text
    raise RuntimeError(f"Could not inject back cover: expected {label!r} was not found.")


def _strip_front_matter(markdown: str) -> str:
    if not markdown.startswith("---"):
        return markdown
    match = re.match(r"\A---\s*\n.*?\n---\s*\n", markdown, flags=re.DOTALL)
    return markdown[match.end() :] if match else markdown


def _plain_text(value: str) -> str:
    value = re.sub(r"<[^>]+>", "", value)
    value = re.sub(r"[`*_]+", "", value)
    return " ".join(value.split()).strip()


def _strip_tx_unit_markers(markdown: str) -> str:
    """Remove translation-memory comments while preserving paragraph boundaries."""
    return re.sub(
        r"(?m)^[ \\t]*<!-- [ \\t]*(?:tx-unit:[0-9a-f]{64}|/tx-unit)[ \\t]*-->[ \\t]*$",
        "",
        markdown,
    )


def _extract_back_cover_text(markdown: str, path: Path) -> dict[str, object]:
    body = _strip_tx_unit_markers(_strip_front_matter(markdown))
    title_match = re.search(r"(?m)^#\s+(.+?)\s*$", body)
    headline_match = re.search(r"(?m)^##\s+(.+?)\s*$", body)
    h3_matches = list(re.finditer(r"(?m)^###\s+(.+?)\s*$", body))
    if not title_match or not headline_match or len(h3_matches) < 2:
        raise RuntimeError(f"Back-cover structure is incomplete in {path}")

    prose_block = body[headline_match.end() : h3_matches[0].start()]
    paragraphs = [
        _plain_text(chunk)
        for chunk in re.split(r"\n\s*\n", prose_block)
        if _plain_text(chunk)
    ]
    if len(paragraphs) < 3:
        raise RuntimeError(f"Back-cover prose is incomplete in {path}")

    cta_title = _plain_text(h3_matches[0].group(1))
    cta_text = _plain_text(body[h3_matches[0].end() : h3_matches[1].start()])
    author_role = _plain_text(body[h3_matches[1].end() :])
    if not cta_text or not author_role:
        raise RuntimeError(f"Back-cover CTA or author role is missing in {path}")

    return {
        "eyebrow": _plain_text(title_match.group(1)),
        "headline": _plain_text(headline_match.group(1)),
        "paragraphs": paragraphs,
        "cta": cta_title,
        "cta_text": cta_text,
        "author_role": author_role,
    }


def _localized_back_cover_copy() -> dict[str, dict[str, object]]:
    cfg = yaml.safe_load(LOCALES_CONFIG.read_text(encoding="utf-8")) or {}
    locales = cfg.get("locales", {})
    english = _extract_back_cover_text(
        SOURCE_BACK_COVER.read_text(encoding="utf-8"), SOURCE_BACK_COVER
    )
    copy: dict[str, dict[str, object]] = {}

    for code, locale in locales.items():
        if not locale.get("deploy"):
            continue
        path = SOURCE_BACK_COVER if code == "en" else TRANSLATIONS / code / "back-cover.md"
        if path.exists():
            copy[locale["name"]] = _extract_back_cover_text(
                path.read_text(encoding="utf-8"), path
            )
        else:
            copy[locale["name"]] = english

    if "English" not in copy:
        raise RuntimeError("The English source locale must remain active for publication export.")
    return copy


def apply_back_cover_profile(exporter: str) -> str:
    """Return ``exporter`` with a standalone final back-cover page injected."""

    exporter = _replace_checked(
        exporter,
        "import yaml\n",
        "import yaml\nimport qrcode\n",
        "qrcode import",
    )
    exporter = _replace_checked(
        exporter,
        'PRINT_COVER_NAME = "__print_cover__.html"\nPRINT_REST_NAME = "__print_rest__.html"',
        'PRINT_COVER_NAME = "__print_cover__.html"\nPRINT_REST_NAME = "__print_rest__.html"\nPRINT_BACK_COVER_NAME = "__print_back_cover__.html"\nPRINT_BACK_COVER_QR = "__back_cover_qr.png"',
        "back-cover print filenames",
    )

    back_copy = pprint.pformat(_localized_back_cover_copy(), width=100, sort_dicts=False)
    exporter = _replace_checked(
        exporter,
        "EDITION_COPY = {",
        f"BACK_COVER_COPY = {back_copy}\nEDITION_COPY = {{",
        "back-cover localized copy",
    )

    render_back_cover = '''def render_back_cover_html(language_name: str, metadata: PublicationMetadata) -> str:
    copy = BACK_COVER_COPY.get(language_name, BACK_COVER_COPY["English"])
    paragraphs = "".join(f"<p>{html.escape(paragraph)}</p>" for paragraph in copy["paragraphs"])
    return f"""
    <section class="kb-back-cover">
      <div class="kb-back-cover__inner">
        <p class="kb-back-cover__eyebrow">{html.escape(copy["eyebrow"])}</p>
        <h2 class="kb-back-cover__headline">{html.escape(copy["headline"])}</h2>
        <div class="kb-back-cover__body">{paragraphs}</div>
        <div class="kb-back-cover__rule">◆</div>
        <div class="kb-back-cover__digital">
          <div class="kb-back-cover__qr">
            <img src="{PRINT_BACK_COVER_QR}" alt="QR code for the digital edition">
          </div>
          <div class="kb-back-cover__cta">
            <p class="kb-back-cover__cta-title">{html.escape(copy["cta"])}</p>
            <p class="kb-back-cover__cta-text">{html.escape(copy["cta_text"])}</p>
            <p class="kb-back-cover__cta-url"><a href="{GITHUB_REPO_URL}">{html.escape(GITHUB_REPO_URL)}</a></p>
          </div>
        </div>
        <div class="kb-back-cover__author-block">
          <p class="kb-back-cover__author">Francesco Claudio Mazza</p>
          <p class="kb-back-cover__role">{html.escape(copy["author_role"])}</p>
          <p class="kb-back-cover__edition">{html.escape(metadata.version_label)} · {html.escape(metadata.publication_date)}</p>
        </div>
      </div>
    </section>
    """


def write_back_cover_qr(code: str) -> None:
    qr = qrcode.QRCode(version=None, box_size=8, border=2)
    qr.add_data(GITHUB_REPO_URL)
    qr.make(fit=True)
    image = qr.make_image(fill_color="black", back_color="white")
    image.save(SITE / code / PRINT_BACK_COVER_QR)


'''
    exporter = _replace_checked(
        exporter,
        "def render_edition_html(language_name: str, metadata: PublicationMetadata) -> str:\n",
        render_back_cover + "def render_edition_html(language_name: str, metadata: PublicationMetadata) -> str:\n",
        "back-cover renderer",
    )

    assemble_back_cover = '''def assemble_back_cover_document(cfg: dict, metadata: PublicationMetadata, css_text: str) -> str:
    """A standalone final back-cover page, printed without headers or footers."""
    direction = cfg.get("direction", "ltr")
    lang = cfg.get("mkdocs_language", "en")
    back_cover = render_back_cover_html(cfg["name"], metadata)
    return _wrap_document(
        lang,
        direction,
        "",
        f"The Gongfu of Xinzuo - {cfg['name']}",
        css_text,
        back_cover,
    )


'''
    exporter = _replace_checked(
        exporter,
        "def footer_template(direction: str) -> str:\n",
        assemble_back_cover + "def footer_template(direction: str) -> str:\n",
        "back-cover document assembly",
    )

    exporter = _replace_checked(
        exporter,
        '    cover_pdf = pdf_path.with_suffix(".cover.pdf")\n    rest_pdf = pdf_path.with_suffix(".rest.pdf")',
        '    cover_pdf = pdf_path.with_suffix(".cover.pdf")\n    rest_pdf = pdf_path.with_suffix(".rest.pdf")\n    back_cover_pdf = pdf_path.with_suffix(".back.pdf")',
        "back-cover temporary PDF",
    )

    old_render = '''        merge_pdfs(
            [cover_pdf, rest_pdf],
            pdf_path,
            language_name=cfg["name"],
            metadata=metadata,
        )
'''
    new_render = '''        write_back_cover_qr(code)
        back_cover_html = assemble_back_cover_document(cfg, metadata, css_text)
        (SITE / code / PRINT_BACK_COVER_NAME).write_text(back_cover_html, encoding="utf-8")
        page.goto(f"{base_url}{code}/{PRINT_BACK_COVER_NAME}", wait_until="load")
        wait_for_images_loaded(page, f"{code}:back cover")
        page.pdf(
            path=str(back_cover_pdf),
            format="A5",
            print_background=True,
            margin={"top": "0", "bottom": "0", "left": "0", "right": "0"},
        )

        merge_pdfs(
            [cover_pdf, rest_pdf, back_cover_pdf],
            pdf_path,
            language_name=cfg["name"],
            metadata=metadata,
        )
'''
    exporter = _replace_checked(exporter, old_render, new_render, "back-cover render sequence")

    exporter = _replace_checked(
        exporter,
        '        (SITE / code / PRINT_COVER_NAME).unlink(missing_ok=True)\n        (SITE / code / PRINT_REST_NAME).unlink(missing_ok=True)\n        cover_pdf.unlink(missing_ok=True)\n        rest_pdf.unlink(missing_ok=True)',
        '        (SITE / code / PRINT_COVER_NAME).unlink(missing_ok=True)\n        (SITE / code / PRINT_REST_NAME).unlink(missing_ok=True)\n        (SITE / code / PRINT_BACK_COVER_NAME).unlink(missing_ok=True)\n        (SITE / code / PRINT_BACK_COVER_QR).unlink(missing_ok=True)\n        cover_pdf.unlink(missing_ok=True)\n        rest_pdf.unlink(missing_ok=True)\n        back_cover_pdf.unlink(missing_ok=True)',
        "back-cover cleanup",
    )

    return exporter
