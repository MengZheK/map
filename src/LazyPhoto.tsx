import React, { useEffect, useState } from "react";
import { photoDisplayUrl, resolvePhotoSrc, type PhotoImageVariant } from "./imageUrl";
import { useInView } from "./useInView";

type LazyPhotoProps = {
  src: string;
  alt?: string;
  className?: string;
  variant?: PhotoImageVariant;
  /** 首屏关键图：立即加载并提高优先级 */
  priority?: boolean;
  fetchPriority?: "high" | "low" | "auto";
};

export default function LazyPhoto({
  src,
  alt = "",
  className,
  variant = "grid",
  priority = false,
  fetchPriority,
}: LazyPhotoProps) {
  const { ref, inView } = useInView<HTMLDivElement>({ enabled: !priority });
  const shouldLoad = priority || inView;

  const fullUrl = resolvePhotoSrc(src);
  const optimizedUrl = photoDisplayUrl(src, variant);
  const [imgSrc, setImgSrc] = useState<string | null>(priority ? optimizedUrl : null);

  useEffect(() => {
    if (shouldLoad && !imgSrc) setImgSrc(optimizedUrl);
  }, [shouldLoad, optimizedUrl, imgSrc]);

  useEffect(() => {
    if (priority) setImgSrc(optimizedUrl);
  }, [optimizedUrl, priority]);

  const onError = () => {
    if (imgSrc && imgSrc !== fullUrl) setImgSrc(fullUrl);
  };

  return (
    <div ref={ref} className="lazyPhotoWrap">
      {imgSrc ? (
        <img
          className={className}
          src={imgSrc}
          alt={alt}
          decoding="async"
          loading={priority ? "eager" : "lazy"}
          fetchPriority={fetchPriority ?? (priority ? "high" : "auto")}
          onError={onError}
        />
      ) : (
        <div className="lazyPhotoSkeleton" aria-hidden />
      )}
    </div>
  );
}
