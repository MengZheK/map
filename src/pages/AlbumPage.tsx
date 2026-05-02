import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import usePhotos from "../usePhotos";
import type { Photo } from "../photoUtils";
import { hasGps } from "../photoUtils";
import { getRefPointForDistance, useVisitorLocation } from "../VisitorLocation";
import PhotoDetailModal from "../PhotoDetailModal";
import PhotoWaterfall from "../PhotoWaterfall";
import ViewModeToggle from "../ViewModeToggle";

const ALBUM_NAV_TABS = [
  { id: "featured", label: "精选" },
  { id: "latest", label: "最新" },
  { id: "browse", label: "随览" },
  { id: "nearby", label: "附近" },
  { id: "distant", label: "远方" },
] as const;

type AlbumNavId = (typeof ALBUM_NAV_TABS)[number]["id"];

const NEAR_KM = 1000;
const SCROLL_COMPACT_PX = 56;

function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
}

function filterPhotosForNav(
  photos: Photo[],
  nav: AlbumNavId,
  refHome: { lat: number; lon: number },
): Photo[] {
  const list = [...photos];
  switch (nav) {
    case "featured":
      return list;
    case "latest":
      return list.sort((a, b) => b.id.localeCompare(a.id, undefined, { numeric: true }));
    case "browse": {
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }
      return list;
    }
    case "nearby":
      return list
        .filter((p) => hasGps(p))
        .filter((p) => haversineKm(refHome, { lat: p.lat, lon: p.lon }) < NEAR_KM);
    case "distant":
      return list
        .filter((p) => hasGps(p))
        .filter((p) => haversineKm(refHome, { lat: p.lat, lon: p.lon }) >= NEAR_KM);
    default:
      return list;
  }
}

const MOBILE_HEADER_HIDE_BRAND_PX = 36;

function useAlbumLayout() {
  const [scrolled, setScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileScrollCompact, setMobileScrollCompact] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 820px)");
    const onResize = () => {
      setIsMobile(mq.matches);
    };
    onResize();
    mq.addEventListener("change", onResize);
    return () => mq.removeEventListener("change", onResize);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setScrolled(false);
      return;
    }
    const onScroll = () => {
      setScrolled(window.scrollY > SCROLL_COMPACT_PX);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isMobile]);

  useEffect(() => {
    if (!isMobile) {
      setMobileScrollCompact(false);
      return;
    }
    const onScroll = () => {
      setMobileScrollCompact(window.scrollY > MOBILE_HEADER_HIDE_BRAND_PX);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isMobile]);

  return { scrolled, isMobile, mobileScrollCompact };
}

function AlbumBrand({ mobile }: { mobile?: boolean }) {
  return (
    <Link to="/album" className={"albumBrand " + (mobile ? "albumBrand--mobile" : "")}>
      <svg className="albumBrandAperture" width="28" height="28" viewBox="0 0 48 48" aria-hidden>
        <circle cx="24" cy="24" r="22" fill="none" stroke="currentColor" strokeWidth="1.25" opacity="0.45" />
        <path
          fill="currentColor"
          d="M24 8 38 32H10L24 8zm0 8.5L15 30h18L24 16.5z"
          opacity="0.9"
        />
        <circle cx="24" cy="26" r="5" fill="none" stroke="currentColor" strokeWidth="1.2" />
      </svg>
      <span className="albumBrandWordmark">Hayato Photography</span>
    </Link>
  );
}

function AlbumContactLink({ className }: { className?: string }) {
  return (
    <Link to="/contact" className={"albumContactLink " + (className ?? "")}>
      联系作者
    </Link>
  );
}

export default function AlbumPage() {
  const { photos, loading, error } = usePhotos("/photos/photos.json");
  const [activeNav, setActiveNav] = useState<AlbumNavId>("featured");
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const { scrolled, isMobile, mobileScrollCompact } = useAlbumLayout();
  const visitorLoc = useVisitorLocation();
  const refHomeForDistance = useMemo(() => getRefPointForDistance(visitorLoc), [visitorLoc]);

  const displayedPhotos = useMemo(
    () => filterPhotosForNav(photos, activeNav, refHomeForDistance),
    [photos, activeNav, refHomeForDistance],
  );

  const navTabs = (
    <nav className="albumNavTabs" aria-label="相册分类">
      {ALBUM_NAV_TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          className={"albumNavTab " + (activeNav === t.id ? "albumNavTab--active" : "")}
          onClick={() => setActiveNav(t.id)}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );

  if (loading) {
    return (
      <div className="page" style={{ display: "grid", placeItems: "center" }}>
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="page" style={{ display: "grid", placeItems: "center" }}>
        <div style={{ padding: 20, background: "#fff", borderRadius: 12 }}>{error}</div>
      </div>
    );
  }

  const pageMods =
    "albumPage " +
    (isMobile ? "albumPage--mobile " : "") +
    (isMobile && mobileScrollCompact ? "albumPage--mobileCompact " : "") +
    (!isMobile && scrolled ? "albumPage--scrolled " : "");

  return (
    <div className={"page " + pageMods.trim()}>
      <header className={"albumTopBar " + (isMobile ? "albumTopBar--mobile" : "")}>
        {!isMobile ? (
          <>
            {!scrolled ? (
              <div className="albumHeaderTier albumHeaderTier--brand">
                <div className="albumLayoutInner albumHeaderTierInner albumHeaderTierInner--brand">
                  <AlbumBrand />
                  <div className="albumHeaderBrandRight">
                    <AlbumContactLink />
                    <ViewModeToggle />
                  </div>
                </div>
              </div>
            ) : null}

            <div className="albumHeaderTier albumHeaderTier--nav">
              <div className="albumLayoutInner albumHeaderTierInner albumHeaderTierInner--nav">
                {navTabs}
                {scrolled ? (
                  <div className="albumHeaderNavRight">
                    <AlbumContactLink />
                    <ViewModeToggle />
                  </div>
                ) : null}
              </div>
            </div>
          </>
        ) : (
          <div className="albumHeaderTier albumHeaderTier--mobile">
            <div className="albumLayoutInner albumMobileHeaderInner">
              {!mobileScrollCompact ? (
                <div className="albumMobileBrandBlock">
                  <AlbumBrand mobile />
                </div>
              ) : null}
              <div
                className={
                  "albumMobileTabsWrap" +
                  (mobileScrollCompact ? " albumMobileTabsWrap--tabsOnly" : "")
                }
              >
                {navTabs}
              </div>
            </div>
          </div>
        )}
      </header>

      <div className="albumContentWrap">
        <div className="albumLayoutInner albumMainInner">
          <PhotoWaterfall
            photos={displayedPhotos}
            activePhotoId={activePhotoId}
            onClickPhoto={(photoId) => {
              setActivePhotoId(photoId);
              setDetailOpen(true);
            }}
          />
        </div>
      </div>

      {isMobile ? (
        <div className="albumMobileDock" role="navigation" aria-label="视图与联系">
          <AlbumContactLink className="albumMobileDockContact" />
          <ViewModeToggle />
        </div>
      ) : null}

      {activePhotoId && detailOpen ? (
        <PhotoDetailModal
          photos={displayedPhotos}
          activePhotoId={activePhotoId}
          onActivePhotoIdChange={setActivePhotoId}
          onClose={() => {
            setDetailOpen(false);
            setActivePhotoId(null);
          }}
        />
      ) : null}
    </div>
  );
}
