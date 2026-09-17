#!/usr/bin/env python3
"""Regression tests for controlled knife terminology."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from translation_terminology import load_terminology, validate_active_locales


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def main() -> int:
    counts = validate_active_locales(["it", "zh-Hans"])
    require(counts["it"] >= 70, "Italian controlled vocabulary unexpectedly small")
    require(counts["zh-Hans"] >= 70, "Simplified-Chinese controlled vocabulary unexpectedly small")

    it = load_terminology("it")
    zh = load_terminology("zh-Hans")

    # Longest match must win: never force both "full tang" and the nested "tang".
    require(
        it.required_targets("A full tang blade") == ["codolo integrale", "lama"],
        "Italian longest-term precedence failed",
    )
    require(
        zh.required_targets("A full tang blade") == ["全龙骨", "刀身"],
        "Chinese longest-term precedence failed",
    )

    # Critical terms that were mistranslated by the old generic engine.
    require(
        it.required_targets("single-bevel geometry, microbevel and burr")
        == ["bisello singolo", "microbisello", "bava di affilatura"],
        "Italian bevel/sharpening terminology failed",
    )
    require(
        zh.required_targets("single-bevel geometry, microbevel and burr")
        == ["单面开刃", "微刃面", "刃口毛刺"],
        "Chinese bevel/sharpening terminology failed",
    )

    # Japanese knife names must survive MT instead of being transliterated into nonsense.
    require(
        it.required_targets("Santoku, Nakiri and Bunka")
        == ["santoku", "nakiri", "bunka"],
        "Italian knife-name preservation failed",
    )
    require(
        zh.required_targets("Santoku, Nakiri and Bunka")
        == ["santoku", "nakiri", "bunka"],
        "Chinese knife-name preservation failed",
    )

    # Output validation must catch a generic but non-approved substitute.
    missing = it.missing_targets(
        "The bevel forms the cutting edge.",
        "Lo smusso forma il bordo.",
    )
    require(
        missing == ["bisello", "filo"],
        f"Terminology omission detection failed: {missing}",
    )

    print(
        "Controlled terminology regression tests passed "
        f"({counts['it']} it forms, {counts['zh-Hans']} zh-Hans forms)."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
