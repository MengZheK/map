import React from "react";
import type { Photo } from "./photoUtils";

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
        {photos.map((p) => {
          const active = p.id === activePhotoId;
          return (
            <div
              key={p.id}
              className={"waterfallItem " + (active ? "active" : "")}
              onClick={() => onClickPhoto(p.id)}
              role="button"
              tabIndex={0}
            >
              <img className="waterfallImg" src={p.src} alt="" loading="lazy" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

