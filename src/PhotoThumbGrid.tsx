import React from "react";
import type { Photo } from "./photoUtils";
import LazyPhoto from "./LazyPhoto";

export default function PhotoThumbGrid({
  photos,
  activePhotoId,
  onClickPhoto,
}: {
  photos: Photo[];
  activePhotoId: string | null;
  onClickPhoto: (photoId: string) => void;
}) {
  return (
    <div className="thumbGrid" aria-label="photos">
      {photos.map((p, index) => {
        const active = p.id === activePhotoId;
        return (
          <div
            key={p.id}
            className={"thumbItem " + (active ? "active" : "")}
            onClick={() => onClickPhoto(p.id)}
            role="button"
            tabIndex={0}
          >
            <div className="thumbFrame">
              <LazyPhoto
                src={p.src}
                className="thumbImg"
                variant="thumb"
                priority={index < 6}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
