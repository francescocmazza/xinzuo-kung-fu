#!/usr/bin/env python3
"""Regression tests for the OpenAI differential translation pipeline."""

from pathlib import Path

from openai_translate import (
    SourceBlock,
    _degeneration_problem,
    mask_protected_literals,
    parse_existing_units,
    prepare_units,
    render_units,
    restore_protected_literals,
    split_markdown_blocks,
)


def main() -> int:
    source = """# Title

A paragraph with [a link](https://example.com/a) and <span class="x">visible text</span>.

<div>
Line one.

Line two.
</div>

~~~text
do not

translate
~~~
"""
    blocks = split_markdown_blocks(source)
    assert len(blocks) == 4, blocks
    assert blocks[2].text.startswith("<div>")
    assert "Line two." in blocks[2].text
    assert blocks[3].text.startswith("~~~text")

    masked, mapping = mask_protected_literals(
        'See https://example.com before <span class="x">text</span>.'
    )
    assert "https://example.com" not in masked
    assert '<span class="x">' not in masked
    restored = restore_protected_literals(masked, mapping)
    assert restored == 'See https://example.com before <span class="x">text</span>.'

    duplicate_blocks = [
        SourceBlock("Repeated paragraph.", "\n\n"),
        SourceBlock("Repeated paragraph.", "\n\n"),
    ]
    units = prepare_units(duplicate_blocks, "it", [])
    assert units[0].unit_key != units[1].unit_key

    translations = {
        units[0].unit_key: "Paragrafo ripetuto.",
        units[1].unit_key: "Paragrafo ripetuto.",
    }
    rendered = render_units(duplicate_blocks, units, translations)
    parsed = parse_existing_units(rendered)
    assert list(parsed) == [units[0].unit_key, units[1].unit_key]

    assert _degeneration_problem("bisello bisello bisello bisello bisello") is not None
    assert (
        _degeneration_problem(
            "fondello del manico fondello del manico fondello del manico "
            "fondello del manico"
        )
        is not None
    )
    assert _degeneration_problem("Il bisello conduce al filo con una geometria regolare.") is None

    print("OpenAI translation regression tests passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
