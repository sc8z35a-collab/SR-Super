# 潮岬の大聖堂（SR-Super）

80 m × 50 m の岩島に建つ高さ約 149 m の大聖堂を、スマートフォンの横画面で 6 階と屋上まで一人称で散策できる WebGL 3D シーンです。

元の公開ページ: https://tidal-cathedral-3d.dnnsc097.chatgpt.site

## 動かし方

ビルド不要の静的サイトです（ES Modules を使うため、`file://` ではなく HTTP で配信してください）。

```bash
python3 -m http.server 8000
```

ブラウザで http://localhost:8000/ を開き、「全画面で開く」を押します。

## 新しい部屋とオブジェクト

| 場所 | 内容 |
| --- | --- |
| 1階 · 洗礼堂（左の翼廊） | 八角形の大理石の洗礼盤と天蓋（星空のフレスコ）、魚のモザイク、タイルの腰壁、シーグラスの水盤、燭台 |
| 1階 · 船乗りの礼拝堂（右の翼廊） | 架台の上の手漕ぎ舟、天井から吊るした奉納船、錨、漁網、海図と羅針盤の机、貝殻とロウソクの棚、ロープの束 |
| 2階 · 宝物庫（左の翼） | 王冠・聖杯・光条の聖体顕示台、宝石の聖遺物箱、鉄帯の宝箱（金貨入り）、行列用十字架、ビロードの絨毯 |
| 2階 · 写字室（右の翼） | 写本を広げた傾斜机と椅子、大型書見台、書架、顔料（ラピスラズリ）と金箔の作業台 |
| 屋上 · 庭園 | ハーブの花壇、わら製の蜂の巣箱、テラコッタの鉢、ランタン、ツタ |
| 島の外周 · 前庭 | 正面階段から続く石畳の小道、屋根付きの井戸、ランタン、ベンチ、鉢植え |

## テクスチャの生成

`.claude/skills/sunburst-textures/` のスキルで、GPT Image 2.5 Sunburst（`gpt-image-2.5-sunburst`、1:1・2880×2880・quality `xhigh`）の画像を 3×3 に分割し、1 枚から 9 種類のテクスチャを作ります。手順は `SKILL.md` を参照してください。API キーは環境変数 `OPENAI_API_KEY` で渡し、リポジトリには保存しません。

## 主なファイル

| ファイル | 内容 |
| --- | --- |
| `index.html` / `style.css` | 入口画面・HUD・設定ダイアログ |
| `main.js` | 起動処理、入力（移動パッド・視点ドラッグ）、テクスチャ読み込み |
| `renderer.js` / `shaders.js` | WebGL レンダラーと GLSL シェーダー |
| `cathedral.js` / `ornament.js` / `furnishings.js` | 大聖堂本体・装飾・調度品のメッシュ生成 |
| `terrain.js` / `layout.js` / `walkways.js` | 岩島の地形、建物配置、歩行経路と階の移動 |
| `character.js` / `mesh.js` / `surfaces.js` | 人物、メッシュ用ユーティリティ、表面素材の定義 |
| `chapels.js` | 新しい部屋とオブジェクト（洗礼堂・船乗りの礼拝堂・宝物庫・写字室・屋上庭園・前庭） |
| `decor.js` / `decor-96.webp` / `decor-256.webp` | GPT Image 2.5 Sunburst で生成した 36 種類の素材アトラスと素材 ID |
| `textures/` | 生成に使ったシート定義（`specs/`）、生成画像（`sheets/`）、アトラス構成（`decor-atlas.json`） |
| `.claude/skills/sunburst-textures/` | テクスチャ生成スキル（生成 → 3×3 分割 → シームレス化 → アトラス化） |
| `*.webp` | 素材アトラス（低解像度・高解像度）、ステンドグラス、祭壇画、カバー画像 |
| `manifest.webmanifest` / `sw.js` / `icon-*.png` | PWA 設定とオフライン用 Service Worker |
