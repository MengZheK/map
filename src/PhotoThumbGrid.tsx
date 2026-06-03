import React from "react";
import type { Photo } from "./photoUtils";
import { photoAltText } from "./photoUtils";
import LazyPhoto from "./LazyPhoto";
import { onActivateKeyDown } from "./keyboardActivate";

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
            onKeyDown={(e) => onActivateKeyDown(e, () => onClickPhoto(p.id))}
            role="button"
            tabIndex={0}
          >
            <div className="thumbFrame">
              <LazyPhoto
                src={p.src}
                alt={photoAltText(p)}
                className="thumbImg"
                variant="thumb"
                fit="cover"
                rootMargin="120px 0px"
                placeholder={false}
                priority={index < 4}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
