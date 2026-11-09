#!/usr/bin/env python3
"""Validate Fairy handoff asset links, scene hotspots and image dimensions."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent.parent


def main() -> None:
    catalog = json.loads((ROOT / "data/catalog.json").read_text(encoding="utf-8"))
    scenes = json.loads((ROOT / "data/scenes.json").read_text(encoding="utf-8"))
    products = {item["id"]: item for item in catalog["products"]}
    problems = []

    stack = json.loads((ROOT / "stack/fairy-stack.json").read_text(encoding="utf-8"))
    if stack.get("project") != "FAIRY" or stack.get("decisionStatus") != "locked":
        problems.append("Locked FAIRY tech-stack declaration missing")
    if stack.get("data", {}).get("database") != "PostgreSQL" or stack.get("data", {}).get("orm") != "Prisma ORM":
        problems.append("Unexpected database/ORM stack")
    required_files = [
        ".env.example", "prisma.config.ts.example", "prisma/schema.prisma",
        "docs/09_LOCKED_TECH_STACK.md", "docs/10_DATABASE_SCHEMA.md",
        "docs/11_API_CONTRACT.md", "docs/12_AUTH_ADMIN_SECURITY.md",
    ]
    for name in required_files:
        if not (ROOT / name).is_file():
            problems.append(f"Missing backend planning asset: {name}")

    def check_asset(web_path: str) -> Path:
        candidate = ROOT / web_path.lstrip("/")
        if not candidate.is_file():
            served_asset = ROOT / "public" / web_path.lstrip("/")
            if served_asset.is_file():
                return served_asset
            problems.append(f"Missing asset: {web_path}")
        return candidate

    for product in products.values():
        check_asset(product["previewImage"])

    for scene in scenes["scenes"]:
        source = check_asset(scene["image"])
        if not source.is_file():
            continue
        with Image.open(source) as image:
            actual_size = list(image.size)
        if scene["imageSize"] != actual_size:
            problems.append(f"Scene {scene['id']} dimensions {scene['imageSize']} != image {actual_size}")
        width, height = actual_size
        if scene["defaultSelectedProductId"] not in products:
            problems.append(f"Scene {scene['id']} default product missing")
        for region in scene["hotspots"]:
            if region["productId"] not in products:
                problems.append(f"Scene {scene['id']} hotspot product missing: {region['productId']}")
            x, y, w, h = region["rect"]
            if x < 0 or y < 0 or w <= 0 or h <= 0 or x + w > width or y + h > height:
                problems.append(f"Out-of-image hotspot for {region['productId']}: {region['rect']}")

    for index, name in enumerate(
        [
            "01_fairy_homepage.png",
            "02_fairy_fashion_shoppable.png",
            "03_fairy_makeup_shoppable.png",
            "04_fairy_virtual_beauty_studio.png",
        ],
        start=1,
    ):
        path = ROOT / "assets/references" / name
        if not path.is_file():
            problems.append(f"Missing screen {index}: {path}")
            continue
        with Image.open(path) as image:
            if image.size != (1672, 941):
                problems.append(f"Wrong reference dimensions for {name}: {image.size}")

    if problems:
        print("FAIRY kit validation failed:")
        for p in problems:
            print(f"- {p}")
        raise SystemExit(1)

    print(f"FAIRY kit OK: {len(products)} products, {len(scenes['scenes'])} scenes, 4 references")


if __name__ == "__main__":
    main()
