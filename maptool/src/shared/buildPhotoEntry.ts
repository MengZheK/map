import type { PhotoEntry } from "./photoTypes";
import { roundPhotoNumericFields } from "./roundPhotoNumerics";

/** 由表单合并为写入 JSON 的单条记录 */
export function buildPhotoEntry(
  id: string,
  cosUrl: string,
  categoryId: string,
  description: string,
  partial: Partial<PhotoEntry>,
): PhotoEntry {
  const r = roundPhotoNumericFields(partial);
  return {
    id,
    src: cosUrl.trim(),
    categoryId: categoryId.trim() || null,
    lon: partial.lon ?? null,
    lat: partial.lat ?? null,
    locationName: partial.locationName ?? null,
    altitudeM: r.altitudeM ?? null,
    cameraMake: partial.cameraMake ?? null,
    cameraModel: partial.cameraModel ?? null,
    focalLengthMm: r.focalLengthMm ?? null,
    aperture: r.aperture ?? null,
    shutterTime: partial.shutterTime ?? null,
    iso: r.iso ?? null,
    lensModel: partial.lensModel ?? null,
    description: description.trim() || null,
    takenYear: partial.takenYear ?? null,
    takenAt: partial.takenAt ?? null,
    shutterSec: r.shutterSec ?? null,
  };
}
