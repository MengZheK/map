/**
 * 与网站 public/photos/photos.json 条目对齐（可含 json 里多出的字段）
 */
export type PhotoEntry = {
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
  shutterTime: string | null;
  iso: number | null;
  lensModel: string | null;
  description?: string | null;
  takenYear?: number | null;
  takenAt?: string | null;
  shutterSec?: number | null;
};

/** 分类选项（可持久化自定义） */
export type CategoryRow = {
  id: string;
  label: string;
};

export const DEFAULT_CATEGORIES: CategoryRow[] = [
  { id: "asia_explore", label: "亚洲探索" },
  { id: "europe_explore", label: "欧洲探索" },
  { id: "ocean_explore", label: "异域风情" },
];
