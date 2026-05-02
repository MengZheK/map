import type { PhotoEntry } from "./photoTypes";

export type MergeResult =
  | { ok: true; merged: PhotoEntry[]; added: number; skippedDuplicateIds: string[] }
  | { ok: false; error: string };

/**
 * 在现有列表基础上合并新条目：相同 id 跳过（不覆盖），避免误删历史。
 */
export function mergePhotoEntries(existing: PhotoEntry[], incoming: PhotoEntry[]): MergeResult {
  const byId = new Map<string, PhotoEntry>();
  for (const p of existing) {
    byId.set(p.id, p);
  }
  const skippedDuplicateIds: string[] = [];
  let added = 0;
  for (const p of incoming) {
    if (byId.has(p.id)) {
      skippedDuplicateIds.push(p.id);
      continue;
    }
    byId.set(p.id, p);
    added++;
  }
  return {
    ok: true,
    merged: [...byId.values()],
    added,
    skippedDuplicateIds,
  };
}

export function nextPhotoId(existing: PhotoEntry[]): string {
  let maxNum = 0;
  for (const p of existing) {
    const m = /^p(\d+)$/i.exec(p.id.trim());
    if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
  }
  const next = maxNum + 1;
  return `p${String(next).padStart(4, "0")}`;
}
