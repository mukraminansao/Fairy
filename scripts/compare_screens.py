#!/usr/bin/env python3
"""Compare a Fairy reference screenshot with a captured implementation screenshot.

Requires Pillow: python -m pip install Pillow

Example:
  python scripts/compare_screens.py \
    assets/references/01_fairy_homepage.png qa/actual/01_homepage.png \
    --output qa/diff/01.png --overlay qa/overlay/01.png

Unlike a visual test runner, this tool does not approve UI quality automatically.
It creates inspection artifacts and prints simple pixel statistics. Different
product photography can dominate pixel error even when layout is good.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageChops, ImageEnhance, ImageStat


def main() -> None:
    parser = argparse.ArgumentParser(description="FAIRY screenshot diff/overlay")
    parser.add_argument("reference", type=Path)
    parser.add_argument("actual", type=Path)
    parser.add_argument("--output", type=Path, required=True, help="Difference image")
    parser.add_argument("--overlay", type=Path, required=True, help="50 percent blend image")
    parser.add_argument("--threshold", type=int, default=24, help="Per-channel difference threshold (0..255)")
    args = parser.parse_args()

    with Image.open(args.reference) as ref_image, Image.open(args.actual) as actual_image:
        reference = ref_image.convert("RGB")
        actual = actual_image.convert("RGB")

    if reference.size != actual.size:
        parser.error(
            f"Reference is {reference.size}, actual is {actual.size}. "
            "Capture at the SAME viewport and DPR; do not resize away a layout mismatch."
        )

    difference = ImageChops.difference(reference, actual)
    stats = ImageStat.Stat(difference)
    mean_absolute_error = sum(stats.mean) / len(stats.mean)
    gray_diff = difference.convert("L")
    histogram = gray_diff.histogram()
    changed = sum(histogram[args.threshold + 1 :])
    total = reference.width * reference.height

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.overlay.parent.mkdir(parents=True, exist_ok=True)
    ImageEnhance.Contrast(difference).enhance(2.8).save(args.output)
    Image.blend(reference, actual, 0.5).save(args.overlay)

    print(f"FAIRY reference: {args.reference}")
    print(f"Captured implementation: {args.actual}")
    print(f"Dimensions: {reference.width} x {reference.height}")
    print(f"Mean absolute RGB channel difference: {mean_absolute_error:.2f}/255")
    print(f"Pixels above grayscale difference {args.threshold}: {changed / total:.2%}")
    print(f"Diff saved to: {args.output}")
    print(f"Overlay saved to: {args.overlay}")
    print("This is a diagnostic metric, NOT a pass/fail signal by itself; inspect photographic regions separately.")


if __name__ == "__main__":
    main()
