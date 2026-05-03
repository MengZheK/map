import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Photo } from "./photoUtils";
import { publicUrl } from "./publicUrl";
import useCategories from "./useCategories";
import { categoryTitleForId } from "./categoryLabels";
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

  const goPrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigatePrev();
  };

  const goNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigateNext();
  };

  /** 手机端：横向滑动换图；滑动后抑制紧随其后的 click，避免误触参数面板 */
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const suppressImageClickRef = useRef(false);

  const SWIPE_MIN_PX = 56;
  const SWIPE_DOMINANCE = 1.15;

  const onImageTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return;
    const t = e.touches[0];
    if (!t) return;
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };

  const onImageTouchEnd = (e: React.TouchEvent) => {
    if (!isMobile || !touchStartRef.current) return;
    const t = e.changedTouches[0];
    if (!t) {
      touchStartRef.current = null;
      return;
    }
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (absX < SWIPE_MIN_PX || absX < absY * SWIPE_DOMINANCE) return;

    suppressImageClickRef.current = true;
    window.setTimeout(() => {
      suppressImageClickRef.current = false;
    }, 400);
    if (dx < 0) navigateNext();
    else navigatePrev();
  };

  const onImageTouchCancel = () => {
    touchStartRef.current = null;
  };

  useEffect(() => {
    if (!slideDir) return;
    const t = window.setTimeout(() => setSlideDir(null), 380);
    return () => window.clearTimeout(t);
  }, [photo?.id, slideDir]);

  useEffect(() => {
    setShowParamPanel(false);
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

  if (!photo) return null;

  return (
    <div
      className="modalOverlay"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modalStage" onMouseDown={(e) => e.stopPropagation()}>
        <button type="button" className="modalExitBtn" onClick={onClose} aria-label="退出大图">
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
            onClick={() => {
              if (suppressImageClickRef.current) return;
              setShowParamPanel((v) => !v);
            }}
            onTouchStart={onImageTouchStart}
            onTouchEnd={onImageTouchEnd}
            onTouchCancel={onImageTouchCancel}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setShowParamPanel((v) => !v);
              }
            }}
            aria-label={showParamPanel ? "点击隐藏拍摄参数" : "点击显示拍摄参数"}
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
              <img
                className="modalImage"
                src={publicUrl(photo.src)}
                alt=""
                loading="lazy"
                decoding="async"
              />
            </div>
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
                  onClick={() => setTab("basic")}
                >
                  基本参数
                </button>
                <button
                  type="button"
                  className={"paramTabBtn " + (tab === "geo" ? "active" : "")}
                  onClick={() => setTab("geo")}
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
            <div className="paramPanelBody">
              {tab === "basic" ? (
                <div className="paramBasicBlock">
                  <div className="paramGridBasic">
                    {basicItems.map((it) => (
                      <div key={it.label} className="paramCard">
                        <div className="paramLabel">{it.label}</div>
                        <div className="paramValue">{it.value}</div>
                      </div>
                    ))}
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
                  <div className="paramCard paramCard--span2">
                    <div className="paramLabel">描述</div>
                    <div className="paramValue paramValue--description">
                      {displayValue(photo.description)}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="paramGridGeo">
                  {geoItems.map((it) => (
                    <div key={it.label} className="paramCard">
                      <div className="paramLabel">{it.label}</div>
                      <div className="paramValue">{it.value}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
