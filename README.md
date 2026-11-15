# 潮岬の大聖堂（SR-Super）

80 m × 50 m の岩島に建つ高さ約 149 m の大聖堂を、スマートフォンの横画面で 6 階と屋上まで一人称で散策できる WebGL 3D シーンです。

元の公開ページ: https://tidal-cathedral-3d.dnnsc097.chatgpt.site

## 動かし方

ビルド不要の静的サイトです（ES Modules を使うため、`file://` ではなく HTTP で配信してください）。

```bash
python3 -m http.server 8000
```

ブラウザで http://localhost:8000/ を開き、「全画面で開く」を押します。

## 主なファイル

| ファイル | 内容 |
| --- | --- |
| `index.html` / `style.css` | 入口画面・HUD・設定ダイアログ |
| `main.js` | 起動処理、入力（移動パッド・視点ドラッグ）、テクスチャ読み込み |
| `renderer.js` / `shaders.js` | WebGL レンダラーと GLSL シェーダー |
| `cathedral.js` / `ornament.js` / `furnishings.js` | 大聖堂本体・装飾・調度品のメッシュ生成 |
| `terrain.js` / `layout.js` / `walkways.js` | 岩島の地形、建物配置、歩行経路と階の移動 |
| `character.js` / `mesh.js` / `surfaces.js` | 人物、メッシュ用ユーティリティ、表面素材の定義 |
| `*.webp` | 素材アトラス（低解像度・高解像度）、ステンドグラス、祭壇画、カバー画像 |
| `manifest.webmanifest` / `sw.js` / `icon-*.png` | PWA 設定とオフライン用 Service Worker |
