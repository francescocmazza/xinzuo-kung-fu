#!/usr/bin/env python3
"""Compatibility entry point for the terminology-aware translation engine.

Public names are re-exported because repair_translated_html.py imports the
translator helpers lazily from this module.
"""

from translation_engine import *  # noqa: F401,F403


if __name__ == "__main__":
    raise SystemExit(main())
