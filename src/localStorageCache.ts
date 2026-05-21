/** 读取 localStorage JSON，失败返回 null */
export function readLocalJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeLocalJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 配额满 */
  }
}

/** 从 sessionStorage 迁移到 localStorage（一次性） */
export function migrateSessionToLocal(sessionKey: string, localKey: string): void {
  try {
    if (localStorage.getItem(localKey)) return;
    const raw = sessionStorage.getItem(sessionKey);
    if (raw) localStorage.setItem(localKey, raw);
  } catch {
    /* ignore */
  }
}
