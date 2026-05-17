import React from "react";
import type { PhotoImageVariant } from "./imageUrl";
import ProgressiveImage, { type ProgressiveRevealProfile } from "./ProgressiveImage";
import { useInView } from "./useInView";

type LazyPhotoProps = {
  src: string;
  alt?: string;
  className?: string;
  variant?: PhotoImageVariant;
  priority?: boolean;
  fetchPriority?: "high" | "low" | "auto";
  fit?: "intrinsic" | "cover";
  reveal?: ProgressiveRevealProfile;
  revealDelayMs?: number;
};

export default function LazyPhoto({
  src,
  alt = "",
  className,
  variant = "grid",
  priority = false,
  fetchPriority,
  fit = "intrinsic",
  reveal = "default",
  revealDelayMs = 0,
}: LazyPhotoProps) {
  const relaxed = reveal === "relaxed";

  const { ref, inView } = useInView<HTMLDivElement>({
    enabled: !priority,
    rootMargin: relaxed ? "200px 0px" : "520px 0px",
  });

  const loadEnabled = priority || inView;

  return (
    <div ref={ref} className="lazyPhotoWrap">
      <ProgressiveImage
        src={src}
        alt={alt}
        className={className ?? ""}
        variant={variant}
        loadEnabled={loadEnabled}
        fetchPriority={fetchPriority ?? (priority ? "high" : "auto")}
        fit={fit}
        reveal={reveal}
        minRevealMs={relaxed ? 520 : 0}
        revealDelayMs={revealDelayMs}
      />
    </div>
  );
}
