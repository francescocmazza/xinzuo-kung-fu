#!/usr/bin/env python3
"""Resolve publication-ready locales from committed translation state.

English is always ready. A configured non-English locale is ready only when:
- publish_when_complete is enabled for that locale; and
- every English Markdown source has a current, structurally valid ChatGPT
  translation according to scripts/chatgpt_translate.py.

Incomplete locales are intentionally skipped rather than blocking publication
of languages that are already complete.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))

from chatgpt_translate import check, source_paths  # noqa: E402
from multilingual_site import LOCALES, read_yaml  # noqa: E402


def locale_config() -> dict[str, dict[str, Any]]:
    return read_yaml(LOCALES).get("locales", {})


def locale_asset_tag(code: str) -> str:
    return re.sub(r"[^A-Z0-9]+", "-", code.upper()).strip("-")


def readiness() -> dict[str, dict[str, Any]]:
    cfg = locale_config()
    paths = source_paths(None)
    result: dict[str, dict[str, Any]] = {}

    for code, item in cfg.items():
        if code == "en":
            result[code] = {
                "ready": True,
                "reason": "source",
                "failures": [],
                "name": item.get("name", code),
            }
            continue

        if not item.get("publish_when_complete", False):
            result[code] = {
                "ready": False,
                "reason": "automatic publication disabled",
                "failures": [],
                "name": item.get("name", code),
            }
            continue

        failures = check(cfg, [code], paths)
        result[code] = {
            "ready": not failures,
            "reason": "complete" if not failures else "translation incomplete or stale",
            "failures": failures,
            "name": item.get("name", code),
        }
    return result


def ready_locales() -> list[str]:
    state = readiness()
    return [code for code in locale_config() if state.get(code, {}).get("ready")]


def expected_assets(revision_slug: str) -> list[str]:
    assets = ["SHA256SUMS.txt"]
    assets.extend(
        f"The-Gongfu-of-Xinzuo-{locale_asset_tag(code)}-{revision_slug}.pdf"
        for code in ready_locales()
    )
    assets.extend(
        [
            f"the-gongfu-of-xinzuo-{revision_slug}-html.zip",
            f"the-gongfu-of-xinzuo-{revision_slug}-markdown.zip",
        ]
    )
    return sorted(assets)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--format",
        choices=["space", "lines", "json"],
        default="space",
        help="How to print publication-ready locale codes.",
    )
    parser.add_argument(
        "--expected-assets",
        metavar="REVISION_SLUG",
        help="Print the exact release asset names expected for the current ready locales.",
    )
    parser.add_argument(
        "--explain",
        action="store_true",
        help="Print readiness status for every configured locale.",
    )
    args = parser.parse_args()

    if args.expected_assets:
        print("\n".join(expected_assets(args.expected_assets)))
        return 0

    state = readiness()
    ready = [code for code in locale_config() if state.get(code, {}).get("ready")]

    if args.explain:
        for code, item in state.items():
            status = "READY" if item["ready"] else "WAIT"
            print(f"{status:5} {code:8} {item['name']}: {item['reason']}")
            if item["failures"]:
                preview = item["failures"][:3]
                for failure in preview:
                    print(f"      - {failure}")
                if len(item["failures"]) > len(preview):
                    print(f"      - ... {len(item['failures']) - len(preview)} more")
        return 0

    if args.format == "json":
        print(json.dumps(ready, ensure_ascii=False))
    elif args.format == "lines":
        print("\n".join(ready))
    else:
        print(" ".join(ready))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
