#!/usr/bin/env python3

from __future__ import annotations

import struct
import zlib
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = ROOT / "assets" / "icons"
SIZES = (16, 32, 48, 128)

NAVY = (21, 34, 56, 255)
PAPER = (255, 248, 237, 255)
FOLD = (235, 224, 209, 255)
LINE = (102, 122, 153, 255)


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    for size in SIZES:
        pixels = [[NAVY for _ in range(size)] for _ in range(size)]
        draw_icon(pixels, size)
        write_png(OUTPUT_DIR / f"icon-{size}.png", pixels)


def draw_icon(pixels: list[list[tuple[int, int, int, int]]], size: int) -> None:
    inset = max(2, round(size * 0.19))
    note_left = inset
    note_top = inset
    note_right = size - inset
    note_bottom = size - inset
    draw_rect(pixels, note_left, note_top, note_right, note_bottom, PAPER)

    fold = max(3, round(size * 0.18))
    for y in range(fold):
        for x in range(fold - y):
            px = note_right - fold + x
            py = note_top + y
            if 0 <= px < size and 0 <= py < size:
                pixels[py][px] = FOLD

    line_height = max(1, round(size * 0.05))
    line_gap = max(2, round(size * 0.1))
    line_left = note_left + max(2, round(size * 0.11))
    line_right = note_right - max(2, round(size * 0.11))
    line_top = note_top + max(3, round(size * 0.2))

    for index in range(3):
        top = line_top + index * line_gap
        bottom = min(top + line_height, note_bottom - 2)
        if bottom <= top:
            continue

        right = line_right
        if index == 2:
            right = note_left + round((note_right - note_left) * 0.62)

        draw_rect(pixels, line_left, top, right, bottom, LINE)


def draw_rect(
    pixels: list[list[tuple[int, int, int, int]]],
    left: int,
    top: int,
    right: int,
    bottom: int,
    color: tuple[int, int, int, int]
) -> None:
    size = len(pixels)
    clamped_left = max(0, left)
    clamped_top = max(0, top)
    clamped_right = min(size, right)
    clamped_bottom = min(size, bottom)

    for y in range(clamped_top, clamped_bottom):
        for x in range(clamped_left, clamped_right):
            pixels[y][x] = color


def write_png(path: Path, pixels: list[list[tuple[int, int, int, int]]]) -> None:
    height = len(pixels)
    width = len(pixels[0]) if height else 0
    raw = bytearray()

    for row in pixels:
        raw.append(0)
        for red, green, blue, alpha in row:
            raw.extend((red, green, blue, alpha))

    compressed = zlib.compress(bytes(raw), level=9)

    with path.open("wb") as file:
        file.write(b"\x89PNG\r\n\x1a\n")
        file.write(chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)))
        file.write(chunk(b"IDAT", compressed))
        file.write(chunk(b"IEND", b""))


def chunk(chunk_type: bytes, data: bytes) -> bytes:
    crc = zlib.crc32(chunk_type)
    crc = zlib.crc32(data, crc)
    return struct.pack(">I", len(data)) + chunk_type + data + struct.pack(">I", crc & 0xFFFFFFFF)


if __name__ == "__main__":
    main()
