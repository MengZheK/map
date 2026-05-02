import type maplibregl from "maplibre-gl";
import type { Photo } from "./photoUtils";
import { hasGps } from "./photoUtils";

/** 屏幕像素半径：框选圆大小 */
export const BRUSH_RADIUS_PX = 40;

export function filterPhotosInPixelCircle(
  map: maplibregl.Map,
  photos: Photo[],
  centerScreen: { x: number; y: number },
  radiusPx: number,
): Photo[] {
  const r2 = radiusPx * radiusPx;
  return photos.filter((p) => {
    if (!hasGps(p)) return false;
    const pt = map.project([p.lon, p.lat]);
    const dx = pt.x - centerScreen.x;
    const dy = pt.y - centerScreen.y;
    return dx * dx + dy * dy <= r2;
  });
}
