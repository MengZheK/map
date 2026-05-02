import type { PhotoEntry } from "./photoTypes";

/** 除经纬度外，带小数的清单数字字段统一保留两位小数 */
const ROUND_KEYS: (keyof PhotoEntry)[] = [
  "altitudeM",
  "focalLengthMm",
  "aperture",
  "iso",
  "shutterSec",
];

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function roundPhotoNumericFields<T extends Partial<PhotoEntry>>(p: T): T {
  const out = { ...p } as T;
  for (const k of ROUND_KEYS) {
    const v = out[k];
    if (typeof v === "number" && Number.isFinite(v)) {
      (out as Record<string, unknown>)[k as string] = round2(v);
    }
  }
  return out;
}
