import type maplibregl from "maplibre-gl";
import type { Photo } from "./photoUtils";
import { hasGps } from "./photoUtils";

const EARTH_R_M = 6371008.8;

export function haversineMeters(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const φ1 = (a.lat * Math.PI) / 180;
  const φ2 = (b.lat * Math.PI) / 180;
  const Δφ = ((b.lat - a.lat) * Math.PI) / 180;
  const Δλ = ((b.lon - a.lon) * Math.PI) / 180;
  const s =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return 2 * EARTH_R_M * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** 当前缩放下，屏幕上 radiusPx 横向距离对应的地面弧长约（米） */
export function pixelRadiusToMeters(
  map: maplibregl.Map,
  centerScreen: { x: number; y: number },
  radiusPx: number,
): number {
  const c = map.unproject([centerScreen.x, centerScreen.y]);
  const r = map.unproject([centerScreen.x + radiusPx, centerScreen.y]);
  return haversineMeters({ lat: c.lat, lon: c.lng }, { lat: r.lat, lon: r.lng });
}

export function filterPhotosInGeoCircle(
  photos: Photo[],
  center: { lon: number; lat: number },
  radiusMeters: number,
): Photo[] {
  const r = radiusMeters;
  return photos.filter((p) => {
    if (!hasGps(p)) return false;
    return haversineMeters({ lat: p.lat, lon: p.lon }, { lat: center.lat, lon: center.lon }) <= r;
  });
}

/** 近似圆（经纬度多边形），用于地图上铆钉圈随缩放变化 */
export function circlePolygonGeoJSON(
  centerLng: number,
  centerLat: number,
  radiusMeters: number,
  steps = 64,
): GeoJSON.Feature<GeoJSON.Polygon> {
  const coords: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const bearing = (i / steps) * 2 * Math.PI;
    const lat1 = (centerLat * Math.PI) / 180;
    const lng1 = (centerLng * Math.PI) / 180;
    const angular = radiusMeters / EARTH_R_M;
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(angular) + Math.cos(lat1) * Math.sin(angular) * Math.cos(bearing),
    );
    const lng2 =
      lng1 +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angular) * Math.cos(lat1),
        Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2),
      );
    coords.push([(lng2 * 180) / Math.PI, (lat2 * 180) / Math.PI]);
  }
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [coords],
    },
  };
}
