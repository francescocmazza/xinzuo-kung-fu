#!/usr/bin/env python3
"""Apply the A5 print-publication profile before GitHub PDF export.

The base exporter remains usable on its own, while every GitHub publication
workflow calls this helper before rendering PDFs. Keeping the print profile in
one place makes trim-size and layout tuning explicit and easy to adjust while
preparing the physical edition.
"""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
EXPORTER = ROOT / "scripts" / "export_pdf_guides.py"
PRINT_CSS = ROOT / "scripts" / "pdf_export" / "print.css"


def replace_checked(text: str, old: str, new: str, label: str) -> str:
    """Replace an expected value, while remaining safe to run twice."""
    if old in text:
        return text.replace(old, new)
    if new in text:
        return text
    raise RuntimeError(f"Could not apply A5 profile: expected {label!r} was not found.")


def main() -> int:
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
        'format="A4"',
        'format="A5"',
        "Chromium paper format",
    )
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
        ("width: 150mm;", "width: 112mm;", "knife-shape spread width"),
        (
            "The printable A4 content area is roughly 259mm tall (297mm minus the\n * 20mm/18mm top/bottom margins). A full-width portrait image can render",
            "The printable A5 content area is roughly 181mm tall (210mm minus the\n * 14mm/15mm top/bottom margins). A full-width portrait image can render",
            "learning-figure page-height comment",
        ),
        ("max-height: 195mm;", "max-height: 135mm;", "learning-figure image height"),
    ]
    for old, new, label in replacements:
        css = replace_checked(css, old, new, label)
    PRINT_CSS.write_text(css, encoding="utf-8")

    print("Applied A5 publication profile: 148 x 210 mm, 14/15/14/14 mm PDF margins.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
