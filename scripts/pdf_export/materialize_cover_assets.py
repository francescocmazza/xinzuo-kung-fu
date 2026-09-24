#!/usr/bin/env python3
"""Rebuild publication cover assets that are stored safely as text chunks.

GitHub connector uploads can truncate larger binary payloads. The front-cover
WebP is therefore kept as deterministic base64 chunks and materialized before
the publication build. The back-cover WebP is committed directly.
"""

from __future__ import annotations

import base64
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FRONT_CHUNKS = ROOT / ".publication-assets" / "cover-front"
FRONT_OUTPUT = ROOT / "content" / "en" / "assets" / "CoverFront.webp"
BACK_OUTPUT = ROOT / "content" / "en" / "assets" / "CoverBack.webp"


def _validate_webp(data: bytes, label: str, minimum_size: int) -> None:
    if len(data) < minimum_size:
        raise RuntimeError(f"{label} is unexpectedly small: {len(data)} bytes")
    if data[:4] != b"RIFF" or data[8:12] != b"WEBP":
        raise RuntimeError(f"{label} is not a valid RIFF/WebP payload")


def materialize_front() -> None:
    parts = sorted(FRONT_CHUNKS.glob("part-*.b64"))
    if not parts:
        raise RuntimeError(f"No front-cover chunks found in {FRONT_CHUNKS}")

    encoded = "".join(part.read_text(encoding="ascii").strip() for part in parts)
    try:
        data = base64.b64decode(encoded, validate=True)
    except Exception as exc:
        raise RuntimeError("Front-cover base64 chunks are invalid") from exc

    _validate_webp(data, "CoverFront.webp", 50_000)
    FRONT_OUTPUT.write_bytes(data)
    print(f"Materialized {FRONT_OUTPUT.relative_to(ROOT)} ({len(data)} bytes) from {len(parts)} chunks")


def validate_back() -> None:
    data = BACK_OUTPUT.read_bytes()
    _validate_webp(data, "CoverBack.webp", 8_000)
    print(f"Validated {BACK_OUTPUT.relative_to(ROOT)} ({len(data)} bytes)")


def main() -> int:
    materialize_front()
    validate_back()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
