import React from "react";
import type { Photo } from "./photoUtils";
import LazyPhoto from "./LazyPhoto";

export default function PhotoWaterfall({
  photos,
  activePhotoId,
  onClickPhoto,
}: {
  photos: Photo[];
  activePhotoId: string | null;
  onClickPhoto: (photoId: string) => void;
}) {
  return (
    <div className="waterfallWrap">
      <div className="waterfall" aria-label="waterfall gallery">
        {photos.map((p, index) => {
          const active = p.id === activePhotoId;
          return (
            <div
              key={p.id}
              className={"waterfallItem " + (active ? "active" : "")}
              onClick={() => onClickPhoto(p.id)}
              role="button"
              tabIndex={0}
            >
              <LazyPhoto
                src={p.src}
                className="waterfallImg"
                variant="grid"
                priority={index < 9}
                fetchPriority={index < 6 ? "high" : undefined}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
