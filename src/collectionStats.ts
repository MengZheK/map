import type { Photo } from "./photoUtils";
import {
  cameraDisplay,
  collectTakenYears,
  countryLabelForPhoto,
  getCityGroupKey,
} from "./photoUtils";

export type CollectionStats = {
  totalPhotos: number;
  countryCount: number;
  cityCount: number;
  yearSpan: string | null;
  activeCategoryCount: number;
  maxAltitudeM: number | null;
  mainGear: string[];
  catalogLastUpdated: Date | null;
};

/** COS 路径 mapphotos-YYYYMMDD → 入库批次日期 */
export function parseCatalogBatchDateFromSrc(src: string): Date | null {
  const m = /mapphotos-(\d{4})(\d{2})(\d{2})/i.exec(src);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const day = Number(m[3]);
  const dt = new Date(y, mo - 1, day);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function parseIsoDateOnly(raw: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw.trim());
  if (!m) return null;
  const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function considerLatest(current: Date | null, next: Date | null): Date | null {
  if (!next) return current;
  if (!current || next.getTime() > current.getTime()) return next;
  return current;
}

/** 最近写入相册：addedAt → COS 批次 → photos.json Last-Modified */
export function resolveCatalogLastUpdated(
  photos: Photo[],
  jsonFileUpdatedAt: Date | null,
): Date | null {
  let latest = jsonFileUpdatedAt;
  for (const p of photos) {
    if (typeof p.addedAt === "string" && p.addedAt.trim()) {
      latest = considerLatest(latest, parseIsoDateOnly(p.addedAt));
    }
    latest = considerLatest(latest, parseCatalogBatchDateFromSrc(p.src));
  }
  return latest;
}

/** 看板展示：去掉重复的 Apple 前缀以节省宽度 */
export function formatGearDisplayLabel(label: string): string {
  return label.replace(/^Apple\s+/i, "").trim() || label;
}

function resolveTopGear(photos: Photo[], limit = 2): string[] {
  const counts = new Map<string, number>();
  for (const p of photos) {
    const label = cameraDisplay(p);
    if (label === "-") continue;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label]) => label);
}

export function formatCatalogDateCompact(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

export function computeCollectionStats(
  photos: Photo[],
  jsonFileUpdatedAt: Date | null = null,
): CollectionStats {
  const countries = new Set<string>();
  const cities = new Set<string>();
  const categoryIds = new Set<string>();
  let maxAltitudeM: number | null = null;

  for (const p of photos) {
    const country = countryLabelForPhoto(p);
    if (country && country !== "其他") countries.add(country);
    cities.add(getCityGroupKey(p));
    const cid = p.categoryId?.trim();
    if (cid) categoryIds.add(cid);
    const alt = p.altitudeM;
    if (typeof alt === "number" && Number.isFinite(alt)) {
      if (maxAltitudeM === null || alt > maxAltitudeM) maxAltitudeM = alt;
    }
  }

  const years = collectTakenYears(photos);
  let yearSpan: string | null = null;
  if (years.length === 1) yearSpan = String(years[0]);
  else if (years.length > 1) yearSpan = `${years[0]}–${years[years.length - 1]}`;

  return {
    totalPhotos: photos.length,
    countryCount: countries.size,
    cityCount: cities.size,
    yearSpan,
    activeCategoryCount: categoryIds.size,
    maxAltitudeM,
    mainGear: resolveTopGear(photos),
    catalogLastUpdated: resolveCatalogLastUpdated(photos, jsonFileUpdatedAt),
  };
}

export type CollectionStatItem = {
  key: string;
  label: string;
  value: string;
  lines?: string[];
  hint?: string;
  nowrap?: boolean;
};

export function collectionStatItems(
  stats: CollectionStats,
  loading: boolean,
): CollectionStatItem[] {
  const dash = loading ? "…" : "—";
  const n = (v: number) => (loading ? dash : v.toLocaleString("zh-CN"));

  const altValue =
    stats.maxAltitudeM == null
      ? dash
      : Math.round(stats.maxAltitudeM).toLocaleString("zh-CN");

  const gearLines =
    stats.mainGear.length > 0 ? stats.mainGear.map(formatGearDisplayLabel) : null;

  const updatedValue =
    stats.catalogLastUpdated == null ? dash : formatCatalogDateCompact(stats.catalogLastUpdated);

  return [
    { key: "total", label: "照片总量", value: n(stats.totalPhotos), hint: "张" },
    { key: "countries", label: "国家/地区", value: n(stats.countryCount), hint: "个" },
    { key: "cities", label: "城市/地点", value: n(stats.cityCount), hint: "个" },
    {
      key: "years",
      label: "拍摄跨度",
      value: loading ? dash : (stats.yearSpan ?? dash),
      nowrap: true,
    },
    {
      key: "categories",
      label: "活跃栏目",
      value: n(stats.activeCategoryCount),
      hint: "个",
    },
    { key: "altitude", label: "最高海拔", value: loading ? dash : altValue, hint: "米" },
    {
      key: "gear",
      label: "主力器材",
      value: loading ? dash : gearLines ? gearLines[0] : dash,
      lines: loading || !gearLines ? undefined : gearLines,
    },
    {
      key: "updated",
      label: "最近更新时间",
      value: loading ? dash : updatedValue,
      nowrap: true,
    },
  ];
}
