#!/usr/bin/env python3
"""Shared publication metadata: version, date and commit SHA.

Both the website build (``multilingual_site.py``) and the PDF export
(``export_pdf_guides.py``) call this module so the two publication
channels always agree on the version number and never compute it
independently.

Publication versions are sequential edition numbers, not commit counts.
The main publishing workflow resolves one candidate version at the start
of a run from the numbered GitHub Releases and exports it through the
``PUBLICATION_VERSION`` environment variable. That value remains fixed
for the whole run, including any automatic translation commit created
while publishing.

For local/manual builds where the environment variable is absent:

- if HEAD is already tagged ``edition-vN``, the build reports ``vN``;
- otherwise the build reports one more than the highest local
  ``edition-vN`` tag;
- a repository with no numbered edition tags starts at ``v1``.

This means ordinary commits never consume edition numbers. A failed
publication can retry the same candidate version, while a completed
publication advances the next edition by exactly one.
"""

from __future__ import annotations

import os
import re
import subprocess
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
PUBLICATION_TIMEZONE = ZoneInfo("Europe/Rome")
PUBLICATION_VERSION_ENV = "PUBLICATION_VERSION"
EDITION_TAG_RE = re.compile(r"^edition-v([1-9][0-9]*)$")


@dataclass(frozen=True)
class PublicationMetadata:
    version: int
    commit_sha: str
    commit_sha_short: str
    publication_date: str  # ISO YYYY-MM-DD, Europe/Rome calendar date

    @property
    def version_label(self) -> str:
        return f"v{self.version}"

    @property
    def compact_footer(self) -> str:
        """Language-neutral form suitable for every locale without translation."""
        return f"{self.version_label} · {self.publication_date}"

    @property
    def full_label(self) -> str:
        return f"Version {self.version} · commit {self.commit_sha_short}"


def _run_git(args: list[str]) -> str:
    result = subprocess.run(
        ["git", *args], cwd=ROOT, check=True, capture_output=True, text=True
    )
    return result.stdout.strip()


def _tag_version(tag: str) -> int | None:
    match = EDITION_TAG_RE.fullmatch(tag.strip())
    return int(match.group(1)) if match else None


def _versions_from_tag_output(output: str) -> list[int]:
    versions: list[int] = []
    for line in output.splitlines():
        version = _tag_version(line)
        if version is not None:
            versions.append(version)
    return versions


def get_version() -> int:
    """Return the fixed publication version for this build/export run."""
    override = os.environ.get(PUBLICATION_VERSION_ENV, "").strip()
    if override:
        if not override.isdigit() or int(override) < 1:
            raise ValueError(
                f"{PUBLICATION_VERSION_ENV} must be a positive integer, got {override!r}"
            )
        return int(override)

    exact_tags = _versions_from_tag_output(
        _run_git(["tag", "--points-at", "HEAD", "--list", "edition-v*"])
    )
    if exact_tags:
        return max(exact_tags)

    all_tags = _versions_from_tag_output(_run_git(["tag", "--list", "edition-v*"]))
    return max(all_tags, default=0) + 1


def get_commit_sha() -> tuple[str, str]:
    full = _run_git(["rev-parse", "HEAD"])
    short = _run_git(["rev-parse", "--short", "HEAD"])
    return full, short


def get_publication_date() -> str:
    return datetime.now(PUBLICATION_TIMEZONE).strftime("%Y-%m-%d")


def get_metadata() -> PublicationMetadata:
    full_sha, short_sha = get_commit_sha()
    return PublicationMetadata(
        version=get_version(),
        commit_sha=full_sha,
        commit_sha_short=short_sha,
        publication_date=get_publication_date(),
    )


def main() -> int:
    """CLI entry point: print metadata as JSON for shell/CI consumption."""
    import json

    meta = get_metadata()
    print(
        json.dumps(
            {
                "version": meta.version,
                "version_label": meta.version_label,
                "commit_sha": meta.commit_sha,
                "commit_sha_short": meta.commit_sha_short,
                "publication_date": meta.publication_date,
                "compact_footer": meta.compact_footer,
                "full_label": meta.full_label,
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
