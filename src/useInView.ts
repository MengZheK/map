import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

type UseInViewOptions = {
  rootMargin?: string;
  threshold?: number;
  /** 为 false 时首屏即视为可见，不再挂观察器（用于 priority 图） */
  enabled?: boolean;
};

/** 解析 rootMargin 竖直方向扩展（px），格式如 "120px 0px" */
function parseVerticalRootMargin(rootMargin: string): { top: number; bottom: number } {
  const parts = rootMargin.trim().split(/\s+/);
  const read = (v: string | undefined) => {
    if (!v) return 0;
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  };
  if (parts.length === 1) {
    const m = read(parts[0]);
    return { top: m, bottom: m };
  }
  if (parts.length === 2) {
    const vertical = read(parts[0]);
    return { top: vertical, bottom: vertical };
  }
  return { top: read(parts[0]), bottom: read(parts[2]) };
}

function isNearViewport(el: Element, rootMargin: string): boolean {
  const { top: marginTop, bottom: marginBottom } = parseVerticalRootMargin(rootMargin);
  const rect = el.getBoundingClientRect();
  const vh = window.innerHeight;
  return rect.top <= vh + marginBottom && rect.bottom >= -marginTop;
}

export function useInView<T extends Element>({
  rootMargin = "400px 0px",
  threshold = 0.01,
  enabled = true,
}: UseInViewOptions = {}): { ref: RefObject<T | null>; inView: boolean } {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(!enabled);
  const loadedRef = useRef(!enabled);

  const markInView = useCallback(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    setInView(true);
  }, []);

  useEffect(() => {
    if (!enabled) {
      markInView();
      return;
    }

    const el = ref.current;
    if (!el) return;

    if (loadedRef.current || isNearViewport(el, rootMargin)) {
      markInView();
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      const onScroll = () => {
        if (ref.current && isNearViewport(ref.current, rootMargin)) {
          markInView();
          window.removeEventListener("scroll", onScroll);
          window.removeEventListener("resize", onScroll);
        }
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll, { passive: true });
      return () => {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
      };
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          markInView();
          io.disconnect();
        }
      },
      { rootMargin, threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [enabled, rootMargin, threshold, markInView]);

  return { ref, inView };
}
