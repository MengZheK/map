import { useEffect, useState } from "react";
import type { Photo } from "./photoUtils";

const defaultPhotosUrl = `${import.meta.env.BASE_URL}photos/photos.json`;
const CACHE_PREFIX = "kang-map-photos-json:";

function readCachedPhotos(url: string): Photo[] | null {
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + url);
    if (!raw) return null;
    const data = JSON.parse(raw) as unknown;
    return Array.isArray(data) ? (data as Photo[]) : null;
  } catch {
    return null;
  }
}

function writeCachedPhotos(url: string, photos: Photo[]): void {
  try {
    sessionStorage.setItem(CACHE_PREFIX + url, JSON.stringify(photos));
  } catch {
    /* 配额满时忽略 */
  }
}

export default function usePhotos(url = defaultPhotosUrl) {
  const cached = readCachedPhotos(url);
  const [photos, setPhotos] = useState<Photo[]>(cached ?? []);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    if (!cached) {
      setLoading(true);
    }
    setError(null);

    fetch(url)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        if (!alive) return;
        const list = data as Photo[];
        setPhotos(list);
        writeCachedPhotos(url, list);
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

  return { photos, loading, error };
}
