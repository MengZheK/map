import React from "react";
import type { PhotoImageVariant } from "./imageUrl";
import ProgressiveImage from "./ProgressiveImage";
import { useInView } from "./useInView";

type LazyPhotoProps = {
  src: string;
  alt?: string;
  className?: string;
  variant?: PhotoImageVariant;
  priority?: boolean;
  fetchPriority?: "high" | "low" | "auto";
  fit?: "intrinsic" | "cover";
};

export default function LazyPhoto({
  src,
  alt = "",
  className,
  variant = "grid",
  priority = false,
  fetchPriority,
  fit = "intrinsic",
}: LazyPhotoProps) {
  const { ref, inView } = useInView<HTMLDivElement>({
    enabled: !priority,
    rootMargin: "520px 0px",
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
      />
    </div>
  );
}
