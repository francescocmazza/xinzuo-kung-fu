#!/usr/bin/env python3
"""Rebuild publication cover assets that are stored safely as text chunks.

GitHub connector uploads can truncate larger binary payloads. The front-cover
WebP is therefore kept as deterministic base64 chunks and materialized before
the publication build. The back-cover WebP is committed directly.
"""

from __future__ import annotations

import base64
import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FRONT_CHUNKS = ROOT / ".publication-assets" / "cover-front"
FRONT_OUTPUT = ROOT / "content" / "en" / "assets" / "CoverFront.webp"
BACK_OUTPUT = ROOT / "content" / "en" / "assets" / "CoverBack.webp"


def _validate_webp(data: bytes, label: str, expected_size: int, expected_sha256: str) -> None:
    if len(data) != expected_size:
        raise RuntimeError(
            f"{label} has the wrong size: expected {expected_size}, got {len(data)} bytes"
        )
    if data[:4] != b"RIFF" or data[8:12] != b"WEBP":
        raise RuntimeError(f"{label} is not a valid RIFF/WebP payload")
    digest = hashlib.sha256(data).hexdigest()
    if digest != expected_sha256:
        raise RuntimeError(
            f"{label} checksum mismatch: expected {expected_sha256}, got {digest}"
        )


def materialize_front() -> None:
    parts = sorted(FRONT_CHUNKS.glob("part-*.b64"))
    if not parts:
        raise RuntimeError(f"No front-cover chunks found in {FRONT_CHUNKS}")

    encoded = "".join(part.read_text(encoding="ascii").strip() for part in parts)
    try:
        data = base64.b64decode(encoded, validate=True)
    except Exception as exc:
        raise RuntimeError("Front-cover base64 chunks are invalid") from exc

    _validate_webp(
        data,
        "CoverFront.webp",
        58_374,
        "646f0201df0f52bfd3c750eb156066f013d5f28d6ea9309b4a17b80a6e00970a",
    )
    FRONT_OUTPUT.write_bytes(data)
    print(f"Materialized {FRONT_OUTPUT.relative_to(ROOT)} ({len(data)} bytes) from {len(parts)} chunks")


def validate_back() -> None:
    data = BACK_OUTPUT.read_bytes()
    _validate_webp(
        data,
        "CoverBack.webp",
        10_430,
        "4c7e6ad9a84dfc2562487abf49de2313f71efe53ef68e97f1ba4098a912a39af",
    )
    print(f"Validated {BACK_OUTPUT.relative_to(ROOT)} ({len(data)} bytes)")


def main() -> int:
    materialize_front()
    validate_back()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
