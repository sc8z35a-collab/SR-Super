#!/usr/bin/env python3
"""GPT Image 2.5 Sunburst texture pipeline for 潮岬の大聖堂.

One API call renders a 1:1 sheet laid out as a 3x3 grid, so every image
yields nine textures.  Sub-commands:

  generate  spec.json [...]  -> textures/sheets/<sheet>.webp (+ .json log)
  slice     spec.json [...]  -> textures/tiles/<sheet>/<id>.webp  (seamless)
  pack      atlas.json       -> <name>-<size>.webp game atlases (6 columns)
  all       atlas.json       -> generate + slice every sheet it lists, then pack

The API key is read from $OPENAI_API_KEY or --key-file.  It is never written
anywhere by this script.
"""
import argparse
import base64
import io
import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np
import requests
from PIL import Image

ROOT = Path(__file__).resolve().parents[4]
SHEETS = ROOT / 'textures' / 'sheets'
TILES = ROOT / 'textures' / 'tiles'
CACHE = ROOT / 'textures' / '.cache'

MODEL = 'gpt-image-2.5-sunburst'
# Largest square first; the script steps down when the API refuses a size.
# The API caps the longest edge at 3840 px and the area at a pixel budget; 2880x2880 is
# the 3840x2160 (4K) pixel count, 2560x2560 is known to pass.
SIZES = ['2880x2880', '2560x2560', '2048x2048', '1536x1536', '1024x1024']
# "xhigh" first; if the API rejects it the best accepted level is used and logged.
QUALITIES = ['xhigh', 'high']
EFFORTS = ['xhigh', 'high', None]
API = 'https://api.openai.com/v1/images/generations'
DIVIDER = (255, 0, 255)

STYLE = (
    'Photorealistic physically based ALBEDO texture reference sheet. '
    'Strict orthographic, straight-on view of each surface (no perspective, no horizon). '
    'Soft, even, shadowless overcast studio lighting; no vignette, no glare, no reflections of the room. '
    'No text, no labels, no numbers, no watermark, no frames beyond the dividers.'
)


def sheet_prompt(spec):
    lines = [
        f'A square image divided into an exact 3 by 3 grid of nine equal square panels for a video game: {spec["theme"]}.',
        'The panels are separated by thin, perfectly straight, solid pure magenta (#FF00FF) divider lines, '
        'one-hundredth of the image wide; the outer border of the image has no divider. '
        'Every panel is filled edge to edge with its own material and nothing else.',
        STYLE,
        'Panels in reading order (left to right, top to bottom):',
    ]
    for i, tile in enumerate(spec['tiles'], 1):
        kind = ('a seamless, tileable, uniformly detailed material swatch with no focal point'
                if tile['tile'] else 'a flat artwork that fills the panel completely')
        lines.append(f'{i}. {tile["prompt"]} ({kind}).')
    return '\n'.join(lines)


def api_key(args):
    key = os.environ.get('OPENAI_API_KEY', '').strip()
    if not key and args.key_file:
        key = Path(args.key_file).expanduser().read_text().strip()
    if not key:
        sys.exit('OPENAI_API_KEY is not set (or pass --key-file).')
    return key


def request_image(key, prompt, size, quality, effort):
    body = {'model': MODEL, 'prompt': prompt, 'size': size, 'quality': quality,
            'n': 1, 'output_format': 'png', 'background': 'opaque', 'moderation': 'auto'}
    if effort:
        body['reasoning'] = {'effort': effort}
    response = requests.post(API, json=body, timeout=900,
                             headers={'Authorization': f'Bearer {key}'})
    try:
        data = response.json()
    except ValueError:
        data = {'error': {'message': response.text[:500], 'code': str(response.status_code)}}
    return response.status_code, data


def generate(key, spec_path, force=False):
    spec = json.loads(Path(spec_path).read_text())
    name = spec['sheet']
    SHEETS.mkdir(parents=True, exist_ok=True)
    CACHE.mkdir(parents=True, exist_ok=True)
    raw = CACHE / f'{name}.png'
    if raw.exists() and not force:
        print(f'[{name}] cached sheet found, skipping API call')
        return raw
    prompt = sheet_prompt(spec)
    size_i, quality_i, effort_i, server_errors = 0, 0, 0, 0
    for attempt in range(8):
        size, quality, effort = SIZES[size_i], QUALITIES[quality_i], EFFORTS[effort_i]
        print(f'[{name}] {MODEL} size={size} quality={quality} reasoning={effort}', flush=True)
        started = time.time()
        status, data = request_image(key, prompt, size, quality, effort)
        if status == 200 and data.get('data'):
            image = base64.b64decode(data['data'][0]['b64_json'])
            raw.write_bytes(image)
            log = {'model': MODEL, 'size': size, 'quality': quality, 'reasoning_effort': effort,
                   'seconds': round(time.time() - started, 1), 'usage': data.get('usage'),
                   'revised_prompt': data['data'][0].get('revised_prompt'), 'prompt': prompt}
            (SHEETS / f'{name}.json').write_text(json.dumps(log, ensure_ascii=False, indent=2))
            Image.open(io.BytesIO(image)).convert('RGB').save(SHEETS / f'{name}.webp', quality=90, method=6)
            print(f'[{name}] done in {log["seconds"]} s', flush=True)
            return raw
        error = data.get('error') or {}
        message, param = error.get('message', ''), error.get('param') or ''
        print(f'[{name}] refused ({status}): {message}', flush=True)
        if error.get('type') == 'insufficient_quota' or error.get('code') in ('credit_balance_exhausted', 'insufficient_quota'):
            # Retrying cannot help; stop every worker instead of hammering the API.
            raise SystemExit(f'[{name}] OpenAI credits are exhausted: add credits, then run generate again.')
        if 'size' in param or 'size' in message.lower():
            if size_i + 1 >= len(SIZES):
                break
            size_i += 1
        elif param == 'quality' and quality_i + 1 < len(QUALITIES):
            quality_i += 1
        elif 'reasoning' in (param + message) and effort_i + 1 < len(EFFORTS):
            effort_i += 1
        elif status in (429, 500, 502, 503, 504) and server_errors < 2:
            # A failed request may still be billed, so retry server errors at most twice.
            server_errors += 1
            time.sleep(30 * server_errors)
        else:
            break
    sys.exit(f'[{name}] generation failed')


def divider_positions(rgb, axis):
    """Centre of each magenta divider along one axis, or None if not found."""
    r, g, b = (rgb[..., i].astype(np.float32) for i in range(3))
    magenta = np.clip((np.minimum(r, b) - g) / 255.0, 0, 1)
    profile = magenta.mean(axis=axis)
    n = len(profile)
    found = []
    for third in (1, 2):
        lo, hi = int(n * (third / 3 - .07)), int(n * (third / 3 + .07))
        window = profile[lo:hi]
        peak = int(window.argmax())
        if window[peak] < .35:
            return None
        band = np.where(window > window[peak] * .5)[0]
        found.append((lo + band.min(), lo + band.max()))
    return found


def cells(img):
    rgb = np.asarray(img.convert('RGB'))
    h, w = rgb.shape[:2]
    cols, rows = divider_positions(rgb, 0), divider_positions(rgb, 1)

    def spans(found, n):
        if not found:
            edges = [0, n / 3, 2 * n / 3, n]
            return [(edges[i], edges[i + 1]) for i in range(3)]
        (a0, a1), (b0, b1) = found
        return [(0, a0), (a1 + 1, b0), (b1 + 1, n)]

    return [(x0, y0, x1, y1) for (y0, y1) in spans(rows, h) for (x0, x1) in spans(cols, w)], bool(cols and rows)


def make_seamless(tile):
    """Blend the tile with its half-offset copy so opposite edges match."""
    a = np.asarray(tile, dtype=np.float32)
    n = a.shape[0]
    shifted = np.roll(np.roll(a, n // 2, 0), n // 2, 1)
    t = np.abs(np.linspace(-1, 1, n))
    edge = np.clip((t - .55) / .45, 0, 1)
    edge = edge * edge * (3 - 2 * edge)
    weight = np.maximum(edge[:, None], edge[None, :])[..., None]
    out = a * (1 - weight) + shifted * weight
    return Image.fromarray(np.clip(out + .5, 0, 255).astype(np.uint8))


def slice_sheet(spec_path, tile_size=1024):
    spec = json.loads(Path(spec_path).read_text())
    name = spec['sheet']
    raw = CACHE / f'{name}.png'
    source = raw if raw.exists() else SHEETS / f'{name}.webp'
    img = Image.open(source).convert('RGB')
    boxes, detected = cells(img)
    print(f'[{name}] dividers {"detected" if detected else "not found, using exact thirds"}')
    out = TILES / name
    out.mkdir(parents=True, exist_ok=True)
    for tile, (x0, y0, x1, y1) in zip(spec['tiles'], boxes):
        inset = .035 * min(x1 - x0, y1 - y0)
        side = min(x1 - x0, y1 - y0) - 2 * inset
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        crop = img.crop((round(cx - side / 2), round(cy - side / 2), round(cx + side / 2), round(cy + side / 2)))
        crop = crop.resize((tile_size, tile_size), Image.LANCZOS)
        if tile['tile']:
            crop = make_seamless(crop)
        crop.save(out / f'{tile["id"]}.webp', quality=92, method=6)
    print(f'[{name}] wrote {len(spec["tiles"])} tiles to {out.relative_to(ROOT)}')


def pack(atlas_path):
    atlas = json.loads(Path(atlas_path).read_text())
    ids = atlas['layers']
    cols = atlas.get('columns', 6)
    rows = -(-len(ids) // cols)
    lookup = {p.stem: p for p in TILES.glob('*/*.webp')}
    missing = [i for i in ids if i not in lookup]
    if missing:
        sys.exit(f'missing tiles: {missing}')
    tiles = [Image.open(lookup[i]).convert('RGB') for i in ids]
    for size in atlas['sizes']:
        sheet = Image.new('RGB', (cols * size, rows * size))
        for k, tile in enumerate(tiles):
            sheet.paste(tile.resize((size, size), Image.LANCZOS), ((k % cols) * size, (k // cols) * size))
        target = ROOT / f'{atlas["name"]}-{size}.webp'
        sheet.save(target, quality=atlas.get('quality', 88), method=6)
        print(f'wrote {target.relative_to(ROOT)} ({target.stat().st_size // 1024} KiB)')
    # Mean colour per layer (sRGB^1.48) for the shader's fallback table.
    means = [np.power(np.asarray(t.resize((64, 64)), np.float32) / 255, 1.48).reshape(-1, 3).mean(0) for t in tiles]
    rows = ['[' + ','.join(f'{v:.3f}' for v in m) + ']' for m in means]
    print(f'export const {atlas["name"].upper()}_FALLBACK = [\n  '
          + ',\n  '.join(', '.join(rows[i:i + cols]) for i in range(0, len(rows), cols)) + '\n];')


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('command', choices=['generate', 'slice', 'pack', 'all'])
    parser.add_argument('paths', nargs='+')
    parser.add_argument('--key-file')
    parser.add_argument('--force', action='store_true', help='regenerate even if a cached sheet exists')
    args = parser.parse_args()
    if args.command == 'pack':
        return pack(args.paths[0])
    specs = args.paths
    if args.command == 'all':
        atlas = json.loads(Path(args.paths[0]).read_text())
        specs = [str(ROOT / s) for s in atlas['sheets']]
    if args.command in ('generate', 'all'):
        key = api_key(args)
        # Four parallel 2880px requests drew 502s from the API; two at a time is reliable.
        with ThreadPoolExecutor(max_workers=2) as pool:
            list(pool.map(lambda s: generate(key, s, args.force), specs))
    if args.command in ('slice', 'all'):
        for spec in specs:
            slice_sheet(spec)
    if args.command == 'all':
        pack(args.paths[0])


if __name__ == '__main__':
    main()
