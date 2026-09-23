#!/usr/bin/env python3
"""Regression cases for translation_quality.py."""

from translation_quality import quality_issues_for_pair


def codes(source: str, target: str, locale: str = "it") -> set[str]:
    return {issue.code for issue in quality_issues_for_pair(source, target, locale)}


def main() -> int:
    normal_source = """# Knife Shapes and Their Uses

The heel supports controlled work while the point handles detail.
"""
    normal_target = """# Forme dei coltelli e loro usi

Il tallone sostiene il lavoro controllato mentre la punta cura i dettagli.
"""
    assert not codes(normal_source, normal_target)

    repeated_token = """# Anatomy of a Kitchen Knife

The bevel leads to the cutting edge.
"""
    repeated_token_it = """# Anatomia di un coltello da cucina

Il bisello bisello bisello bisello bisello bisello conduce al filo.
"""
    assert "repeated-token-loop" in codes(repeated_token, repeated_token_it)

    repeated_phrase = """# Handle construction

The rear of the handle is the butt.
"""
    repeated_phrase_it = """# Costruzione del manico

Il retro è fondello del manico fondello del manico fondello del manico fondello del manico.
"""
    assert "repeated-phrase-loop" in codes(repeated_phrase, repeated_phrase_it)

    expansion_source = "A short sentence about the blade.\n"
    expansion_target = ("lama " * 90).strip() + "\n"
    expansion_codes = codes(expansion_source, expansion_target)
    assert "repeated-token-loop" in expansion_codes
    assert "implausible-expansion" in expansion_codes

    unchanged_heading_source = """# Knife Shapes and Their Uses

Text.
"""
    unchanged_heading_target = """# Knife Shapes and Their Uses

Testo.
"""
    assert "untranslated-heading" in codes(
        unchanged_heading_source,
        unchanged_heading_target,
    )

    preserved_title = """# The Gongfu of Xinzuo

Text.
"""
    preserved_title_it = """# The Gongfu of Xinzuo

Testo.
"""
    assert "untranslated-heading" not in codes(preserved_title, preserved_title_it)

    single_name = """## Gyuto

Text.
"""
    single_name_it = """## Gyuto

Testo.
"""
    assert "untranslated-heading" not in codes(single_name, single_name_it)

    print("translation_quality regression tests passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
