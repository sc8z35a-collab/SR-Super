---
name: sunburst-textures
description: Generate game textures for 潮岬の大聖堂 with OpenAI GPT Image 2.5 Sunburst (gpt-image-2.5-sunburst) at 1:1, maximum resolution and quality "xhigh". Each image is a 3x3 sheet, so one API call yields 9 textures; the script slices them, makes them seamless and packs them into the game's texture-array atlases (decor-96.webp / decor-256.webp). Use when the user asks to generate, add or replace textures/materials for this game, or mentions GPT Image / Sunburst / テクスチャ生成.
---

# Sunburst テクスチャ生成スキル

GPT Image 2.5 Sunburst で **1:1・最高画質（quality `xhigh`、reasoning effort `xhigh`）** の画像を生成し、
1 枚を 3×3 に分割して **1 枚あたり 9 枚のテクスチャ** を作ります。生成したテクスチャはゲームの
`decor` アトラス（`decor-96.webp` / `decor-256.webp`）にまとめられ、シェーダーから使われます。

## 前提

- API キーは環境変数 `OPENAI_API_KEY`（または `--key-file <path>`）で渡す。**キーをリポジトリ・コミット・チャットに書かない。**
  `.gitignore` は `*.key` と `.env*` を除外済み。
- Python 3 + `requests` / `Pillow` / `numpy`。
- 実行場所はリポジトリのルート。

## 仕様（API で確認済みの値）

| 項目 | 値 |
| --- | --- |
| モデル | `gpt-image-2.5-sunburst` |
| サイズ | `2880x2880`（1:1 で通る最大。4096 は長辺 3840px 超、3840・3072 は画素数上限で拒否された。拒否されたら 2560 → 2048 … と自動で下げる） |
| 画質 | `quality: "xhigh"`、`reasoning: {"effort": "xhigh"}`（拒否されたら `high` に自動で下げてログに残す） |
| 形式 | PNG（生データは `textures/.cache/`、保存用は `textures/sheets/*.webp`） |
| 1 回の生成 | 3×3 = 9 テクスチャ。区切りはマゼンタ (#FF00FF) の線で、分割時に自動検出 |
| 失敗時 | 残高切れ（`credit_balance_exhausted`）なら即停止。5xx は 2 回まで再試行（失敗した要求も課金されうる）。同時実行は 2 枚 |

## 手順

1. **シート定義を書く** — `textures/specs/<sheet>.json`

   ```json
   {
     "sheet": "decor-e-example",
     "theme": "シート全体の雰囲気（英語）",
     "tiles": [
       {"id": "snake_case_id", "tile": true,  "prompt": "素材の説明（英語）"},
       {"id": "picture_id",    "tile": false, "prompt": "一枚絵（地図・写本など）の説明"}
     ]
   }
   ```

   - 9 個ちょうど。`tile: true` は継ぎ目なしの素材（分割後にシームレス化）、`false` は 1 枚の絵（UV で枠いっぱいに貼る）。
   - 同じシートに明るさ・質感の近いものを集めると照明がそろう。

2. **生成**（4 枚まで並列）

   ```bash
   OPENAI_API_KEY=... python3 .claude/skills/sunburst-textures/scripts/sunburst.py generate textures/specs/decor-e-example.json
   ```

   キャッシュ済みのシートは再生成しない。作り直すときは `--force`。結果は `textures/sheets/<sheet>.json` に
   実際に使われたサイズ・画質・所要時間・トークン数と共に記録される。

3. **分割・シームレス化**

   ```bash
   python3 .claude/skills/sunburst-textures/scripts/sunburst.py slice textures/specs/*.json
   ```

   `textures/tiles/<sheet>/<id>.webp`（1024px）ができる。生成画像を必ず目で確認する（区切り線のずれ、文字の混入など）。

4. **アトラスに登録してパック** — `textures/decor-atlas.json` の `layers` に id を追加（6 列、順番がそのまま層番号）。

   ```bash
   python3 .claude/skills/sunburst-textures/scripts/sunburst.py pack textures/decor-atlas.json
   ```

   `decor-96.webp`（軽量用）と `decor-256.webp`（高品質用）が書き出され、最後に `DECOR_FALLBACK` 配列が表示される。
   地形は `textures/terrain-atlas.json`（`terrain-128.webp` / `terrain-320.webp`、層の名前は `landcover.js`）、
   大聖堂の壁・床・天井・屋根は `textures/fabric-atlas.json`（`fabric-128.webp` / `fabric-256.webp`、`fabric.js`）で同じようにパックする。

5. **ゲームに組み込む**
   - `decor.js`: `NAMES` に名前を追加（アトラスと同じ順）、`DECOR_SHADING` に `[1m あたりの繰り返し数（0 = 一枚絵、負 = メッシュ UV をメートルとして使う）, 粗さ, 明るさ]`、`DECOR_FALLBACK` に pack の出力を貼る。
   - メッシュでは `DECOR.<名前>` を素材 ID として使う（ID は 105 から。頂点の素材は 1 バイトなので 255 まで）。
   - `layers` が 36 を超えたら `main.js` の `layerGroups` は自動で追従する（`DECOR_LAYERS`）。行数が増えるので画像サイズにも注意。
   - `sw.js` のキャッシュ名を上げる。

6. **確認** — `python3 -m http.server` で起動し、横画面・全画面で該当の部屋を見る。品質「最軽量」でも崩れないか確認。

## 外部で作ったシートを使う

API を使わずに用意した 3×3 のシート（ChatGPT などで作った画像）も同じ手順で使える。

1. 並び順がシート定義（`textures/specs/<sheet>.json`）の `tiles` と同じことを目で確認する。
2. `textures/sheets/<sheet>.webp` として保存する（`textures/.cache/<sheet>.png` があればそちらが優先される）。
3. `slice` → `pack` を実行する。マゼンタの区切り線が無い場合は 3 等分の位置で切り、各マスの内側 3.5% を捨てるので、細い区切り線は自動で落ちる。
4. 出どころを `textures/sheets/<sheet>.json` に記録しておく。

## 一括実行

```bash
OPENAI_API_KEY=... python3 .claude/skills/sunburst-textures/scripts/sunburst.py all textures/decor-atlas.json
```

`decor-atlas.json` の `sheets` を全部 生成 → 分割 → パック する（キャッシュがあるシートは API を呼ばない）。
