import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import usePhotos from "../usePhotos";
import type { Photo } from "../photoUtils";
import { hasGps } from "../photoUtils";
import { haversineKm } from "../mapGeoCircle";
import { getRefPointForDistance, useVisitorLocation } from "../VisitorLocation";
import PhotoDetailModal from "../PhotoDetailModal";
import BrandMark from "../BrandMark";
import PhotoWaterfall from "../PhotoWaterfall";
import ViewModeToggle from "../ViewModeToggle";
import PageLoader from "../PageLoader";
import { useAlbumMobile } from "../useAlbumMobile";
import { scheduleMapPagePrefetch } from "../prefetchMapPage";

const ALBUM_NAV_TABS = [
  { id: "latest", label: "最新" },
  { id: "browse", label: "随览" },
  { id: "nearby", label: "附近" },
  { id: "distant", label: "远方" },
] as const;

type AlbumNavId = (typeof ALBUM_NAV_TABS)[number]["id"];

const NEAR_KM = 1000;
const SCROLL_COMPACT_PX = 56;
const MOBILE_HEADER_HIDE_BRAND_PX = 36;

function filterPhotosForNav(
  photos: Photo[],
  nav: AlbumNavId,
  refHome: { lat: number; lon: number },
): Photo[] {
  const list = [...photos];
  switch (nav) {
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

function useAlbumLayout() {
  const [scrolled, setScrolled] = useState(false);
  const isMobile = useAlbumMobile();
  const [mobileScrollCompact, setMobileScrollCompact] = useState(false);

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
      <BrandMark size={28} className="albumBrandMark" />
      <span className="albumBrandWordmark brandWordmark">Hayato Photography</span>
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
  const { photos, loading, error } = usePhotos();
  const [activeNav, setActiveNav] = useState<AlbumNavId>("latest");
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const { scrolled, isMobile, mobileScrollCompact } = useAlbumLayout();
  const visitorLoc = useVisitorLocation();
  const refHomeForDistance = useMemo(() => getRefPointForDistance(visitorLoc), [visitorLoc]);

  const displayedPhotos = useMemo(
    () => filterPhotosForNav(photos, activeNav, refHomeForDistance),
    [photos, activeNav, refHomeForDistance],
  );

  useEffect(() => {
    scheduleMapPagePrefetch();
  }, []);

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
    return <PageLoader />;
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
