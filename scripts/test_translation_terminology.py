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
    require(counts["it"] >= 100, "Italian controlled vocabulary unexpectedly small")
    require(counts["zh-Hans"] >= 100, "Simplified-Chinese controlled vocabulary unexpectedly small")

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

    # Critical edge terms that the former generic MT engine rendered inconsistently.
    require(
        it.required_targets("single-bevel geometry, microbevel and burr")
        == ["bisello singolo", "microbisello", "bava di affilatura"],
        "Italian bevel/sharpening terminology failed",
    )
    require(
        zh.required_targets("single-bevel geometry, microbevel and burr")
        == ["单面开刃", "二段刃", "刃口毛刺"],
        "Chinese bevel/sharpening terminology failed",
    )

    # Knife-category names follow each target language's established specialist usage.
    require(
        it.required_targets("Santoku, Nakiri and Bunka")
        == ["santoku", "nakiri", "bunka"],
        "Italian knife-name terminology failed",
    )
    require(
        zh.required_targets("Santoku, Nakiri and Bunka")
        == ["三德刀", "菜切", "文化刀"],
        "Chinese knife-name terminology failed",
    )

    # Metallurgy terms must not be treated as ordinary vocabulary.
    require(
        it.required_targets("Austenite transforms to martensite; pearlite contains ferrite and cementite.")
        == ["austenite", "martensite", "perlite", "ferrite", "cementite"],
        "Italian metallurgy terminology failed",
    )
    require(
        zh.required_targets("Austenite transforms to martensite; pearlite contains ferrite and cementite.")
        == ["奥氏体", "马氏体", "珠光体", "铁素体", "渗碳体"],
        "Chinese metallurgy terminology failed",
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
