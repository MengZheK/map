import type { PhotoEntry } from "./photoTypes";
import { suggestLocationLabel } from "./geoGuess";

/**
 * 有经纬度且地点名为空时，用全国地级中心库做最近邻匹配填入 locationName（不写省级汇总名）。
 * 若 EXIF 已有地点文字则保留，不覆盖。
 */
export function enrichPartialWithPlaceFromCoords(p: Partial<PhotoEntry>): Partial<PhotoEntry> {
  const lat = p.lat;
  const lon = p.lon;
  if (lat == null || lon == null || !Number.isFinite(lat) || !Number.isFinite(lon)) return p;
  if (p.locationName != null && String(p.locationName).trim() !== "") return p;
  const label = suggestLocationLabel(lat, lon);
  if (!label) return p;
  return { ...p, locationName: label };
}
