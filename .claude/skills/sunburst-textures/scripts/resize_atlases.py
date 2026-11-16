#!/usr/bin/env python3
"""Re-sample the game's texture atlases to new tile sizes.

Large surfaces (ground, walls, glass, sea) keep about 1/3.5 of their former texels,
small furnishings and figures about 1/6. Atlases built from textures/tiles are re-packed
from the tiles; the original atlases (materials, craft, surfaces) are re-sampled from
their largest existing file. Prints the GPU memory of the high-detail set before and after.
"""
import json, sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[4]
# name: (columns, layers, old sizes, new sizes, source)
PLAN = {
    'materials': (8, 40, (128, 384), (68, 204), None),
    'craft':     (6, 36, (112, 288), (46, 118), None),
    'surfaces':  (6, 36, (96, 256), (40, 104), None),
    'decor':     (6, 72, (96, 256), (52, 136), 'textures/decor-atlas.json'),
    'terrain':   (6, 72, (128, 320), (68, 172), 'textures/terrain-atlas.json'),
    'fabric':    (6, 63, (128, 256), (68, 136), 'textures/fabric-atlas.json'),
    'props':     (6, 45, (128, 256), (68, 136), 'textures/props-atlas.json'),
}
ART = {'stained-glass.webp': 204, 'altarpiece.webp': 342}

def mib(size, layers):  # RGBA8 with a full mip chain
    return size * size * 4 * layers * 4 / 3 / 2**20

def tiles_from_atlas(path, cols, layers):
    img = Image.open(path).convert('RGB')
    s = img.width // cols
    return [img.crop(((k % cols) * s, (k // cols) * s, (k % cols + 1) * s, (k // cols + 1) * s)) for k in range(layers)]

def tiles_from_manifest(manifest):
    atlas = json.loads((ROOT / manifest).read_text())
    lookup = {p.stem: p for p in (ROOT / 'textures' / 'tiles').glob('*/*.webp')}
    missing = [i for i in atlas['layers'] if i not in lookup]
    if missing:
        sys.exit(f'{manifest}: run `sunburst.py slice` first, missing {missing[:5]}')
    return atlas, [Image.open(lookup[i]).convert('RGB') for i in atlas['layers']]

before = after = 0
for name, (cols, layers, old, new, manifest) in PLAN.items():
    before += mib(old[1], layers); after += mib(new[1], layers)
    if manifest:
        atlas, tiles = tiles_from_manifest(manifest)
        atlas['sizes'] = list(new)
        (ROOT / manifest).write_text(json.dumps(atlas, ensure_ascii=False, indent=2) + '\n')
    else:
        tiles = tiles_from_atlas(ROOT / f'{name}-{old[1]}.webp', cols, layers)
    rows = -(-layers // cols)
    for size in new:
        sheet = Image.new('RGB', (cols * size, rows * size))
        for k, t in enumerate(tiles):
            sheet.paste(t.resize((size, size), Image.LANCZOS), ((k % cols) * size, (k // cols) * size))
        sheet.save(ROOT / f'{name}-{size}.webp', quality=90, method=6)
    for size in old:
        if size not in new:
            (ROOT / f'{name}-{size}.webp').unlink(missing_ok=True)
    print(f'{name:9s} {old} -> {new}')
for name, size in ART.items():
    im = Image.open(ROOT / name).convert('RGB')
    before += im.width * im.height * 4 * 4 / 3 / 2**20
    after += size * size * 4 * 4 / 3 / 2**20
    if im.width != size:
        im.resize((size, size), Image.LANCZOS).save(ROOT / name, quality=90, method=6)
print(f'high-detail texture memory: {before:.1f} MiB -> {after:.1f} MiB ({before / after:.2f}x smaller)')
