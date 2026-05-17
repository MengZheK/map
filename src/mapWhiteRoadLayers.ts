import type { LayerSpecification } from "maplibre-gl";

/** OpenFreeMap 矢量瓦片（OSM），用于浅色底图上的水域 */
export const OPENFREEMAP_PLANET_URL = "https://tiles.openfreemap.org/planet";

/** 水域：淡灰蓝，略深于陆地 */
const WATER_FILL = "#b6c0ca";
const WATERWAY_LINE = "#a8b4c0";

/** 加深水域（面状水体 + 河流线） */
export function buildWaterVectorLayers(sourceId = "ofm"): LayerSpecification[] {
  return [
    {
      id: "water-fill",
      type: "fill",
      source: sourceId,
      "source-layer": "water",
      minzoom: 0,
      paint: {
        "fill-color": WATER_FILL,
        "fill-opacity": 0.94,
      },
    },
    {
      id: "waterway-line",
      type: "line",
      source: sourceId,
      "source-layer": "waterway",
      minzoom: 6,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": WATERWAY_LINE,
        "line-width": ["interpolate", ["linear"], ["zoom"], 6, 0.4, 10, 1.2, 14, 2.5],
      },
    },
  ];
}
