#!/usr/bin/env python3
from chatgpt_translate import (
    SourceBlock,
    degeneration,
    mask_literals,
    parse_units,
    prepare_units,
    render,
    restore_literals,
    split_blocks,
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
    blocks = split_blocks(source)
    assert len(blocks) == 4
    assert blocks[2].text.startswith("<div>")
    masked, mapping = mask_literals('See https://example.com and <span class="x">text</span>.')
    assert "https://example.com" not in masked
    assert restore_literals(masked, mapping) == 'See https://example.com and <span class="x">text</span>.'

    dup = [SourceBlock("Repeated.", "\n\n"), SourceBlock("Repeated.", "\n\n")]
    units = prepare_units(dup, "it", [], "")
    assert units[0].key != units[1].key
    body = render(dup, units, {u.key: "Ripetuto." for u in units})
    assert list(parse_units(body)) == [u.key for u in units]

    assert degeneration("bisello bisello bisello bisello bisello")
    assert degeneration("fondello del manico fondello del manico fondello del manico fondello del manico")
    assert degeneration("Il bisello conduce al filo.") is None
    print("ChatGPT differential translation tests passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
