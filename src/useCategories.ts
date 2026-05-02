import { useEffect, useState } from "react";
import type { CategoryDefinition } from "./categoryLabels";

export type { CategoryDefinition };

/**
 * 拉取网站工程 `public/photos/categories.json`（由相册清单工具写入）。
 * 缺失或非数组时不抛错，返回空数组，由页面层用内置默认名兜底。
 */
export default function useCategories(url = "/photos/categories.json") {
  const [categories, setCategories] = useState<CategoryDefinition[]>([]);

  useEffect(() => {
    let alive = true;
    fetch(url)
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
        if (alive) setCategories(list);
      })
      .catch(() => {
        if (alive) setCategories([]);
      });
    return () => {
      alive = false;
    };
  }, [url]);

  return { categories };
}
