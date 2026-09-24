#!/usr/bin/env python3
"""Materialize the approved A5 front-cover artwork from source-controlled chunks.

GitHub's publication profile keeps large binary artwork as deterministic base64
chunks so the exact approved image can be reconstructed on every runner without
external hosting. The resulting WebP is 1748 x 2480 px (A5 at 300 dpi).
"""

from __future__ import annotations

import argparse
import base64
import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CHUNK_DIR = ROOT / "scripts" / "pdf_export" / "cover_art"
OUTPUT = ROOT / "content" / "en" / "assets" / "Frontespizio.webp"
EXPECTED_SHA256 = "c5f98b3a74be09da5c2725d9732028ca7922ba6685f603f5ab93b018c1d049da"
EXPECTED_SIZE = 191_354


def materialize_cover() -> Path:
    parts = sorted(CHUNK_DIR.glob("Frontespizio.webp.b64.part*"))
    if not parts:
        if OUTPUT.exists():
            digest = hashlib.sha256(OUTPUT.read_bytes()).hexdigest()
            if digest == EXPECTED_SHA256:
                return OUTPUT
        raise RuntimeError(f"No cover-art chunks found in {CHUNK_DIR}")

    encoded = "".join(p.read_text(encoding="ascii").strip() for p in parts)
    raw = base64.b64decode(encoded, validate=True)

    if len(raw) != EXPECTED_SIZE:
        raise RuntimeError(
            f"Front cover size mismatch: expected {EXPECTED_SIZE} bytes, got {len(raw)}"
        )
    digest = hashlib.sha256(raw).hexdigest()
    if digest != EXPECTED_SHA256:
        raise RuntimeError(
            f"Front cover checksum mismatch: expected {EXPECTED_SHA256}, got {digest}"
        )

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_bytes(raw)
    return OUTPUT


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.parse_args()
    output = materialize_cover()
    print(f"Materialized approved A5 front cover: {output.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
