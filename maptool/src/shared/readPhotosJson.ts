/**
 * 读取 photos.json；若缺少开头的 `[` 但结尾有 `]`（常见于误编辑），自动补全后再解析。
 */
export function parsePhotosJsonText(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  try {
    return JSON.parse(trimmed);
  } catch (firstErr) {
    const repaired = repairPhotosJsonText(trimmed);
    if (repaired !== trimmed) {
      try {
        return JSON.parse(repaired);
      } catch {
        /* fall through */
      }
    }
    throw firstErr;
  }
}

export function repairPhotosJsonText(text: string): string {
  const t = text.trim();
  if (!t) return "[]";
  if (t.startsWith("[")) return t;

  if (t.startsWith("{") && t.endsWith("]")) {
    return `[\n${t}`;
  }

  if (t.startsWith("{") && t.endsWith("}")) {
    return `[${t}]`;
  }

  return t;
}
