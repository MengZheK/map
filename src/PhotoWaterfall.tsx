import React, { useMemo } from "react";
import type { Photo } from "./photoUtils";
import { photoAltText } from "./photoUtils";
import LazyPhoto from "./LazyPhoto";
import { onActivateKeyDown } from "./keyboardActivate";
import { useAlbumMobile } from "./useAlbumMobile";

function WaterfallItem({
  photo,
  index,
  active,
  onClickPhoto,
}: {
  photo: Photo;
  index: number;
  active: boolean;
  onClickPhoto: (id: string) => void;
}) {
  return (
    <div
      className={"waterfallItem " + (active ? "active" : "")}
      onClick={() => onClickPhoto(photo.id)}
      onKeyDown={(e) => onActivateKeyDown(e, () => onClickPhoto(photo.id))}
      role="button"
      tabIndex={0}
    >
      <LazyPhoto
        src={photo.src}
        alt={photoAltText(photo)}
        className="waterfallImg"
        variant="grid"
        rootMargin="280px 0px"
        priority={index < 6}
        fetchPriority={index < 3 ? "high" : undefined}
      />
    </div>
  );
}

function splitIntoColumns(photos: Photo[]): [Photo[], Photo[]] {
  const left: Photo[] = [];
  const right: Photo[] = [];
  photos.forEach((p, i) => {
    if (i % 2 === 0) left.push(p);
    else right.push(p);
  });
  return [left, right];
}

export default function PhotoWaterfall({
  photos,
  activePhotoId,
  onClickPhoto,
}: {
  photos: Photo[];
  activePhotoId: string | null;
  onClickPhoto: (photoId: string) => void;
}) {
  const isMobile = useAlbumMobile();
  const [leftCol, rightCol] = useMemo(() => splitIntoColumns(photos), [photos]);

  if (isMobile) {
    return (
      <div className="waterfallWrap">
        <div className="waterfall waterfall--split" aria-label="waterfall gallery">
          <div className="waterfallCol">
            {leftCol.map((p, i) => (
              <WaterfallItem
                key={p.id}
                photo={p}
                index={i * 2}
                active={p.id === activePhotoId}
                onClickPhoto={onClickPhoto}
              />
            ))}
          </div>
          <div className="waterfallCol">
            {rightCol.map((p, i) => (
              <WaterfallItem
                key={p.id}
                photo={p}
                index={i * 2 + 1}
                active={p.id === activePhotoId}
                onClickPhoto={onClickPhoto}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="waterfallWrap">
      <div className="waterfall" aria-label="waterfall gallery">
        {photos.map((p, index) => (
          <WaterfallItem
            key={p.id}
            photo={p}
            index={index}
            active={p.id === activePhotoId}
            onClickPhoto={onClickPhoto}
          />
        ))}
      </div>
    </div>
  );
}
