import React from "react";
import { publicUrl } from "./publicUrl";

type BrandMarkProps = {
  size?: number;
  className?: string;
};

/** 站点品牌图标（小太阳，与 favicon 一致） */
export default function BrandMark({ size = 28, className = "" }: BrandMarkProps) {
  return (
    <img
      src={publicUrl("favicon.png")}
      alt=""
      width={size}
      height={size}
      className={"brandMark " + className}
      decoding="async"
      draggable={false}
    />
  );
}
