import type { StyleSpecification } from "maplibre-gl";
import type { RasterLayerSpecification, RasterSourceSpecification } from "maplibre-gl";
import { buildPlaceLabelLayers, OPENFREEMAP_GLYPHS } from "./mapPlaceLabelLayers";
import { buildWaterVectorLayers, OPENFREEMAP_PLANET_URL } from "./mapWhiteRoadLayers";

/**
 * 天地图球面墨卡托底图
 * 密钥：.env.local 中 VITE_TIANDITU_TK
 * 主题：VITE_MAP_BASEMAP_THEME=light（浅色银灰，默认）| classic（官方彩色矢量）
 * @see https://www.tianditu.gov.cn/
 */
const TIANDITU_SUBDOMAINS = [0, 1, 2, 3, 4, 5, 6, 7];

type TiandituLayer = "vec_w" | "cva_w" | "ter_w";

export type MapBasemapTheme = "light" | "classic";

function getBasemapTheme(): MapBasemapTheme {
  const raw = typeof import.meta.env.VITE_MAP_BASEMAP_THEME === "string"
    ? import.meta.env.VITE_MAP_BASEMAP_THEME.trim().toLowerCase()
    : "light";
  return raw === "classic" ? "classic" : "light";
}

function tiandituDataServerTiles(layer: TiandituLayer, tk: string): string[] {
  const key = encodeURIComponent(tk.trim());
  return TIANDITU_SUBDOMAINS.map(
    (i) => `https://t${i}.tianditu.gov.cn/DataServer?T=${layer}&x={x}&y={y}&l={z}&tk=${key}`,
  );
}

function tdtSource(layer: TiandituLayer, tk: string): RasterSourceSpecification {
  return {
    type: "raster",
    tiles: tiandituDataServerTiles(layer, tk),
    tileSize: 256,
    maxzoom: 18,
  };
}

/** 浅色底图：银灰陆地，略弱化瓦片内道路对比 */
const LIGHT_VEC_PAINT: RasterLayerSpecification["paint"] = {
  "raster-saturation": -0.9,
  "raster-brightness-min": 0.4,
  "raster-brightness-max": 0.94,
  "raster-contrast": 0.08,
};

/** 浅色注记：强去饱和，使 G7/S22 等彩色路牌趋近灰字 */
const LIGHT_LABEL_PAINT: RasterLayerSpecification["paint"] = {
  "raster-saturation": -1,
  "raster-brightness-min": 0.34,
  "raster-brightness-max": 0.92,
  "raster-contrast": 0.05,
};

function buildTiandituStyle(tk: string, theme: MapBasemapTheme): StyleSpecification {
  const attribution =
    '© <a href="https://www.tianditu.gov.cn/" target="_blank" rel="noreferrer">天地图</a> · ' +
    '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> · ' +
    '<a href="https://openfreemap.org/" target="_blank" rel="noreferrer">OpenFreeMap</a> · 审图号以自然资源主管部门公示为准';

  if (theme === "classic") {
    return {
      version: 8,
      name: "天地图 矢量 + 注记 (classic)",
      sources: {
        "tdt-vec": { ...tdtSource("vec_w", tk), attribution },
        "tdt-cva": tdtSource("cva_w", tk),
      },
      layers: [
        { id: "tdt-vec", type: "raster", source: "tdt-vec", minzoom: 0, maxzoom: 22 },
        { id: "tdt-cva", type: "raster", source: "tdt-cva", minzoom: 0, maxzoom: 22 },
      ],
    };
  }

  return {
    version: 8,
    name: "天地图 浅色 (light)",
    sources: {
      "tdt-ter": tdtSource("ter_w", tk),
      "tdt-vec": { ...tdtSource("vec_w", tk), attribution },
      "tdt-cva": tdtSource("cva_w", tk),
      ofm: {
        type: "vector",
        url: OPENFREEMAP_PLANET_URL,
        maxzoom: 14,
      },
    },
    layers: [
      {
        id: "tdt-ter",
        type: "raster",
        source: "tdt-ter",
        minzoom: 0,
        maxzoom: 22,
        paint: {
          "raster-opacity": 0.15,
          "raster-saturation": -0.9,
          "raster-brightness-min": 0.36,
          "raster-brightness-max": 0.9,
        },
      },
      {
        id: "tdt-vec",
        type: "raster",
        source: "tdt-vec",
        minzoom: 0,
        maxzoom: 22,
        paint: {
          ...LIGHT_VEC_PAINT,
          "raster-opacity": 1,
        },
      },
      ...buildWaterVectorLayers("ofm"),
      {
        id: "tdt-cva",
        type: "raster",
        source: "tdt-cva",
        minzoom: 0,
        maxzoom: 22,
        paint: LIGHT_LABEL_PAINT,
      },
    ],
  };
}

const LIGHT_OSM_PAINT: RasterLayerSpecification["paint"] = {
  "raster-saturation": -0.92,
  "raster-brightness-min": 0.34,
  "raster-brightness-max": 0.92,
  "raster-contrast": 0.06,
};

export function getRasterBasemapStyle(): StyleSpecification {
  const tk = typeof import.meta.env.VITE_TIANDITU_TK === "string" ? import.meta.env.VITE_TIANDITU_TK.trim() : "";
  const theme = getBasemapTheme();

  if (tk) {
    return buildTiandituStyle(tk, theme);
  }

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.warn(
      "[map] 未设置 VITE_TIANDITU_TK，底图回退为 OpenStreetMap。请在 .env.local 中配置天地图密钥。",
    );
  }

  const useLightOsm = theme === "light";

  if (useLightOsm) {
    return {
      version: 8,
      name: "OSM (fallback, light)",
      sources: {
        osm: {
          type: "raster",
          tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
          tileSize: 256,
          attribution: "© OpenStreetMap contributors",
          maxzoom: 19,
        },
        ofm: {
          type: "vector",
          url: OPENFREEMAP_PLANET_URL,
          maxzoom: 14,
        },
      },
      glyphs: OPENFREEMAP_GLYPHS,
      layers: [
        {
          id: "osm",
          type: "raster",
          source: "osm",
          minzoom: 0,
          maxzoom: 22,
          paint: LIGHT_OSM_PAINT,
        },
        ...buildWaterVectorLayers("ofm"),
        ...buildPlaceLabelLayers("ofm"),
      ],
    };
  }

  return {
    version: 8,
    name: "OSM (fallback)",
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
