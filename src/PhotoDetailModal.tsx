import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Photo } from "./photoUtils";
import { preloadPhoto } from "./imageUrl";
import ModalPinchZoom from "./ModalPinchZoom";
import ProgressiveImage from "./ProgressiveImage";
import useCategories from "./useCategories";
import { categoryTitleForId } from "./categoryLabels";
import { useDialogFocus } from "./useDialogFocus";
import {
  cameraDisplay,
  decToDms,
  displayValue,
  formatAperture,
  formatFocalLengthMm,
  formatIso,
  formatTakenDateChinese,
  formatTakenRelativeChinese,
  parsePhotoTakenDate,
  photoAltText,
} from "./photoUtils";

function dmsLat(p: Photo): string {
  if (typeof p.lat !== "number") return "-";
  return decToDms(p.lat, "N", "S");
}

function dmsLon(p: Photo): string {
  if (typeof p.lon !== "number") return "-";
  return decToDms(p.lon, "E", "W");
}

export default function PhotoDetailModal({
  photos,
  activePhotoId,
  onActivePhotoIdChange,
  onClose,
}: {
  photos: Photo[];
  activePhotoId: string;
  onActivePhotoIdChange: (id: string) => void;
  onClose: () => void;
}) {
  const photo = useMemo(
    () => photos.find((p) => p.id === activePhotoId) ?? null,
    [photos, activePhotoId],
  );

  const { categories: categoryDefs } = useCategories();
  const [tab, setTab] = useState<"basic" | "geo">("basic");
  /** 参数悬浮框默认隐藏，点击大图才显示 */
  const [showParamPanel, setShowParamPanel] = useState(false);

  const paramPanelBodyRef = useRef<HTMLDivElement>(null);
  const basicScrollTargetRef = useRef<HTMLDivElement>(null);
  const geoScrollTargetRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const exitBtnRef = useRef<HTMLButtonElement>(null);

  useDialogFocus(true, overlayRef, exitBtnRef);

  const index = useMemo(() => photos.findIndex((p) => p.id === activePhotoId), [photos, activePhotoId]);
  const hasPrev = index > 0;
  const hasNext = index >= 0 && index < photos.length - 1;

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 820px)");
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  /** 大图左右切换动效方向（与上一张/下一张对应） */
  const [slideDir, setSlideDir] = useState<"prev" | "next" | null>(null);

  const navigatePrev = useCallback(() => {
    if (!hasPrev) return;
    setSlideDir("prev");
    onActivePhotoIdChange(photos[index - 1].id);
  }, [hasPrev, index, photos, onActivePhotoIdChange]);

  const navigateNext = useCallback(() => {
    if (!hasNext) return;
    setSlideDir("next");
    onActivePhotoIdChange(photos[index + 1].id);
  }, [hasNext, index, photos, onActivePhotoIdChange]);

  useEffect(() => {
    if (!photo) return;
    if (hasPrev) preloadPhoto(photos[index - 1]!.src, "full");
    if (hasNext) preloadPhoto(photos[index + 1]!.src, "full");
  }, [photo, hasPrev, hasNext, index, photos]);

  const goPrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigatePrev();
  };

  const goNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigateNext();
  };

  useEffect(() => {
    if (!slideDir) return;
    const t = window.setTimeout(() => setSlideDir(null), 380);
    return () => window.clearTimeout(t);
  }, [photo?.id, slideDir]);

  useEffect(() => {
    setShowParamPanel(false);
    setTab("basic");
  }, [activePhotoId]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showParamPanel) {
          setShowParamPanel(false);
        } else {
          onClose();
        }
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        navigatePrev();
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        navigateNext();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, showParamPanel, navigatePrev, navigateNext]);

  const basicItems = useMemo(
    () =>
      !photo
        ? []
        : [
            { label: "分类", value: categoryTitleForId(photo.categoryId, categoryDefs) },
            { label: "焦距", value: formatFocalLengthMm(photo.focalLengthMm) },
            { label: "光圈", value: formatAperture(photo.aperture) },
            { label: "快门", value: displayValue(photo.shutterTime) },
            { label: "ISO", value: formatIso(photo.iso) },
            { label: "相机", value: cameraDisplay(photo) },
            { label: "镜头", value: displayValue(photo.lensModel) },
          ],
    [photo, categoryDefs],
  );

  const takenDateParsed = useMemo(() => (photo ? parsePhotoTakenDate(photo) : null), [photo]);

  const geoItems = useMemo(
    () =>
      !photo
        ? []
        : [
            { label: "纬度", value: dmsLat(photo) },
            { label: "经度", value: dmsLon(photo) },
            { label: "海拔", value: photo.altitudeM == null ? "-" : `${photo.altitudeM} m` },
            { label: "地点名", value: displayValue(photo.locationName) },
          ],
    [photo],
  );

  const scrollPanelChildIntoView = useCallback((el: HTMLElement | null) => {
    if (!el) return;
    const root = paramPanelBodyRef.current;
    const marginTop = 10;
    if (!root) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const pad =
      typeof window !== "undefined"
        ? parseFloat(getComputedStyle(root).paddingTop || "0") || 0
        : 0;
    const delta = el.getBoundingClientRect().top - root.getBoundingClientRect().top;
    const top = root.scrollTop + delta - pad - marginTop;
    root.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }, []);

  const onTabBasic = useCallback(() => {
    setTab("basic");
    window.requestAnimationFrame(() => scrollPanelChildIntoView(basicScrollTargetRef.current));
  }, [scrollPanelChildIntoView]);

  const onTabGeo = useCallback(() => {
    setTab("geo");
    window.requestAnimationFrame(() => scrollPanelChildIntoView(geoScrollTargetRef.current));
  }, [scrollPanelChildIntoView]);

  if (!photo) return null;

  const imageAlt = photoAltText(photo);

  return (
    <div
      ref={overlayRef}
      className="modalOverlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="photo-detail-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <h1 id="photo-detail-title" className="sr-only">
        {imageAlt}
      </h1>
      <div className="modalStage" onMouseDown={(e) => e.stopPropagation()}>
        <button
          ref={exitBtnRef}
          type="button"
          className="modalExitBtn"
          onClick={onClose}
          aria-label="退出大图"
        >
          ✕
        </button>

        <div className="modalImageArea">
          <button
            type="button"
            className="modalNavBtn modalNavBtn--prev"
            onClick={goPrev}
            disabled={!hasPrev}
            aria-label="上一张"
          >
            ‹
          </button>

          <div
            className={
              "modalImageWrap modalImageWrap--clickable" +
              (isMobile ? " modalImageWrap--mobileSwipe" : "")
            }
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (!isMobile && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                setShowParamPanel((v) => !v);
              }
            }}
            aria-label={showParamPanel ? "点击隐藏拍摄参数" : "点击显示拍摄参数"}
          >
            {isMobile ? (
              <ModalPinchZoom
                photoId={photo.id}
                onSwipeLeft={hasNext ? navigateNext : undefined}
                onSwipeRight={hasPrev ? navigatePrev : undefined}
                onTap={() => setShowParamPanel((v) => !v)}
              >
                <div
                  key={photo.id}
                  className={
                    "modalImageInner " +
                    (slideDir === "next"
                      ? "modalImageInner--enterNext"
                      : slideDir === "prev"
                        ? "modalImageInner--enterPrev"
                        : "")
                  }
                >
                  <ProgressiveImage
                    src={photo.src}
                    alt={imageAlt}
                    variant="full"
                    className="modalImage"
                    loadEnabled
                    fetchPriority="high"
                  />
                </div>
              </ModalPinchZoom>
            ) : (
              <div
                key={photo.id}
                className={
                  "modalImageInner " +
                  (slideDir === "next"
                    ? "modalImageInner--enterNext"
                    : slideDir === "prev"
                      ? "modalImageInner--enterPrev"
                      : "")
                }
                onClick={() => setShowParamPanel((v) => !v)}
              >
                <ProgressiveImage
                  src={photo.src}
                  alt={imageAlt}
                  variant="full"
                  className="modalImage"
                  loadEnabled
                  fetchPriority="high"
                />
              </div>
            )}
          </div>

          <button
            type="button"
            className="modalNavBtn modalNavBtn--next"
            onClick={goNext}
            disabled={!hasNext}
            aria-label="下一张"
          >
            ›
          </button>
        </div>

        {showParamPanel ? (
          <div className="paramPanel" onMouseDown={(e) => e.stopPropagation()}>
            <div className="paramPanelHeader">
              <div className="paramTabs">
                <button
                  type="button"
                  className={"paramTabBtn " + (tab === "basic" ? "active" : "")}
                  onClick={onTabBasic}
                >
                  基本参数
                </button>
                <button
                  type="button"
                  className={"paramTabBtn " + (tab === "geo" ? "active" : "")}
                  onClick={onTabGeo}
                >
                  地理位置
                </button>
              </div>
              <button
                type="button"
                className="paramPanelCloseBtn"
                onClick={() => setShowParamPanel(false)}
                aria-label="关闭参数面板"
              >
                ✕
              </button>
            </div>
            <div ref={paramPanelBodyRef} className="paramPanelBody">
              <div className="paramBasicBlock">
                <div ref={basicScrollTargetRef}>
                  <div className="paramGridBasic">
                    {basicItems.map((it) => (
                      <div
                        key={it.label}
                        className={"paramCard" + (it.label === "镜头" ? " paramCard--span2" : "")}
                      >
                        <div className="paramLabel">{it.label}</div>
                        <div className="paramValue">{it.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="paramCard paramCard--span2 paramCard--timeHalf">
                  <div className="paramLabel">拍摄于</div>
                  {takenDateParsed ? (
                    <>
                      <div className="paramTimeRelative">{formatTakenRelativeChinese(takenDateParsed)}</div>
                      <div className="paramTimeAbsolute">{formatTakenDateChinese(takenDateParsed)}</div>
                    </>
                  ) : (
                    <div className="paramTimeRelative">-</div>
                  )}
                </div>
                <div ref={geoScrollTargetRef}>
                  <div className="paramGridGeo">
                    {geoItems.map((it) => (
                      <div key={it.label} className="paramCard">
                        <div className="paramLabel">{it.label}</div>
                        <div className="paramValue">{it.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="paramCard paramCard--span2">
                  <div className="paramLabel">描述</div>
                  <div className="paramValue paramValue--description">
                    {displayValue(photo.description)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
