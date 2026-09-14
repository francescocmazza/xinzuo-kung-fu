#!/usr/bin/env python3
"""Shared publication metadata: revision, date and commit SHA.

Both the website build (``multilingual_site.py``) and the PDF export
(``export_pdf_guides.py``) call this module so every publication channel
uses the same revision number.

From 2026-09-14 onward the public nomenclature is ``Revision N``. A
revision is a complete published edition, not a commit count. Historical
numbered releases used tags such as ``edition-v372``; there are 49 such
published revisions through the last legacy release. The current legacy
edition therefore corresponds to Revision 49, and the next complete
publication will be Revision 50.

Only the main publishing workflow is allowed to reserve the next revision.
It resolves one candidate revision at the start of a run and exports it
through ``PUBLICATION_REVISION``. That value stays fixed for the whole run,
including automatic translation commits.

For local, pull-request and manual non-publishing builds where the
environment variable is absent, metadata reports the latest *completed*
revision rather than inventing the next one:

- if HEAD is tagged ``revision-N``, report ``Revision N``;
- otherwise, if revision tags exist, report the highest existing revision;
- before the first new-style revision tag exists, report Revision 49, the
  number of complete historical numbered publications.

Ordinary commits and failed publication attempts never consume revision
numbers. Only a complete publication advances the next revision by one.
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
PUBLICATION_REVISION_ENV = "PUBLICATION_REVISION"
REVISION_TAG_RE = re.compile(r"^revision-([1-9][0-9]*)$")
LEGACY_COMPLETE_REVISION_COUNT = 49


@dataclass(frozen=True)
class PublicationMetadata:
    revision: int
    commit_sha: str
    commit_sha_short: str
    publication_date: str  # ISO YYYY-MM-DD, Europe/Rome calendar date

    @property
    def revision_label(self) -> str:
        return f"Revision {self.revision}"

    @property
    def revision_slug(self) -> str:
        return f"Revision-{self.revision}"

    # Temporary compatibility aliases for callers that still use the old
    # internal attribute names. Their rendered value already uses the new
    # public Revision nomenclature, never the legacy vXYZ format.
    @property
    def version(self) -> int:
        return self.revision

    @property
    def version_label(self) -> str:
        return self.revision_label

    @property
    def compact_footer(self) -> str:
        """Language-neutral form suitable for every locale without translation."""
        return f"{self.revision_label} · {self.publication_date}"

    @property
    def full_label(self) -> str:
        return f"{self.revision_label} · commit {self.commit_sha_short}"


def _run_git(args: list[str]) -> str:
    result = subprocess.run(
        ["git", *args], cwd=ROOT, check=True, capture_output=True, text=True
    )
    return result.stdout.strip()


def _tag_revision(tag: str) -> int | None:
    match = REVISION_TAG_RE.fullmatch(tag.strip())
    return int(match.group(1)) if match else None


def _revisions_from_tag_output(output: str) -> list[int]:
    revisions: list[int] = []
    for line in output.splitlines():
        revision = _tag_revision(line)
        if revision is not None:
            revisions.append(revision)
    return revisions


def get_revision() -> int:
    """Return the complete-publication revision represented by this build."""
    override = os.environ.get(PUBLICATION_REVISION_ENV, "").strip()
    if override:
        if not override.isdigit() or int(override) < 1:
            raise ValueError(
                f"{PUBLICATION_REVISION_ENV} must be a positive integer, got {override!r}"
            )
        return int(override)

    exact_tags = _revisions_from_tag_output(
        _run_git(["tag", "--points-at", "HEAD", "--list", "revision-*"])
    )
    if exact_tags:
        return max(exact_tags)

    all_tags = _revisions_from_tag_output(_run_git(["tag", "--list", "revision-*"]))
    if all_tags:
        return max(all_tags)

    return LEGACY_COMPLETE_REVISION_COUNT


def get_commit_sha() -> tuple[str, str]:
    full = _run_git(["rev-parse", "HEAD"])
    short = _run_git(["rev-parse", "--short", "HEAD"])
    return full, short


def get_publication_date() -> str:
    return datetime.now(PUBLICATION_TIMEZONE).strftime("%Y-%m-%d")


def get_metadata() -> PublicationMetadata:
    full_sha, short_sha = get_commit_sha()
    return PublicationMetadata(
        revision=get_revision(),
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
                "revision": meta.revision,
                "revision_label": meta.revision_label,
                "revision_slug": meta.revision_slug,
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
