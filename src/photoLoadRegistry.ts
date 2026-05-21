const STORAGE_KEY = "kang-map-loaded-images:v1";
const MAX_ENTRIES = 900;

let memorySet: Set<string> | null = null;

function loadSet(): Set<string> {
  if (memorySet) return memorySet;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    memorySet = new Set(Array.isArray(list) ? list.filter((u) => typeof u === "string") : []);
  } catch {
    memorySet = new Set();
  }
  return memorySet;
}

function persist(set: Set<string>): void {
  try {
    const list = [...set];
    const trimmed = list.length > MAX_ENTRIES ? list.slice(-MAX_ENTRIES) : list;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    memorySet = new Set(trimmed);
  } catch {
    /* 配额满时仅保留内存 */
  }
}

/** 同步探测：浏览器磁盘/内存缓存中是否已有该图 */
export function probeImageInBrowserCache(url: string): boolean {
  if (!url) return false;
  const img = new Image();
  img.src = url;
  return img.complete && img.naturalWidth > 0;
}

/** 本站曾成功加载过（localStorage 记录） */
export function wasPhotoLoadedBefore(url: string): boolean {
  return url ? loadSet().has(url) : false;
}

export function shouldShowPhotoInstantly(url: string): boolean {
  return wasPhotoLoadedBefore(url) || probeImageInBrowserCache(url);
}

export function markPhotoLoaded(url: string): void {
  if (!url) return;
  const set = loadSet();
  set.add(url);
  persist(set);
}
