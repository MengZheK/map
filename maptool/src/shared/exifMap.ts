import type { PhotoEntry } from "./photoTypes";
import { roundPhotoNumericFields } from "./roundPhotoNumerics";

type ExifrOut = Record<string, unknown>;

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}

/** 将曝光时间格式化为与站点类似的字符串，如 1/250s */
export function formatShutterDisplay(sec: number | null): string | null {
  if (sec == null || !Number.isFinite(sec) || sec <= 0) return null;
  if (sec >= 1) return `${Math.round(sec * 10) / 10}s`;
  const inv = Math.round(1 / sec);
  return `1/${inv}s`;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function formatDateYmd(d: Date): { takenAt: string; takenYear: number } | null {
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return { takenAt: `${y}-${m}-${day}`, takenYear: y };
}

/**
 * 从 EXIF 日期串或 ISO 串解析 YYYY-MM-DD / 年份（与其它看图软件常见字段对齐）。
 */
function parseDateString(s: string): { takenAt: string; takenYear: number } | null {
  const t = s.trim();
  if (!t) return null;
  const m = /^(\d{4})[:/-](\d{2})[:/-](\d{2})/.exec(t);
  if (m) {
    const y = parseInt(m[1], 10);
    return { takenAt: `${m[1]}-${m[2]}-${m[3]}`, takenYear: y };
  }
  const d = new Date(t);
  return formatDateYmd(d);
}

const DATE_KEYS = [
  "DateTimeOriginal",
  "CreateDate",
  "DateTime",
  "ModifyDate",
  "MetadataDate",
  "DateCreated",
  "DateTimeDigitized",
  "SubSecDateTimeOriginal",
  "SubSecCreateDate",
  "MediaCreateDate",
  "MediaModifyDate",
  "TrackCreateDate",
  "TrackModifyDate",
  "CreationDate",
  "DigitizationDate",
  "ProfileDateTime",
] as const;

function parseTakenFromRaw(
  raw: ExifrOut,
  depth = 0,
): { takenAt: string | null; takenYear: number | null } {
  if (depth > 2) return { takenAt: null, takenYear: null };

  for (const k of DATE_KEYS) {
    const v = raw[k as string];
    if (v instanceof Date) {
      const r = formatDateYmd(v);
      if (r) return { takenAt: r.takenAt, takenYear: r.takenYear };
    }
    if (typeof v === "string" && v.trim()) {
      const r = parseDateString(v);
      if (r) return { takenAt: r.takenAt, takenYear: r.takenYear };
    }
  }

  const exif = raw.exif;
  if (exif && typeof exif === "object") {
    const sub = parseTakenFromRaw(exif as ExifrOut, depth + 1);
    if (sub.takenAt) return sub;
  }

  return { takenAt: null, takenYear: null };
}

/**
 * 从 exifr 解析结果填充 Photo 字段（不含 id/src/categoryId）
 */
export function exifToPartialPhoto(raw: ExifrOut): Partial<PhotoEntry> {
  const lat = num(raw.latitude ?? raw.GPSLatitude);
  const lon = num(raw.longitude ?? raw.GPSLongitude);
  const alt = num(raw.altitude ?? raw.GPSAltitude);

  const make = typeof raw.Make === "string" ? raw.Make.trim() : null;
  const model = typeof raw.Model === "string" ? raw.Model.trim() : null;
  const lens = typeof raw.LensModel === "string" ? raw.LensModel.trim() : null;

  let locationName: string | null = null;
  const locCand =
    (typeof raw.City === "string" && raw.City.trim()) ||
    (typeof raw.LocationName === "string" && raw.LocationName.trim()) ||
    (typeof raw.Country === "string" && raw.Country.trim()) ||
    null;
  if (locCand) locationName = locCand;

  const focal = num(raw.FocalLength);
  const fnumber = num(raw.FNumber);
  const iso = num(raw.ISO ?? raw.ISOSpeedRatings);

  let shutterSec: number | null = num(raw.ExposureTime);
  if (shutterSec == null && raw.ExposureTime != null) {
    const et = raw.ExposureTime;
    if (typeof et === "object" && et !== null && "numerator" in et && "denominator" in et) {
      const n = num((et as { numerator: unknown }).numerator);
      const d = num((et as { denominator: unknown }).denominator);
      if (n != null && d != null && d !== 0) shutterSec = n / d;
    }
  }

  const { takenAt: parsedAt, takenYear: parsedYear } = parseTakenFromRaw(raw);
  let takenAt: string | null = parsedAt;
  let takenYear: number | null = parsedYear;

  if (!takenAt) {
    const dt =
      (typeof raw.DateTimeOriginal === "string" && raw.DateTimeOriginal) ||
      (typeof raw.CreateDate === "string" && raw.CreateDate) ||
      (typeof raw.DateTime === "string" && raw.DateTime) ||
      null;
    if (dt) {
      const r = parseDateString(dt);
      if (r) {
        takenAt = r.takenAt;
        takenYear = r.takenYear;
      }
    }
  }

  const numeric = roundPhotoNumericFields({
    lon,
    lat,
    locationName,
    altitudeM: alt,
    cameraMake: make,
    cameraModel: model,
    focalLengthMm: focal,
    aperture: fnumber,
    iso,
    lensModel: lens,
    shutterSec,
    takenAt,
    takenYear,
  });

  return {
    ...numeric,
    shutterTime: formatShutterDisplay(numeric.shutterSec ?? null),
  };
}
