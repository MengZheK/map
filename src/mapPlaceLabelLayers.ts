import type { FilterSpecification, LayerSpecification } from "maplibre-gl";

export const OPENFREEMAP_GLYPHS = "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf";

const TEXT_FONT = ["Noto Sans Regular"] as const;

/** 优先中文地名，不含道路编号（不加载 transportation_name） */
const PLACE_NAME = [
  "coalesce",
  ["get", "name:zh"],
  ["get", "name:nonlatin"],
  ["get", "name:latin"],
  ["get", "name"],
] as const;

const LABEL_PAINT: LayerSpecification["paint"] = {
  "text-color": "#5c6570",
  "text-halo-color": "rgba(255, 255, 255, 0.92)",
  "text-halo-width": 1.4,
};

function textSize(stops: [number, number][]): LayerSpecification["layout"] {
  const flat: (number | string)[] = ["interpolate", ["linear"], ["zoom"]];
  for (const [z, s] of stops) flat.push(z, s);
  return {
    "text-field": PLACE_NAME,
    "text-font": TEXT_FONT,
    "text-size": flat as never,
    "text-max-width": 8,
    "text-padding": 2,
  };
}

type PlaceSpec = {
  id: string;
  filter: FilterSpecification;
  minzoom: number;
  size: [number, number][];
};

const PLACES: PlaceSpec[] = [
  { id: "country", filter: ["==", ["get", "class"], "country"], minzoom: 1, size: [[2, 11], [6, 17]] },
  { id: "state", filter: ["==", ["get", "class"], "state"], minzoom: 3, size: [[3, 10], [8, 14]] },
  {
    id: "province",
    filter: ["==", ["get", "class"], "province"],
    minzoom: 3,
    size: [[3, 10], [8, 14]],
  },
  {
    id: "county",
    filter: ["==", ["get", "class"], "county"],
    minzoom: 5,
    size: [[5, 9], [10, 13]],
  },
  {
    id: "city",
    filter: ["all", ["==", ["get", "class"], "city"], ["<=", ["coalesce", ["get", "rank"], 99], 12]],
    minzoom: 4,
    size: [[4, 10], [10, 16]],
  },
  { id: "town", filter: ["==", ["get", "class"], "town"], minzoom: 6, size: [[6, 9], [12, 13]] },
  {
    id: "village",
    filter: ["in", ["get", "class"], ["literal", ["village", "hamlet"]]],
    minzoom: 8,
    size: [[8, 8], [14, 11]],
  },
  {
    id: "suburb",
    filter: ["in", ["get", "class"], ["literal", ["suburb", "quarter", "neighbourhood"]]],
    minzoom: 10,
    size: [[10, 8], [15, 10]],
  },
  {
    id: "isolated",
    filter: ["==", ["get", "class"], "isolated_dwelling"],
    minzoom: 12,
    size: [[12, 7], [15, 9]],
  },
];

const POI_EXCLUDE = [
  "motorway_junction",
  "speed_camera",
  "street_lamp",
  "bus_stop",
  "guidepost",
] as const;

/** 无天地图密钥时的 OSM 地名回退（不含 G/S 道路编号） */
export function buildPlaceLabelLayers(sourceId = "ofm"): LayerSpecification[] {
  const placeLayers = PLACES.map((spec) => ({
    id: `place-label-${spec.id}`,
    type: "symbol" as const,
    source: sourceId,
    "source-layer": "place",
    filter: spec.filter,
    minzoom: spec.minzoom,
    layout: textSize(spec.size),
    paint: LABEL_PAINT,
  }));

  const waterName: LayerSpecification = {
    id: "water-name",
    type: "symbol",
    source: sourceId,
    "source-layer": "water_name",
    filter: ["==", ["geometry-type"], "LineString"],
    minzoom: 9,
    layout: {
      ...textSize([
        [9, 9],
        [14, 12],
      ]),
      "symbol-placement": "line",
      "text-max-angle": 30,
    },
    paint: {
      ...LABEL_PAINT,
      "text-color": "#6a7580",
    },
  };

  const poiLabels: LayerSpecification = {
    id: "poi-label",
    type: "symbol",
    source: sourceId,
    "source-layer": "poi",
    filter: [
      "all",
      ["has", "name"],
      ["!", ["in", ["get", "class"], ["literal", [...POI_EXCLUDE]]]],
    ],
    minzoom: 11,
    layout: textSize([
      [11, 8],
      [15, 10],
    ]),
    paint: LABEL_PAINT,
  };

  return [...placeLayers, waterName, poiLabels];
}
