import { useEffect, useState } from "react";
import type { Photo } from "./photoUtils";
import { migrateSessionToLocal, readLocalJson, writeLocalJson } from "./localStorageCache";

const defaultPhotosUrl = `${import.meta.env.BASE_URL}photos/photos.json`;
const CACHE_KEY_PREFIX = "kang-map-photos-json:v1:";
const CACHE_UPDATED_PREFIX = "kang-map-photos-updated:v1:";
const LEGACY_SESSION_PREFIX = "kang-map-photos-json:";

function parseHttpLastModified(header: string | null): Date | null {
  if (!header?.trim()) return null;
  const t = Date.parse(header);
  return Number.isNaN(t) ? null : new Date(t);
}

function readCachedCatalogUpdatedAt(url: string): Date | null {
  const raw = readLocalJson<string>(CACHE_UPDATED_PREFIX + url);
  if (typeof raw !== "string" || !raw.trim()) return null;
  const t = Date.parse(raw);
  return Number.isNaN(t) ? null : new Date(t);
}

function writeCachedCatalogUpdatedAt(url: string, d: Date): void {
  writeLocalJson(CACHE_UPDATED_PREFIX + url, d.toISOString());
}

function cacheKey(url: string): string {
  return CACHE_KEY_PREFIX + url;
}

function readCachedPhotos(url: string): Photo[] | null {
  migrateSessionToLocal(LEGACY_SESSION_PREFIX + url, cacheKey(url));
  const data = readLocalJson<unknown>(cacheKey(url));
  return Array.isArray(data) ? (data as Photo[]) : null;
}

function writeCachedPhotos(url: string, photos: Photo[]): void {
  writeLocalJson(cacheKey(url), photos);
}

export default function usePhotos(url = defaultPhotosUrl) {
  const cached = readCachedPhotos(url);
  const cachedUpdated = readCachedCatalogUpdatedAt(url);
  const [photos, setPhotos] = useState<Photo[]>(cached ?? []);
  const [catalogUpdatedAt, setCatalogUpdatedAt] = useState<Date | null>(cachedUpdated);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    if (!cached) {
      setLoading(true);
    }
    setError(null);

    fetch(url, { cache: "default" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const lm = parseHttpLastModified(r.headers.get("Last-Modified"));
        const data = await r.json();
        if (!alive) return;
        const list = data as Photo[];
        setPhotos(list);
        writeCachedPhotos(url, list);
        if (lm) {
          setCatalogUpdatedAt(lm);
          writeCachedCatalogUpdatedAt(url, lm);
        }
      })
      .catch((e) => {
        if (!alive) return;
        if (!cached) {
          setError(e?.message ? String(e.message) : "Failed to load photos.json");
        }
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅 url 变化时重新拉取
  }, [url]);

  return { photos, loading, error, catalogUpdatedAt };
}
