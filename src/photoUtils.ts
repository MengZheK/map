import { provinceFullFromLatLon } from "./geoFromCoordinate";

export type Photo = {
  id: string;
  src: string;
  categoryId?: string | null;

  lon: number | null;
  lat: number | null;
  locationName: string | null;
  altitudeM: number | null;

  cameraMake: string | null;
  cameraModel: string | null;
  focalLengthMm: number | null;
  aperture: number | null;
  shutterTime: string | null; // full display string, e.g. "1/250s"
  iso: number | null;
  lensModel: string | null;
  /** 照片说明；无则大图参数里显示为 "-" */
  description?: string | null;
  /** 拍摄年份：地图点按年份分色；同一点多年份为同一色 */
  takenYear?: number | null;
  /** 拍摄日期 ISO：`YYYY-MM-DD`，详情「拍摄时间」优先；缺省时可用 takenYear 推算为当年 1 月 1 日 */
  takenAt?: string | null;
  /** 写入 photos.json 的日期 ISO：`YYYY-MM-DD`（maptool 合并时写入） */
  addedAt?: string | null;
};

/** 地图标记 5 色：前 4 对应年代槽位，末色为「多年份」 */
export const MAP_MARKER_COLORS = ["#2E86FF", "#10B981", "#F59E0B", "#8B5CF6", "#64748B"] as const;

export function collectTakenYears(photos: Photo[]): number[] {
  const s = new Set<number>();
  for (const p of photos) {
    const y = p.takenYear;
    if (typeof y === "number" && y >= 1900 && y <= 2100) s.add(y);
  }
  return [...s].sort((a, b) => a - b);
}

/** 全局出现年份升序，每年映射到 0..3 槽；第 5 年及以后与第 4 年共用槽位 3 */
export function buildYearToSlotMap(sortedDistinctYears: number[]): Map<number, number> {
  const m = new Map<number, number>();
  for (let i = 0; i < sortedDistinctYears.length; i++) {
    const y = sortedDistinctYears[i];
    m.set(y, i < 4 ? i : 3);
  }
  return m;
}

/** 单点：多年份 → 4；无年份 → 0；单一年份 → 按全局年份槽 */
export function markerColorIdxForPhotos(groupPhotos: Photo[], yearToSlot: Map<number, number>): number {
  const years = collectTakenYears(groupPhotos);
  if (years.length > 1) return 4;
  if (years.length === 0) return 0;
  const y = years[0];
  return yearToSlot.get(y) ?? 0;
}

function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** 解析拍摄日期：优先 takenAt(YYYY-MM-DD)，否则 takenYear 的 1 月 1 日 */
export function parsePhotoTakenDate(p: Photo): Date | null {
  const raw = typeof p.takenAt === "string" ? p.takenAt.trim() : "";
  if (raw) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
    if (m) {
      const y = Number(m[1]);
      const mo = Number(m[2]);
      const day = Number(m[3]);
      const dt = new Date(y, mo - 1, day);
      if (!Number.isNaN(dt.getTime())) return dt;
    }
  }
  const y = p.takenYear;
  if (typeof y === "number" && y >= 1900 && y <= 2100) {
    return new Date(y, 0, 1);
  }
  return null;
}

export function formatTakenDateChinese(d: Date): string {
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

/**
 * 相对当前日期：「N 年前 / N 个月前 / …」供详情展示
 */
/** 地名（无省字段时）到省级行政区，用于侧栏「省-市」合并与展示 */
const CITY_NAME_TO_PROVINCE: Record<string, string> = {
  北京: "北京市",
  上海: "上海市",
  天津: "天津市",
  重庆: "重庆市",
  深圳: "广东省",
  广州: "广东省",
  杭州: "浙江省",
  南京: "江苏省",
  成都: "四川省",
  西安: "陕西省",
  武汉: "湖北省",
  厦门: "福建省",
  青岛: "山东省",
  苏州: "江苏省",
  采尔马特: "瑞士",
  巴黎: "法国",
  伦敦: "英国",
};

const CITY_GROUP_SEP = "|";

export function resolveProvinceForCityName(city: string): string {
  const c = city.trim();
  if (!c) return "其他";
  if (CITY_NAME_TO_PROVINCE[c]) return CITY_NAME_TO_PROVINCE[c];
  if (c === "北京市" || c === "上海市" || c === "天津市" || c === "重庆市") return c;
  return "其他";
}

/** 侧栏/地图：同一市（同 display 域）唯一键 = 省|市名 */
export function getCityGroupKey(p: Photo): string {
  const city = (p.locationName ?? "").trim() || "未标注";
  const prov = resolveProvinceForCityName(city);
  return `${prov}${CITY_GROUP_SEP}${city}`;
}

export function splitCityGroupKey(key: string): { province: string; city: string } {
  const i = key.indexOf(CITY_GROUP_SEP);
  if (i < 0) return { province: "其他", city: key || "未标注" };
  return { province: key.slice(0, i), city: key.slice(i + 1) };
}

export function formatProvinceCityLabelFromParts(province: string, city: string): string {
  const muni = new Set(["北京市", "上海市", "天津市", "重庆市"]);
  if (muni.has(province)) return province;
  if (province === "其他") return city || "未标注";
  return `${province}-${city}`;
}

export function formatProvinceCityLabel(p: Photo): string {
  const { province, city } = splitCityGroupKey(getCityGroupKey(p));
  return formatProvinceCityLabelFromParts(province, city);
}

/** 卡片/标题展示：仅地名，不含省区划；去掉末尾「市」字（如 深圳市 → 深圳） */
export function formatShortPlaceName(p: Photo): string {
  const raw = (p.locationName ?? "").trim();
  if (!raw) return "未标注";
  return raw.replace(/市$/, "") || raw;
}

/** 省级全称 → 简称（深圳/云南/中国 等展示用） */
export function shortAdminRegionName(province: string): string {
  if (!province.trim()) return "其他";
  const muni: Record<string, string> = {
    北京市: "北京",
    上海市: "上海",
    天津市: "天津",
    重庆市: "重庆",
  };
  if (muni[province]) return muni[province];
  if (province.endsWith("省")) return province.slice(0, -1);
  if (province.includes("维吾尔自治区")) {
    const i = province.indexOf("维吾尔");
    return i > 0 ? province.slice(0, i) : province.replace(/维吾尔自治区$/, "");
  }
  if (province.endsWith("自治区")) {
    if (province.startsWith("广西")) return "广西";
    if (province.startsWith("内蒙古")) return "内蒙古";
    if (province.startsWith("西藏")) return "西藏";
    if (province.startsWith("宁夏")) return "宁夏";
    return province.replace(/自治区$/, "");
  }
  if (province.includes("特别行政区")) {
    return province.replace(/特别行政区$/, "");
  }
  return province;
}

function isChineseAdminRegionName(province: string): boolean {
  if (!province || province === "其他") return false;
  if (/(省|自治区|特别行政区)$/.test(province)) return true;
  return /^(北京|上海|天津|重庆)市$/.test(province);
}

function countryShortFromProvince(province: string): string {
  if (province === "其他") return "其他";
  if (isChineseAdminRegionName(province)) return "中国";
  return province;
}

/** 单张照片所属国家/地区简称（GPS 优先，否则由地名推断） */
export function countryLabelForPhoto(p: Photo): string {
  if (hasGps(p)) {
    const provFull = provinceFullFromLatLon(p.lat, p.lon);
    if (provFull) return "中国";
  }
  const prov = resolveProvinceForCityName((p.locationName ?? "").trim() || "未标注");
  return countryShortFromProvince(prov);
}

export function formatTakenRelativeChinese(taken: Date, now: Date = new Date()): string {
  const t0 = startOfLocalDay(taken);
  const n0 = startOfLocalDay(now);
  if (t0 > n0) return "—";
  const dayDiff = Math.round((n0 - t0) / 86400000);
  if (dayDiff === 0) return "今天";
  if (dayDiff === 1) return "昨天";
  if (dayDiff < 7) return `${dayDiff} 天前`;
  if (dayDiff < 30) {
    const w = Math.floor(dayDiff / 7);
    return w <= 1 ? "1 周前" : `${w} 周前`;
  }

  let years = now.getFullYear() - taken.getFullYear();
  if (now.getMonth() < taken.getMonth() || (now.getMonth() === taken.getMonth() && now.getDate() < taken.getDate())) {
    years--;
  }
  if (years >= 1) {
    return years === 1 ? "1 年前" : `${years} 年前`;
  }

  let months = (now.getFullYear() - taken.getFullYear()) * 12 + (now.getMonth() - taken.getMonth());
  if (now.getDate() < taken.getDate()) months--;
  if (months >= 1) return `${months} 个月前`;

  return "今年";
}

export function displayValue(v: unknown): string {
  if (v === null || v === undefined) return "-";
  if (typeof v === "string") return v.trim() ? v : "-";
  return String(v);
}

export function cameraDisplay(p: Photo): string {
  const make = p.cameraMake?.trim();
  const model = p.cameraModel?.trim();
  const parts = [make, model].filter(Boolean);
  return parts.length ? parts.join(" ") : "-";
}

export function hasGps(p: Photo): p is Photo & { lon: number; lat: number } {
  return typeof p.lon === "number" && typeof p.lat === "number";
}

// Grouping: 4 decimal digits on both lat/lon.
export function makeLocationKey(p: Photo): string | null {
  if (!hasGps(p)) return null;
  const latRounded = Number(p.lat.toFixed(4));
  const lonRounded = Number(p.lon.toFixed(4));
  return `${latRounded},${lonRounded}`;
}

export function locationKeyToLatLon(locationKey: string): { lat: number; lon: number } | null {
  const [latStr, lonStr] = locationKey.split(",");
  const lat = Number(latStr);
  const lon = Number(lonStr);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon };
}

export function decToDms(dec: number, hemiPos: string, hemiNeg: string) {
  const abs = Math.abs(dec);
  const deg = Math.floor(abs);
  const minFloat = (abs - deg) * 60;
  const min = Math.floor(minFloat);
  const secFloat = (minFloat - min) * 60;
  let sec = Math.round(secFloat);
  let min2 = min;
  let deg2 = deg;

  // handle rounding carry
  if (sec === 60) {
    sec = 0;
    min2 += 1;
  }
  if (min2 === 60) {
    min2 = 0;
    deg2 += 1;
  }

  const hemi = dec >= 0 ? hemiPos : hemiNeg;
  return `${deg2}°${min2}'${sec}${hemi}`;
}

export function formatFocalLengthMm(v: number | null): string {
  if (v === null || v === undefined) return "-";
  return `${v} mm`;
}

export function formatAperture(v: number | null): string {
  if (v === null || v === undefined) return "-";
  return `f/${v}`;
}

export function formatIso(v: number | null): string {
  if (v === null || v === undefined) return "-";
  return `ISO ${v}`;
}

