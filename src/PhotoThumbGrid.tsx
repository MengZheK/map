import React from "react";
import type { Photo } from "./photoUtils";

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
      {photos.map((p) => {
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
              <img className="thumbImg" src={p.src} alt="" loading="lazy" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

