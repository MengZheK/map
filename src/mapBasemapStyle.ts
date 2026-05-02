import type { StyleSpecification } from "maplibre-gl";

/**
 * 天地图球面墨卡托：矢量底图 vec_w + 矢量中文注记 cva_w
 * 密钥：项目根目录 .env.local 中 VITE_TIANDITU_TK（勿提交）
 * @see https://www.tianditu.gov.cn/
 */
const TIANDITU_SUBDOMAINS = [0, 1, 2, 3, 4, 5, 6, 7];

function tiandituDataServerTiles(layer: "vec_w" | "cva_w", tk: string): string[] {
  const key = encodeURIComponent(tk.trim());
  return TIANDITU_SUBDOMAINS.map(
    (i) => `https://t${i}.tianditu.gov.cn/DataServer?T=${layer}&x={x}&y={y}&l={z}&tk=${key}`,
  );
}

export function getRasterBasemapStyle(): StyleSpecification {
  const tk = typeof import.meta.env.VITE_TIANDITU_TK === "string" ? import.meta.env.VITE_TIANDITU_TK.trim() : "";

  if (tk) {
    return {
      version: 8,
      name: "天地图 矢量 + 注记 (Web 墨卡托)",
      sources: {
        "tdt-vec": {
          type: "raster",
          tiles: tiandituDataServerTiles("vec_w", tk),
          tileSize: 256,
          maxzoom: 18,
          attribution:
            '© <a href="https://www.tianditu.gov.cn/" target="_blank" rel="noreferrer">天地图</a> · 审图号以自然资源主管部门公示为准',
        },
        "tdt-cva": {
          type: "raster",
          tiles: tiandituDataServerTiles("cva_w", tk),
          tileSize: 256,
          maxzoom: 18,
        },
      },
      layers: [
        { id: "tdt-vec", type: "raster", source: "tdt-vec", minzoom: 0, maxzoom: 22 },
        { id: "tdt-cva", type: "raster", source: "tdt-cva", minzoom: 0, maxzoom: 22 },
      ],
    };
  }

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.warn(
      "[map] 未设置 VITE_TIANDITU_TK，底图回退为 OpenStreetMap。请在 .env.local 中配置天地图密钥以使用矢量+中文注记。",
    );
  }

  return {
    version: 8,
    name: "OSM (fallback, no Tianditu key)",
    sources: {
      osm: {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution: "© OpenStreetMap contributors",
        maxzoom: 19,
      },
    },
    layers: [{ id: "osm", type: "raster", source: "osm", minzoom: 0, maxzoom: 22 }],
  };
}
