import React, { useCallback, useEffect, useRef, useState } from "react";

const MIN_SCALE = 1;
const MAX_SCALE = 4;

function touchDistance(a: Touch, b: Touch): number {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

type ModalPinchZoomProps = {
  photoId: string;
  children: React.ReactNode;
  /** scale === 1 时允许横向滑动切图 */
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onTap?: () => void;
};

export default function ModalPinchZoom({
  photoId,
  children,
  onSwipeLeft,
  onSwipeRight,
  onTap,
}: ModalPinchZoomProps): React.ReactElement {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const scaleRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });
  const pinchRef = useRef<{ startDist: number; startScale: number } | null>(null);
  const panRef = useRef<{ startX: number; startY: number; startOx: number; startOy: number } | null>(null);
  const swipeRef = useRef<{ x: number; y: number } | null>(null);
  const suppressTapRef = useRef(false);

  const applyTransform = useCallback((s: number, o: { x: number; y: number }) => {
    scaleRef.current = s;
    offsetRef.current = o;
    setScale(s);
    setOffset(o);
  }, []);

  const resetTransform = useCallback(() => {
    applyTransform(1, { x: 0, y: 0 });
  }, [applyTransform]);

  useEffect(() => {
    resetTransform();
    pinchRef.current = null;
    panRef.current = null;
    swipeRef.current = null;
  }, [photoId, resetTransform]);

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const d = touchDistance(e.touches[0]!, e.touches[1]!);
      pinchRef.current = { startDist: d, startScale: scaleRef.current };
      panRef.current = null;
      swipeRef.current = null;
      return;
    }
    if (e.touches.length === 1) {
      const t = e.touches[0]!;
      if (scaleRef.current > 1.02) {
        panRef.current = {
          startX: t.clientX,
          startY: t.clientY,
          startOx: offsetRef.current.x,
          startOy: offsetRef.current.y,
        };
        swipeRef.current = null;
      } else {
        swipeRef.current = { x: t.clientX, y: t.clientY };
        panRef.current = null;
      }
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length > 0) return;

    if (pinchRef.current) {
      pinchRef.current = null;
      if (scaleRef.current < 1.05) resetTransform();
      window.setTimeout(() => {
        suppressTapRef.current = false;
      }, 400);
      return;
    }

    if (panRef.current) {
      panRef.current = null;
      window.setTimeout(() => {
        suppressTapRef.current = false;
      }, 400);
      return;
    }

    if (swipeRef.current && scaleRef.current <= 1.02) {
      const t = e.changedTouches[0];
      if (t) {
        const dx = t.clientX - swipeRef.current.x;
        const dy = t.clientY - swipeRef.current.y;
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);
        if (absX >= 56 && absX >= absY * 1.15) {
          suppressTapRef.current = true;
          window.setTimeout(() => {
            suppressTapRef.current = false;
          }, 400);
          if (dx < 0) onSwipeLeft?.();
          else onSwipeRight?.();
        }
      }
    }
    swipeRef.current = null;
  };

  const onTouchCancel = () => {
    pinchRef.current = null;
    panRef.current = null;
    swipeRef.current = null;
  };

  const onClick = () => {
    if (suppressTapRef.current) return;
    if (scaleRef.current > 1.02) {
      resetTransform();
      return;
    }
    onTap?.();
  };

  const viewportRef = useRef<HTMLDivElement>(null);
  const zoomed = scale > 1.02;

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault();
        const d = touchDistance(e.touches[0]!, e.touches[1]!);
        const next = Math.min(
          MAX_SCALE,
          Math.max(MIN_SCALE, (pinchRef.current.startScale * d) / pinchRef.current.startDist),
        );
        applyTransform(next, offsetRef.current);
        suppressTapRef.current = true;
        return;
      }
      if (e.touches.length === 1 && panRef.current && scaleRef.current > 1.02) {
        e.preventDefault();
        const t = e.touches[0]!;
        const pan = panRef.current;
        applyTransform(scaleRef.current, {
          x: pan.startOx + (t.clientX - pan.startX),
          y: pan.startOy + (t.clientY - pan.startY),
        });
        suppressTapRef.current = true;
      }
    };
    el.addEventListener("touchmove", onMove, { passive: false });
    return () => el.removeEventListener("touchmove", onMove);
  }, [applyTransform]);

  return (
    <div
      ref={viewportRef}
      className={"modalPinchViewport" + (zoomed ? " modalPinchViewport--zoomed" : "")}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchCancel}
      onClick={onClick}
    >
      <div
        className="modalPinchLayer"
        style={{
          transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
