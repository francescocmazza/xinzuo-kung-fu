#!/usr/bin/env python3
"""Regression test for localized back-cover parsing with tx-unit memory markers."""

from pathlib import Path

from back_cover import ROOT, _extract_back_cover_text


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
        assert data["cta"]
        assert data["cta_text"]
        assert data["author_role"]
    print("Localized back-cover tx-unit parsing tests passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
