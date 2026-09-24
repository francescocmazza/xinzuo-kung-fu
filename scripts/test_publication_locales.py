#!/usr/bin/env python3
"""Regression tests for progressive publish-when-complete locale resolution."""

from __future__ import annotations

import publication_locales as pl


def main() -> int:
    original_locale_config = pl.locale_config
    original_source_paths = pl.source_paths
    original_check = pl.check
    try:
        cfg = {
            "en": {"name": "English", "publish_when_complete": True},
            "it": {"name": "Italiano", "publish_when_complete": True},
            "nl": {"name": "Nederlands", "publish_when_complete": True},
            "fr": {"name": "Français", "publish_when_complete": True},
            "ar": {"name": "العربية", "publish_when_complete": False},
        }

        pl.locale_config = lambda: cfg
        pl.source_paths = lambda _values: ["index.md", "chapter.md"]

        def fake_check(_cfg, locales, _paths):
            code = locales[0]
            if code == "it":
                return []
            if code == "nl":
                return []
            if code == "fr":
                return ["fr:chapter.md: missing"]
            raise AssertionError(f"unexpected validation call for {code}")

        pl.check = fake_check

        state = pl.readiness()
        assert state["en"]["ready"] is True
        assert state["it"]["ready"] is True
        assert state["nl"]["ready"] is True
        assert state["fr"]["ready"] is False
        assert state["ar"]["ready"] is False
        assert pl.ready_locales() == ["en", "it", "nl"]

        assert pl.locale_asset_tag("zh-Hans") == "ZH-HANS"
        assert pl.locale_asset_tag("nl") == "NL"
        assets = pl.expected_assets("Revision-99")
        assert "The-Gongfu-of-Xinzuo-EN-Revision-99.pdf" in assets
        assert "The-Gongfu-of-Xinzuo-IT-Revision-99.pdf" in assets
        assert "The-Gongfu-of-Xinzuo-NL-Revision-99.pdf" in assets
        assert not any("-FR-" in asset for asset in assets)
        assert not any("-AR-" in asset for asset in assets)

        print("Progressive publication locale tests passed")
        return 0
    finally:
        pl.locale_config = original_locale_config
        pl.source_paths = original_source_paths
        pl.check = original_check


if __name__ == "__main__":
    raise SystemExit(main())
