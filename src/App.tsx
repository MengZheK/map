import React, { Suspense, lazy } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { VisitorLocationProvider } from "./VisitorLocation";
import { PhotosProvider } from "./PhotosProvider";
import PageLoader from "./PageLoader";
import AlbumPage from "./pages/AlbumPage";
import { prefetchMapPageWhenIdle, scheduleMapPagePrefetch } from "./prefetchMapPage";
import { recordSiteVisit } from "./visitStats";

const MapPage = lazy(() => import(/* @vitePrefetch */ "./pages/MapPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));

function RouteSuspenseFallback() {
  const { pathname } = useLocation();
  const message = pathname.startsWith("/map") ? "地图加载中…" : "加载中…";
  return <PageLoader message={message} />;
}

export default function App() {
  React.useEffect(() => {
    scheduleMapPagePrefetch();
    prefetchMapPageWhenIdle();
    void recordSiteVisit();
  }, []);

  return (
    <PhotosProvider>
      <VisitorLocationProvider>
        <Suspense fallback={<RouteSuspenseFallback />}>
          <Routes>
            <Route path="/" element={<Navigate to="/album" replace />} />
            <Route path="/album" element={<AlbumPage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/contact" element={<ContactPage />} />
          </Routes>
        </Suspense>
      </VisitorLocationProvider>
    </PhotosProvider>
  );
}
