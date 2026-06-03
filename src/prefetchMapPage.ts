let prefetchStarted = false;

/** 后台预拉 MapPage 及 maplibre 等依赖，加快相册→地图切换 */
export function prefetchMapPage(): void {
  if (prefetchStarted) return;
  prefetchStarted = true;
  void import(/* @vitePrefetch */ "./pages/MapPage");
}

/** 首屏绘制后立刻预拉（比 idle 更早，适合相册页常驻时） */
export function scheduleMapPagePrefetch(): void {
  if (typeof window === "undefined") return;
  if (prefetchStarted) return;
  requestAnimationFrame(() => prefetchMapPage());
}

export function prefetchMapPageWhenIdle(): void {
  if (typeof window === "undefined") return;
  const run = () => prefetchMapPage();
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(run, { timeout: 800 });
  } else {
    window.setTimeout(run, 400);
  }
}
