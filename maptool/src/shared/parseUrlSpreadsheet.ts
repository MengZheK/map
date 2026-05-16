/** Excel/表格行：表头 file（文件名，可含相对路径）、url（COS 链接） */
export type UrlSpreadsheetPair = { file: string; url: string };

export type ParseUrlSpreadsheetResult =
  | { ok: true; pairs: UrlSpreadsheetPair[]; map: Record<string, string> }
  | { ok: false; error: string };

export type ApplyUrlMapResult = {
  updated: number;
  unmatchedDrafts: string[];
  unusedExcelFiles: string[];
};

/** 统一斜杠、去首尾空白与引号、Unicode NFC（不写死任何目录名） */
export function normalizeSpreadsheetFileRef(file: string): string {
  let s = String(file ?? "").trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  s = s.replace(/\\/g, "/").replace(/^\/+/, "");
  if (s.endsWith("/")) s = s.replace(/\/+$/, "");
  try {
    s = s.normalize("NFC");
  } catch {
    /* 环境不支持 normalize 时忽略 */
  }
  return s;
}

/** 相对路径键：小写，保留中间目录（如 mapphotos-20260516/xxx.jpg） */
export function normalizePathKey(file: string): string {
  return normalizeSpreadsheetFileRef(file).toLowerCase();
}

/** 仅文件名部分，用于与本地 fileName 对齐 */
export function normalizeFileKey(name: string): string {
  const pathKey = normalizePathKey(name);
  const slash = pathKey.lastIndexOf("/");
  return slash >= 0 ? pathKey.slice(slash + 1) : pathKey;
}

export type UrlSpreadsheetLookup = {
  byKey: Record<string, string>;
  pairs: UrlSpreadsheetPair[];
  /** basename -> 表格行下标（同 basename 多行时保留全部，匹配时取首个未用） */
  byBasename: Map<string, number[]>;
};

function registerLookupKeys(lookup: UrlSpreadsheetLookup, pairIndex: number, file: string, url: string): void {
  const pathKey = normalizePathKey(file);
  const baseKey = normalizeFileKey(file);
  lookup.byKey[pathKey] = url;
  if (baseKey !== pathKey) lookup.byKey[baseKey] = url;

  const list = lookup.byBasename.get(baseKey) ?? [];
  if (!list.includes(pairIndex)) list.push(pairIndex);
  lookup.byBasename.set(baseKey, list);
}

export function buildUrlSpreadsheetLookup(pairs: UrlSpreadsheetPair[]): UrlSpreadsheetLookup {
  const lookup: UrlSpreadsheetLookup = {
    byKey: {},
    pairs,
    byBasename: new Map(),
  };
  pairs.forEach((p, i) => registerLookupKeys(lookup, i, p.file, p.url));
  return lookup;
}

/** 根据本地照片名 / 路径在表格中查找 URL（目录前缀任意，不写死） */
export function findUrlForLocalPhoto(
  fileName: string,
  localPath: string | undefined,
  lookup: UrlSpreadsheetLookup,
  usedPairIndices: Set<number>,
): { url: string; pairIndex: number } | null {
  const tryKeys = new Set<string>();
  for (const raw of [fileName, localPath ?? ""]) {
    if (!raw.trim()) continue;
    tryKeys.add(normalizeFileKey(raw));
    tryKeys.add(normalizePathKey(raw));
  }

  for (const key of tryKeys) {
    if (!key) continue;
    const direct = lookup.byKey[key];
    if (direct) {
      const pairIndex = resolvePairIndexForKey(lookup, key, usedPairIndices);
      if (pairIndex >= 0) return { url: direct, pairIndex };
    }
  }

  const base = normalizeFileKey(fileName || localPath || "");
  if (!base) return null;

  const basenameCandidates = lookup.byBasename.get(base);
  if (basenameCandidates) {
    for (const idx of basenameCandidates) {
      if (!usedPairIndices.has(idx)) {
        return { url: lookup.pairs[idx]!.url, pairIndex: idx };
      }
    }
  }

  for (let i = 0; i < lookup.pairs.length; i++) {
    if (usedPairIndices.has(i)) continue;
    const pathKey = normalizePathKey(lookup.pairs[i]!.file);
    if (pathKey === base || pathKey.endsWith(`/${base}`)) {
      return { url: lookup.pairs[i]!.url, pairIndex: i };
    }
  }

  return null;
}

function resolvePairIndexForKey(
  lookup: UrlSpreadsheetLookup,
  key: string,
  usedPairIndices: Set<number>,
): number {
  const base = normalizeFileKey(key);
  const fromBase = lookup.byBasename.get(base);
  if (fromBase) {
    for (const idx of fromBase) {
      if (!usedPairIndices.has(idx)) return idx;
    }
  }
  for (let i = 0; i < lookup.pairs.length; i++) {
    if (usedPairIndices.has(i)) continue;
    const pathKey = normalizePathKey(lookup.pairs[i]!.file);
    if (pathKey === key || normalizeFileKey(lookup.pairs[i]!.file) === key) return i;
  }
  return -1;
}

function headerIndex(headers: string[], name: string): number {
  const want = name.toLowerCase();
  return headers.findIndex((h) => h.trim().toLowerCase() === want);
}

/**
 * 从二维表数据解析 file / url 列（首行或前 10 行内寻找表头）。
 */
export function parseUrlSpreadsheetRows(rows: unknown[][]): ParseUrlSpreadsheetResult {
  if (!rows.length) {
    return { ok: false, error: "表格为空" };
  }

  let headerRowIndex = -1;
  let fileCol = -1;
  let urlCol = -1;

  const scanLimit = Math.min(rows.length, 10);
  for (let r = 0; r < scanLimit; r++) {
    const raw = rows[r];
    if (!Array.isArray(raw)) continue;
    const headers = raw.map((c) => String(c ?? "").trim());
    const fi = headerIndex(headers, "file");
    const ui = headerIndex(headers, "url");
    if (fi >= 0 && ui >= 0) {
      headerRowIndex = r;
      fileCol = fi;
      urlCol = ui;
      break;
    }
  }

  if (headerRowIndex < 0) {
    return {
      ok: false,
      error: '未找到表头列「file」与「url」。请确认第一行（或前几行）包含这两列表头。',
    };
  }

  const pairs: UrlSpreadsheetPair[] = [];

  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const raw = rows[r];
    if (!Array.isArray(raw)) continue;
    const file = String(raw[fileCol] ?? "").trim();
    const url = String(raw[urlCol] ?? "").trim();
    if (!file && !url) continue;
    if (!file) continue;
    if (!url) continue;

    pairs.push({ file, url });
  }

  if (pairs.length === 0) {
    return { ok: false, error: "未解析到有效数据行（file、url 均需非空）" };
  }

  const lookup = buildUrlSpreadsheetLookup(pairs);
  return { ok: true, pairs, map: lookup.byKey };
}

export function applyUrlMapToDrafts<
  T extends { fileName: string; localPath?: string; cosUrl: string },
>(
  drafts: T[],
  urlMap: Record<string, string>,
  sourcePairs?: UrlSpreadsheetPair[],
): { drafts: T[]; result: ApplyUrlMapResult } {
  const lookup = sourcePairs ? buildUrlSpreadsheetLookup(sourcePairs) : buildUrlSpreadsheetLookup(
    Object.entries(urlMap).map(([file, url]) => ({ file, url })),
  );
  const usedPairIndices = new Set<number>();
  let updated = 0;

  const next = drafts.map((d) => {
    const hit = findUrlForLocalPhoto(d.fileName, d.localPath, lookup, usedPairIndices);
    if (!hit) return d;
    usedPairIndices.add(hit.pairIndex);
    if (d.cosUrl.trim() === hit.url) return d;
    updated += 1;
    return { ...d, cosUrl: hit.url };
  });

  const unmatchedDrafts = drafts
    .filter((d) => {
      const probe = new Set<number>();
      return !findUrlForLocalPhoto(d.fileName, d.localPath, lookup, probe);
    })
    .map((d) => d.fileName);

  const unusedExcelFiles = lookup.pairs
    .filter((_, i) => !usedPairIndices.has(i))
    .map((p) => p.file);

  return {
    drafts: next,
    result: { updated, unmatchedDrafts, unusedExcelFiles },
  };
}
