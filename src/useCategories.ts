import { useEffect, useState } from "react";
import type { CategoryDefinition } from "./categoryLabels";
import { readLocalJson, writeLocalJson } from "./localStorageCache";

export type { CategoryDefinition };

const defaultCategoriesUrl = `${import.meta.env.BASE_URL}photos/categories.json`;
const CACHE_KEY_PREFIX = "kang-map-categories-json:v1:";

function readCachedCategories(url: string): CategoryDefinition[] | null {
  const data = readLocalJson<unknown>(CACHE_KEY_PREFIX + url);
  if (!Array.isArray(data)) return null;
  return data.filter(
    (x): x is CategoryDefinition =>
      typeof x === "object" &&
      x !== null &&
      typeof (x as CategoryDefinition).id === "string" &&
      typeof (x as CategoryDefinition).label === "string",
  );
}

export default function useCategories(url = defaultCategoriesUrl) {
  const cached = readCachedCategories(url);
  const [categories, setCategories] = useState<CategoryDefinition[]>(cached ?? []);

  useEffect(() => {
    let alive = true;

    fetch(url, { cache: "default" })
      .then(async (r) => {
        if (r.status === 404) return [];
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = (await r.json()) as unknown;
        if (!Array.isArray(data)) return [];
        return data.filter(
          (x): x is CategoryDefinition =>
            typeof x === "object" &&
            x !== null &&
            typeof (x as CategoryDefinition).id === "string" &&
            typeof (x as CategoryDefinition).label === "string",
        );
      })
      .then((list) => {
        if (!alive) return;
        setCategories(list);
        writeLocalJson(CACHE_KEY_PREFIX + url, list);
      })
      .catch(() => {
        if (alive && !cached) setCategories([]);
      });

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return { categories };
}
