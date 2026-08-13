const API_URL = "https://events.vercount.one/api/v2/log";
const REQUEST_TIMEOUT_MS = 5000;
const UV_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type VisitStats = {
  sitePv: number;
  siteUv: number;
};

function uvCookieName(): string {
  const host = window.location.host || "unknown-host";
  return `vercount_uv_${host.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

function hasUvCookie(): boolean {
  const name = uvCookieName();
  return document.cookie.split("; ").some((entry) => entry === `${name}=1`);
}

function setUvCookie(): void {
  document.cookie = `${uvCookieName()}=1; path=/; max-age=${UV_COOKIE_MAX_AGE}; samesite=lax`;
}

function parseVisitStats(raw: unknown): VisitStats | null {
  if (!raw || typeof raw !== "object") return null;
  const body = raw as { status?: string; data?: Record<string, unknown> };
  const src =
    body.data && typeof body.data === "object"
      ? body.data
      : (raw as Record<string, unknown>);
  const sitePv = Number(src.site_pv);
  const siteUv = Number(src.site_uv);
  if (!Number.isFinite(sitePv) || !Number.isFinite(siteUv)) return null;
  return { sitePv, siteUv };
}

let inflight: Promise<VisitStats | null> | null = null;

async function fetchVisitStats(): Promise<VisitStats | null> {
  const url = `${window.location.origin}/`;
  const isNewUv = !hasUvCookie();
  if (isNewUv) setUvCookie();

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, isNewUv }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return parseVisitStats(await res.json());
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

/** 每个页面加载只上报一次（含 React StrictMode 重复挂载）。 */
export function recordSiteVisit(): Promise<VisitStats | null> {
  if (!inflight) inflight = fetchVisitStats();
  return inflight;
}
