import exifr from "exifr";
import type { PhotoEntry } from "../shared/photoTypes";
import { enrichPartialWithPlaceFromCoords } from "../shared/enrichPhotoPartial";
import { exifToPartialPhoto } from "../shared/exifMap";
import { roundPhotoNumericFields } from "../shared/roundPhotoNumerics";

/** 合并两段解析结果：后者非空的字段覆盖前者 */
export function mergePartialPhoto(a: Partial<PhotoEntry>, b: Partial<PhotoEntry>): Partial<PhotoEntry> {
  const out: Partial<PhotoEntry> = { ...a };
  (Object.keys(b) as (keyof PhotoEntry)[]).forEach((k) => {
    const v = b[k];
    if (v !== undefined && v !== null && v !== "") {
      const prev = out[k];
      const prevEmpty = prev === undefined || prev === null || prev === "";
      if (prevEmpty) {
        (out as Record<string, unknown>)[k as string] = v as unknown;
      }
    }
  });
  return out;
}

function countFilled(p: Partial<PhotoEntry>): number {
  return (Object.keys(p) as (keyof PhotoEntry)[]).filter((k) => {
    const v = p[k];
    return v !== undefined && v !== null && v !== "";
  }).length;
}

function isWeak(p: Partial<PhotoEntry>): boolean {
  return countFilled(p) < 3;
}

/** 仅对 EXIF 子块再解析（iPhone / HEIC 常见） */
async function parseExifBuffer(exifBuf: Buffer): Promise<Partial<PhotoEntry>> {
  try {
    const raw = (await exifr.parse(exifBuf, {
      tiff: true,
      ifd0: true,
      exif: true,
      gps: true,
      translateKeys: true,
      translateValues: true,
      mergeTags: true,
    })) as Record<string, unknown> | undefined;
    if (!raw || Object.keys(raw).length === 0) return {};
    return exifToPartialPhoto(raw);
  } catch {
    return {};
  }
}

/**
 * iPhone HEIC：先用 exifr 读整文件；不足时用 sharp 取 meta.exif / 转 JPEG 再读。
 */
export async function readPhotoMetadata(buf: Buffer, filePath: string): Promise<Partial<PhotoEntry>> {
  const optionSets = [
    {
      tiff: true,
      ifd0: true,
      ifd1: true,
      exif: true,
      gps: true,
      interop: true,
      translateKeys: true,
      translateValues: true,
      mergeTags: true,
      reviveValues: true,
    },
    { mergeTags: true, gps: true, translateKeys: true, translateValues: true },
    { gps: true },
    {},
  ] as const;

  let merged: Partial<PhotoEntry> = {};

  for (const opts of optionSets) {
    try {
      const raw = (await exifr.parse(buf, opts as Record<string, unknown>)) as
        | Record<string, unknown>
        | undefined;
      if (raw && typeof raw === "object" && Object.keys(raw).length > 0) {
        merged = mergePartialPhoto(merged, exifToPartialPhoto(raw));
      }
    } catch {
      /* 下一套参数 */
    }
  }

  const lower = filePath.toLowerCase();
  const maybeHeic = lower.endsWith(".heic") || lower.endsWith(".heif");

  let trySharp = maybeHeic || isWeak(merged);

  if (trySharp) {
    try {
      const sharpMod = await import("sharp");
      const sharp = sharpMod.default;
      const meta = await sharp(buf).metadata();

      if (meta.exif && meta.exif.length > 0) {
        merged = mergePartialPhoto(merged, await parseExifBuffer(Buffer.from(meta.exif)));
      }

      if (isWeak(merged) || maybeHeic) {
        const jpegBuf = await sharp(buf).rotate().jpeg({ quality: 88, mozjpeg: true }).toBuffer();
        for (const opts of optionSets) {
          try {
            const raw = (await exifr.parse(jpegBuf, opts as Record<string, unknown>)) as
              | Record<string, unknown>
              | undefined;
            if (raw && Object.keys(raw).length > 0) {
              merged = mergePartialPhoto(merged, exifToPartialPhoto(raw));
            }
          } catch {
            /* continue */
          }
        }
      }
    } catch {
      /* sharp 未安装或当前格式不支持：忽略 */
    }
  }

  return roundPhotoNumericFields(enrichPartialWithPlaceFromCoords(merged));
}
