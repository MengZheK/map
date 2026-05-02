import { CHINA_PREFECTURE_CENTERS } from "./chinaPrefectureCentersData";

type Box = { minLat: number; maxLat: number; minLon: number; maxLon: number };

function inBox(lat: number, lon: number, b: Box): boolean {
  return lat >= b.minLat && lat <= b.maxLat && lon >= b.minLon && lon <= b.maxLon;
}

/**
 * 中国境内粗范围（WGS84 与 GCJ-02 混用做区域判断，仅作开关，不画省界）。
 */
function inRoughMainlandOrHainanTW(lat: number, lon: number): boolean {
  if (lat >= 18 && lat <= 54 && lon >= 73 && lon <= 135) return true;
  return false;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toR = (d: number) => (d * Math.PI) / 180;
  const dLat = toR(lat2 - lat1);
  const dLon = toR(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * 国外 / 特殊景点：小框优先（与旧版一致，避免被「最近地级中心」吸走）。
 */
const OVERSEAS_CITY_BOXES: { box: Box; shortName: string }[] = [
  { box: { minLat: 45.9, maxLat: 46.1, minLon: 7.65, maxLon: 7.95 }, shortName: "采尔马特" },
  { box: { minLat: 48.75, maxLat: 48.95, minLon: 2.15, maxLon: 2.55 }, shortName: "巴黎" },
  { box: { minLat: 51.35, maxLat: 51.6, minLon: -0.35, maxLon: 0.15 }, shortName: "伦敦" },
];

function overseasShortFromLatLon(lat: number, lon: number): string | null {
  for (const { box, shortName } of OVERSEAS_CITY_BOXES) {
    if (inBox(lat, lon, box)) return shortName;
  }
  return null;
}

/**
 * 在中国粗范围内时，用「距地级政府驻地 center 最近」推断地名（DataV 坐标与 WGS84 相机坐标混算，
 * 地级市相距较远，一般足够区分边界）。
 */
function nearestChinesePrefectureName(lat: number, lon: number): string | null {
  let best: string | null = null;
  let bestKm = Number.POSITIVE_INFINITY;
  for (const c of CHINA_PREFECTURE_CENTERS) {
    const km = haversineKm(lat, lon, c.lat, c.lon);
    if (km < bestKm) {
      bestKm = km;
      best = c.name;
    }
  }
  /** 过远则视为境外/海洋/无效 GPS，不自动填 */
  const MAX_KM = 520;
  if (best == null || bestKm > MAX_KM) return null;
  return best;
}

/**
 * 有经纬度时自动填「地级市」简称（来自全国地级中心库），不填省级汇总名。
 * 中国境外：仅保留少量国外景点框；其余不填。
 */
export function suggestLocationLabel(lat: number, lon: number): string | null {
  const abroad = overseasShortFromLatLon(lat, lon);
  if (abroad) return abroad;

  if (inRoughMainlandOrHainanTW(lat, lon)) {
    return nearestChinesePrefectureName(lat, lon);
  }

  return null;
}
