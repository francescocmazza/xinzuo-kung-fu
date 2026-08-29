#!/usr/bin/env python3
"""Fast regression checks for translated-placeholder repair.

These checks intentionally avoid loading any translation model. They guard the
front-matter/body alignment and legacy placeholder formats that previously caused
the multilingual workflow to fail only after the expensive Marian refresh.
"""

from repair_translated_html import (
    _repair_literal_line,
    _translation_body_with_header,
)
from multilingual_site import split_document


def main() -> int:
    source_text = "---\ntitle: Example\n---\n\n# Title\n\nSee [Target](target.md).\n"
    target_text = (
        "---\nsource_hash: example\n---\n\n# Titolo\n\n"
        "Vedi {KBLINK000}.\n"
    )

    _, source_body = split_document(source_text)
    header, target_body = _translation_body_with_header(target_text)

    assert header == "---\nsource_hash: example\n---\n"
    assert len(source_body.splitlines(keepends=True)) == len(
        target_body.splitlines(keepends=True)
    ), "Translated body boundary must match split_document() line alignment"

    source_line = "See [Target](target.md).\n"
    wrapped = _repair_literal_line(source_line, "Vedi {KBLINK000}.\n")
    bare = _repair_literal_line(source_line, "Vedi KBLINK000.\n")
    expected = "Vedi [Target](target.md).\n"

    assert wrapped == expected, wrapped
    assert bare == expected, bare
    assert "{" not in wrapped and "}" not in wrapped
    assert "KBLINK" not in wrapped and "KBLINK" not in bare

    print("Translation repair regression checks passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
