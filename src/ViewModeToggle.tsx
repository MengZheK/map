import React, { useEffect } from "react";
import { NavLink } from "react-router-dom";
import { prefetchMapPage } from "./prefetchMapPage";

/** Lucide-style「图库」描边图标（与胶囊 currentColor 一致） */
function IconAlbum({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 22H4a2 2 0 0 1-2-2V6" />
      <path d="m22 13-1.296-1.296a2.41 2.41 0 0 0-3.408 0L11 18" />
      <circle cx="12" cy="8" r="2" />
      <rect width="16" height="16" x="6" y="2" rx="2" ry="2" />
    </svg>
  );
}

/** Lucide-style「地图」描边图标 */
function IconMap({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-4.212 2.106a1 1 0 0 1-.894 0L2.553 18.106a1 1 0 0 1-.553-.894V4.619a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0l4.212 2.106a2 2 0 0 0 1.788 0l4.212-2.106z" />
      <path d="M15 5.764v15" />
      <path d="M9 3.236v15" />
    </svg>
  );
}

const prefetchMapHandlers = {
  onMouseEnter: prefetchMapPage,
  onFocus: prefetchMapPage,
  onTouchStart: prefetchMapPage,
};

/**
 * 「相册 | 地图」磨砂玻璃胶囊分段控件
 */
export default function ViewModeToggle() {
  useEffect(() => {
    prefetchMapPage();
  }, []);

  return (
    <nav className="viewModeToggle" aria-label="视图切换">
      <NavLink
        to="/album"
        end
        className={({ isActive }) =>
          "viewModeToggle__seg " + (isActive ? "viewModeToggle__seg--active" : "")
        }
      >
        <IconAlbum />
        <span>相册</span>
      </NavLink>
      <NavLink
        to="/map"
        className={({ isActive }) =>
          "viewModeToggle__seg " + (isActive ? "viewModeToggle__seg--active" : "")
        }
        {...prefetchMapHandlers}
      >
        <IconMap />
        <span>地图</span>
      </NavLink>
    </nav>
  );
}
