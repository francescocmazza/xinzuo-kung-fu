#!/usr/bin/env python3
"""Inject the localized printed back cover into the PDF exporter.

The source copy lives in ``content/en/back-cover.md`` and is translated by the
same localization engine used for the rest of the book. During pull-request
smoke tests only English is required; missing translated back-cover files fall
back to English until the main publication workflow refreshes translations.
"""

from __future__ import annotations

import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SOURCE_BACK_COVER = ROOT / "content" / "en" / "back-cover.md"


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
    if not title_match or not headline_match:
        raise RuntimeError(f"Back-cover structure is incomplete in {path}")

    prose_block = body[headline_match.end() :]
    paragraphs = [
        _plain_text(chunk)
        for chunk in re.split(r"\n\s*\n", prose_block)
        if _plain_text(chunk)
    ]
    if len(paragraphs) < 3:
        raise RuntimeError(f"Back-cover prose is incomplete in {path}")

    return {
        "eyebrow": _plain_text(title_match.group(1)),
        "headline": _plain_text(headline_match.group(1)),
        "paragraphs": paragraphs,
    }


def apply_back_cover_profile(exporter: str) -> str:
    """Return ``exporter`` with a standalone final back-cover page injected."""

    exporter = _replace_checked(
        exporter,
        'PRINT_EDITION_QR = "__edition_qr.png"',
        'PRINT_EDITION_QR = "__edition_qr.png"\nPRINT_BACK_COVER_NAME = "__print_back_cover__.html"',
        "back-cover print filename",
    )

    back_copy = repr(_extract_back_cover_text(
        SOURCE_BACK_COVER.read_text(encoding="utf-8"), SOURCE_BACK_COVER
    ))
    exporter = _replace_checked(
        exporter,
        "EDITION_COPY = {",
        f"BACK_COVER_COPY = {back_copy}\nEDITION_COPY = {{",
        "back-cover copy",
    )

    render_back_cover = '''def render_back_cover_html() -> str:
    copy = BACK_COVER_COPY
    paragraphs = "".join(f"<p>{html.escape(paragraph)}</p>" for paragraph in copy["paragraphs"])
    return f"""
    <section class="kb-back-cover">
      <div class="kb-back-cover__inner">
        <p class="kb-back-cover__eyebrow">{html.escape(copy["eyebrow"])}</p>
        <h2 class="kb-back-cover__headline">{html.escape(copy["headline"])}</h2>
        <div class="kb-back-cover__body">{paragraphs}</div>
        <div class="kb-back-cover__rule">◆</div>
        <div class="kb-back-cover__author-block">
          <p class="kb-back-cover__author">Francesco Claudio Mazza</p>
        </div>
      </div>
    </section>
    """


'''
    current_renderer = "def render_edition_html(cfg: dict[str, Any], metadata: PublicationMetadata) -> str:\n"
    legacy_renderer = "def render_edition_html(language_name: str, metadata: PublicationMetadata) -> str:\n"
    if current_renderer in exporter:
        exporter = exporter.replace(
            current_renderer,
            render_back_cover + current_renderer,
        )
    elif legacy_renderer in exporter:
        exporter = exporter.replace(
            legacy_renderer,
            render_back_cover + legacy_renderer,
        )
    elif render_back_cover not in exporter:
        raise RuntimeError("Could not inject back cover: expected 'back-cover renderer' was not found.")

    assemble_back_cover = '''def assemble_back_cover_document(cfg: dict, metadata: PublicationMetadata, css_text: str) -> str:
    """A standalone final back-cover page, printed without headers or footers."""
    direction = cfg.get("direction", "ltr")
    lang = cfg.get("mkdocs_language", "en")
    back_cover = render_back_cover_html()
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

    old_render_current = '''        merge_pdfs(
            [cover_pdf, rest_pdf],
            pdf_path,
            cfg=cfg,
            metadata=metadata,
        )
'''
    old_render_legacy = '''        merge_pdfs(
            [cover_pdf, rest_pdf],
            pdf_path,
            language_name=cfg["name"],
            metadata=metadata,
        )
'''
    new_render_current = '''        back_cover_html = assemble_back_cover_document(cfg, metadata, css_text)
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
            cfg=cfg,
            metadata=metadata,
        )
'''
    new_render_legacy = new_render_current.replace(
        "            cfg=cfg,\n",
        '            language_name=cfg["name"],\n',
    )
    if old_render_current in exporter:
        exporter = exporter.replace(old_render_current, new_render_current)
    elif old_render_legacy in exporter:
        exporter = exporter.replace(old_render_legacy, new_render_legacy)
    elif "[cover_pdf, rest_pdf, back_cover_pdf]" not in exporter:
        raise RuntimeError("Could not inject back cover: expected 'back-cover render sequence' was not found.")

    exporter = _replace_checked(
        exporter,
        '        (SITE / code / PRINT_COVER_NAME).unlink(missing_ok=True)\n        (SITE / code / PRINT_REST_NAME).unlink(missing_ok=True)\n        cover_pdf.unlink(missing_ok=True)\n        rest_pdf.unlink(missing_ok=True)',
        '        (SITE / code / PRINT_COVER_NAME).unlink(missing_ok=True)\n        (SITE / code / PRINT_REST_NAME).unlink(missing_ok=True)\n        (SITE / code / PRINT_BACK_COVER_NAME).unlink(missing_ok=True)\n        cover_pdf.unlink(missing_ok=True)\n        rest_pdf.unlink(missing_ok=True)\n        back_cover_pdf.unlink(missing_ok=True)',
        "back-cover cleanup",
    )

    return exporter
