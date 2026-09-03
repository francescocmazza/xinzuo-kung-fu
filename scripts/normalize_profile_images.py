#!/usr/bin/env python3
"""Normalize knife-profile photographs to a single shared aspect ratio.

The CSS that renders ``.kb-profile-visual`` figures (learning-figures.css,
and its print counterpart in scripts/pdf_export/print.css) declares a fixed
``aspect-ratio: 900 / 400`` on the ``<img>`` element instead of a hard-coded
pixel height. That only renders correctly -- full width, no leftover empty
space, no cropping -- if every source file actually has that ratio.

This script is the other half of that contract: instead of special-casing
layout in CSS or JavaScript per image (the pattern this repository is trying
to move away from -- see git history on content/en/assets/stylesheets/ and
content/en/assets/javascripts/knife-shape-layout.js), it fixes the *source
files* once, up front. An image that is off-ratio is padded with a white
matte -- centered, nothing cropped -- to reach the target ratio. An image
that cannot even be decoded (truncated/corrupt file) is reported and left
untouched, since guessing at pixel data would be wrong; restore it from
version control or re-export it instead.

Usage:
    python3 scripts/normalize_profile_images.py [--check] [--ratio W:H] [dir ...]

--check     Report what would change without writing any file (also the
            mode used by scripts/check_images.py-style CI validation).
--ratio     Target ratio, default 900:400 (wide enough for tall cleaver
            profiles to span nearly the full text width without cropping).

With no directory arguments, defaults to every
content/*/assets/images/approved/knife-shapes/ directory found in the repo
(English source plus any translation that keeps its own copies).
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from PIL import Image, ImageFile

# Report a clear error for a truncated file instead of silently returning a
# partially-decoded image.
ImageFile.LOAD_TRUNCATED_IMAGES = False

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_RATIO = (900, 400)
MATTE = (255, 255, 255)
TOLERANCE = 0.02  # fractional deviation in width/height ratio before repadding


def find_default_dirs() -> list[Path]:
    return sorted(REPO_ROOT.glob("**/assets/images/approved/knife-shapes"))


def target_size(width: int, height: int, ratio: tuple[int, int]) -> tuple[int, int]:
    """Smallest canvas >= (width, height) that matches ratio, without upscaling content."""
    rw, rh = ratio
    # Try matching by width first, then by height; keep whichever needs less padding.
    by_width = (width, round(width * rh / rw))
    by_height = (round(height * rw / rh), height)
    if by_width[1] >= height:
        candidate = by_width
    else:
        candidate = by_height
    return max(candidate[0], width), max(candidate[1], height)


def normalize_one(path: Path, ratio: tuple[int, int], check: bool) -> str:
    try:
        with Image.open(path) as im:
            im.load()
            width, height = im.size
            current_ratio = width / height
            wanted_ratio = ratio[0] / ratio[1]

            if abs(current_ratio - wanted_ratio) / wanted_ratio <= TOLERANCE:
                return "ok"

            if check:
                return f"needs-padding ({width}x{height}, ratio {current_ratio:.3f} vs {wanted_ratio:.3f})"

            canvas_w, canvas_h = target_size(width, height, ratio)
            canvas = Image.new("RGB", (canvas_w, canvas_h), MATTE)
            offset = ((canvas_w - width) // 2, (canvas_h - height) // 2)
            canvas.paste(im.convert("RGB"), offset)
            canvas.save(path, quality=92)
            return f"padded to {canvas_w}x{canvas_h}"
    except Exception as exc:  # noqa: BLE001 - report any decode failure, don't guess
        return f"BROKEN: {exc}"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument(
        "dirs", nargs="*", type=lambda p: Path(p).resolve(), help="knife-shapes directories to process"
    )
    parser.add_argument("--check", action="store_true", help="report only, write nothing")
    parser.add_argument("--ratio", default="900:400", help="target W:H ratio, default 900:400")
    args = parser.parse_args()

    ratio = tuple(int(part) for part in args.ratio.split(":"))
    if len(ratio) != 2:
        parser.error("--ratio must be W:H, e.g. 900:400")

    dirs = args.dirs or find_default_dirs()
    if not dirs:
        print("No knife-shapes directories found.", file=sys.stderr)
        return 1

    broken = 0
    changed = 0
    for directory in dirs:
        for path in sorted(directory.glob("*.jpg")) + sorted(directory.glob("*.jpeg")) + sorted(directory.glob("*.png")):
            result = normalize_one(path, ratio, args.check)
            if result != "ok":
                print(f"{path.relative_to(REPO_ROOT)}: {result}")
                if result.startswith("BROKEN"):
                    broken += 1
                else:
                    changed += 1

    if broken:
        print(f"\n{broken} file(s) could not be read at all and were left untouched.", file=sys.stderr)
    if args.check and changed:
        print(f"\n{changed} file(s) are off-ratio and would be padded by a normal run.", file=sys.stderr)
        return 1
    return 1 if broken else 0


if __name__ == "__main__":
    raise SystemExit(main())
