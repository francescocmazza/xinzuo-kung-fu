#!/usr/bin/env python3
"""Regression test for the simplified localized back-cover publication layout and final-page QR."""

from back_cover import ROOT, _extract_back_cover_text, apply_back_cover_profile


def main() -> int:
    paths = [
        ROOT / "translations" / "it" / "back-cover.md",
        ROOT / "translations" / "zh-Hans" / "back-cover.md",
    ]
    for path in paths:
        data = _extract_back_cover_text(path.read_text(encoding="utf-8"), path)
        assert data["eyebrow"]
        assert data["headline"]
        assert len(data["paragraphs"]) >= 3
        assert "cta" not in data
        assert "cta_text" not in data
        assert "author_role" not in data

    exporter_path = ROOT / "scripts" / "export_pdf_guides.py"
    patched = apply_back_cover_profile(exporter_path.read_text(encoding="utf-8"))
    assert "PRINT_BACK_COVER_NAME" in patched
    assert "PRINT_EDITION_QR" in patched
    assert "[cover_pdf, rest_pdf, back_cover_pdf]" in patched
    assert "cfg=cfg" in patched
    assert "PRINT_BACK_COVER_QR" not in patched
    print("Simplified back-cover parsing and final-page QR injection tests passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
