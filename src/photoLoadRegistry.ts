const STORAGE_KEY = "kang-map-loaded-images:v1";
const MAX_ENTRIES = 900;

let memorySet: Set<string> | null = null;
let pendingUrls = new Set<string>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

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

function flushPending(): void {
  flushTimer = null;
  if (pendingUrls.size === 0) return;
  const set = loadSet();
  for (const url of pendingUrls) set.add(url);
  pendingUrls.clear();
  persist(set);
}

function schedulePersist(): void {
  if (flushTimer != null) return;
  flushTimer = window.setTimeout(flushPending, 2000);
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushPending();
  });
}

/** 本站曾成功加载过（localStorage 记录） */
export function wasPhotoLoadedBefore(url: string): boolean {
  return url ? loadSet().has(url) : false;
}

export function shouldShowPhotoInstantly(url: string): boolean {
  return wasPhotoLoadedBefore(url);
}

export function markPhotoLoaded(url: string): void {
  if (!url) return;
  const set = loadSet();
  if (set.has(url)) return;
  set.add(url);
  pendingUrls.add(url);
  schedulePersist();
}
