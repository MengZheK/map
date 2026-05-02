/**
 * 与 public/photos/categories.json 及站内兜底一致：按 categoryId 解析中文栏目名。
 */
export type CategoryDefinition = { id: string; label: string };

/** categories.json 缺失某 id 时的内置中文名（与历史默认栏目一致） */
export const DEFAULT_CATEGORY_LABELS: Record<string, string> = {
  asia_explore: "亚洲探索",
  europe_explore: "欧洲探索",
  ocean_explore: "异域风情",
};

/**
 * @param defsFromFile useCategories 拉取的 categories.json
 */
export function categoryTitleForId(
  categoryId: string | null | undefined,
  defsFromFile: CategoryDefinition[],
): string {
  if (categoryId == null || String(categoryId).trim() === "") return "-";
  const id = String(categoryId);
  const fromFile = defsFromFile.find((c) => c.id === id);
  if (fromFile) return fromFile.label;
  return DEFAULT_CATEGORY_LABELS[id] ?? id;
}
