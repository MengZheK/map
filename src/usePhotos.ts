import { useEffect, useState } from "react";
import type { Photo } from "./photoUtils";

export default function usePhotos(url = "/photos/photos.json") {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fetch(url)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        if (!alive) return;
        setPhotos(data as Photo[]);
      })
      .catch((e) => {
        if (!alive) return;
        setError(e?.message ? String(e.message) : "Failed to load photos.json");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [url]);

  return { photos, loading, error };
}

