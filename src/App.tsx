import React, { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { VisitorLocationProvider } from "./VisitorLocation";
import { PhotosProvider } from "./PhotosProvider";
import PageLoader from "./PageLoader";
import AlbumPage from "./pages/AlbumPage";

const MapPage = lazy(() => import("./pages/MapPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));

export default function App() {
  return (
    <PhotosProvider>
      <VisitorLocationProvider>
        <Suspense fallback={<PageLoader />}>
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
