import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  photoDisplayUrl,
  photoPlaceholderUrl,
  resolvePhotoSrc,
  type PhotoImageVariant,
} from "./imageUrl";
import { markPhotoLoaded, shouldShowPhotoInstantly } from "./photoLoadRegistry";

export type ProgressivePhase = "idle" | "loading" | "ready" | "error";

export type ProgressiveRevealProfile = "default" | "relaxed";

type ProgressiveImageProps = {
  src: string;
  alt?: string;
  className?: string;
  variant?: PhotoImageVariant;
  /** false 时仅显示占位，不发起请求 */
  loadEnabled?: boolean;
  /** false 时不请求模糊小图，仅保留 shimmer 占位 */
  placeholderEnabled?: boolean;
  fetchPriority?: "high" | "low" | "auto";
  /** cover：铺满父容器（地图地点卡片等） */
  fit?: "intrinsic" | "cover";
  /** relaxed：更长渐出/渐入，适合相册 */
  reveal?: ProgressiveRevealProfile;
  /** 主图解码后至少保留占位时长（毫秒） */
  minRevealMs?: number;
  /** 渐入延迟（毫秒），用于瀑布流错峰 */
  revealDelayMs?: number;
};

export default function ProgressiveImage({
  src,
  alt = "",
  className = "",
  variant = "grid",
  loadEnabled = true,
  placeholderEnabled = true,
  fetchPriority = "auto",
  fit = "intrinsic",
  reveal = "default",
  minRevealMs = 0,
  revealDelayMs = 0,
}: ProgressiveImageProps) {
  const fullUrl = resolvePhotoSrc(src);
  const mainUrl = photoDisplayUrl(src, variant);
  const tinyUrl = photoPlaceholderUrl(src);

  const instant =
    loadEnabled && mainUrl ? shouldShowPhotoInstantly(mainUrl) : false;

  const [phase, setPhase] = useState<ProgressivePhase>(() =>
    instant ? "ready" : "idle",
  );
  const [activeSrc, setActiveSrc] = useState<string | null>(() =>
    instant && loadEnabled ? mainUrl : null,
  );
  const [blurReady, setBlurReady] = useState(instant);
  const mountedRef = useRef(true);
  const loadStartRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!loadEnabled) {
      setBlurReady(false);
      setPhase("idle");
      setActiveSrc(null);
      return;
    }

    const cached = shouldShowPhotoInstantly(mainUrl);
    if (cached) {
      setBlurReady(true);
      setPhase("ready");
      setActiveSrc(mainUrl);
      return;
    }

    setBlurReady(false);
    loadStartRef.current = Date.now();
    setPhase("loading");
    setActiveSrc(mainUrl);
  }, [loadEnabled, mainUrl, src]);

  const finishReveal = useCallback(
    async (img: HTMLImageElement) => {
      try {
        if (img.decode) await img.decode();
      } catch {
        /* 解码失败仍展示 */
      }
      if (minRevealMs > 0) {
        const wait = minRevealMs - (Date.now() - loadStartRef.current);
        if (wait > 0) {
          await new Promise<void>((resolve) => {
            window.setTimeout(resolve, wait);
          });
        }
      }
      if (!mountedRef.current) return;
      if (mainUrl) markPhotoLoaded(mainUrl);
      requestAnimationFrame(() => {
        if (mountedRef.current) setPhase("ready");
      });
    },
    [minRevealMs, mainUrl],
  );

  const onMainLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (mainUrl) markPhotoLoaded(mainUrl);

    if (shouldShowPhotoInstantly(mainUrl)) {
      setPhase("ready");
      return;
    }

    // 默认模式：下载完成即显示，decode 不阻塞呈现
    if (reveal !== "relaxed" && minRevealMs <= 0) {
      setPhase("ready");
      void img.decode?.().catch(() => {});
      return;
    }

    void finishReveal(img);
  };

  const onMainError = () => {
    if (activeSrc !== fullUrl) {
      setActiveSrc(fullUrl);
      return;
    }
    setPhase("error");
  };

  const showLoader = loadEnabled && phase === "loading";

  const revealStyle =
    revealDelayMs > 0
      ? ({ "--progressive-reveal-delay": `${revealDelayMs}ms` } as React.CSSProperties)
      : undefined;

  return (
    <div
      className={
        "progressiveImage" +
        (fit === "cover" ? " progressiveImage--cover" : "") +
        (reveal === "relaxed" ? " progressiveImage--relaxed" : "") +
        (instant ? " progressiveImage--instant" : "") +
        (phase === "ready" ? " progressiveImage--ready" : "") +
        (showLoader ? " progressiveImage--loading" : "") +
        (!loadEnabled ? " progressiveImage--deferred" : "")
      }
      style={revealStyle}
    >
      <div className="progressiveImage__stage" aria-hidden={phase === "ready"}>
        {tinyUrl && loadEnabled && placeholderEnabled ? (
          <img
            className={"progressiveImage__blur" + (blurReady ? " progressiveImage__blur--on" : "")}
            src={tinyUrl}
            alt=""
            decoding="async"
            onLoad={() => setBlurReady(true)}
          />
        ) : null}
        <div className="progressiveImage__shimmer" />
        <div className="progressiveImage__pulse" />
      </div>

      {phase === "error" ? (
        <div className="progressiveImage__error">
          <span className="progressiveImage__errorIcon" aria-hidden>
            ⌁
          </span>
          <span>加载失败</span>
        </div>
      ) : null}

      {activeSrc ? (
        <img
          className={
            "progressiveImage__main " +
            className +
            (phase === "ready" ? " progressiveImage__main--visible" : "")
          }
          src={activeSrc}
          alt={alt}
          decoding="async"
          fetchPriority={fetchPriority}
          onLoad={onMainLoad}
          onError={onMainError}
        />
      ) : null}

      {showLoader ? <span className="progressiveImage__loader" aria-label="图片加载中" /> : null}
    </div>
  );
}
