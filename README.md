# Kang Map Album Preview

This folder contains a minimal local preview project that implements:

- `/album`: waterfall-style photo gallery (no map jump on click; opens big image modal)
- `/map`: MapLibre-based map + left floating panel (category -> places -> photos) with click flow
- Click flow:
  - Click a map location -> left panel shows photos for that location (no big modal automatically)
  - Click a thumbnail in the left panel -> opens the big image modal (with parameter tabs)

## Run locally (Windows)

1. Install dependencies:
   - `npm install`
2. Start dev server:
   - `npm run dev`

Open the URL printed by the dev server (usually `http://localhost:5173`).

## Map tiles (why the map might be blank)

The map **style** is loaded from this repo (`public/map-style-osm.json`), but **tiles still download from the internet** (OpenStreetMap). If you are offline or your network blocks tile hosts, the canvas may stay blank.

- Check the browser **Console / Network** tab for failed `tile.openstreetmap.org` requests.
- Fully offline maps require hosting your own tiles (MBTiles + tile server) or another raster source — see MapLibre docs if you need that.

## Image formats

Browsers display whatever they can decode in `<img>`. These usually work well from `public/photos/`: **JPEG, PNG, WebP, GIF, SVG**.

- **HEIC/HEIF** (common on iPhones): many desktop browsers **do not** decode it in `<img>`. Convert to JPEG/WebP for the preview, or use Safari where supported.
- **TIFF**: generally **not** supported as a plain image URL; convert to JPEG/PNG/WebP.

Put converted files under `public/photos/` and point `src` in `photos.json` at `/photos/yourfile.webp` (etc.).

## Data & 桌面工具

- 维护相册、合并写入 `public/photos/photos.json`：用仓库根目录的 **`Start-Maptool.bat`** 启动 **maptool**（详见 **`docs/相册站点维护说明.md`**）。
- 若需 **Git 提交与 GitHub 发布** 的流程说明，也在同一份文档中。

## Data (manual)

You can also edit `public/photos/photos.json` by hand to add your own photos.
