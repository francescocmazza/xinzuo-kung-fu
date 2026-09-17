#!/usr/bin/env python3
"""Regression tests for controlled knife terminology."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import auto_translate
from auto_translate import _generate_unit_with_constraint_splitting, _split_constraint_units
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

    # Ambiguous English words are deliberately constrained only in technical phrases.
    # "handle" below is a verb, not the knife component.
    require(
        it.required_targets("A deba can handle appropriate fish-butchery work.") == ["deba"],
        "Italian terminology incorrectly constrained verbal 'handle'",
    )
    require(
        zh.required_targets("A deba can handle appropriate fish-butchery work.") == ["出刃"],
        "Chinese terminology incorrectly constrained verbal 'handle'",
    )

    # "grain" can mean wood/fibre grain as well as metallurgical crystal grains.
    require(
        it.required_targets("Slice across the grain.") == [],
        "Italian terminology incorrectly constrained food/wood 'grain'",
    )
    require(
        zh.required_targets("Slice across the grain.") == [],
        "Chinese terminology incorrectly constrained food/wood 'grain'",
    )
    require(
        it.required_targets("Grain size and grain refinement affect steel microstructure.")
        == ["dimensione del grano cristallino", "affinamento del grano cristallino", "microstruttura"],
        "Italian grain metallurgy terminology failed",
    )
    require(
        zh.required_targets("Grain size and grain refinement affect steel microstructure.")
        == ["晶粒尺寸", "晶粒细化", "显微组织"],
        "Chinese grain metallurgy terminology failed",
    )

    # A terminology-dense sentence must be split before constrained beam search.
    dense = (
        "Hardness, toughness, edge retention, wear resistance and corrosion resistance "
        "all depend on heat treatment and edge geometry."
    )
    for locale, terminology in (("it", it), ("zh-Hans", zh)):
        pieces = _split_constraint_units(dense, terminology)
        require(pieces is not None, f"{locale} dense terminology sentence was not split")
        prose = [
            piece
            for piece in pieces
            if piece.strip() and not piece.strip().lower() in {"and", "or"}
            and not piece.lstrip().startswith((",", ";", ":", "—", "–"))
        ]
        require(
            all(len(terminology.required_targets(piece)) <= 2 for piece in prose),
            f"{locale} clause split left too many simultaneous constraints: {pieces}",
        )

    # Regression for the production failure seen on 2026-09-17. A two-term
    # sub-clause can still fail constrained decoding. It must therefore flow
    # through the wrapper and split again at its conjunction rather than calling
    # the original generator directly and aborting the whole book refresh.
    source = "edge retention and microstructure in detail."

    class FakeTranslator:
        locale = "it"
        terminology = it

    original = auto_translate._ORIGINAL_GENERATE_UNIT

    def fake_original(_self, text: str) -> str:
        normalized = text.strip().lower()
        if "edge retention" in normalized and "microstructure" in normalized:
            raise RuntimeError(
                "it: constrained translation omitted controlled term(s) tenuta del filo "
                f"while translating: {text!r}"
            )
        if "edge retention" in normalized:
            return "tenuta del filo"
        if "microstructure" in normalized:
            return "microstruttura in dettaglio."
        return text

    try:
        auto_translate._ORIGINAL_GENERATE_UNIT = fake_original
        translated = _generate_unit_with_constraint_splitting(FakeTranslator(), source)
    finally:
        auto_translate._ORIGINAL_GENERATE_UNIT = original

    require(
        it.missing_targets(source, translated) == [],
        f"Nested constrained-decoding fallback failed: {translated!r}",
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
