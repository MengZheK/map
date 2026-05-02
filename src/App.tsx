import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { VisitorLocationProvider } from "./VisitorLocation";
import AlbumPage from "./pages/AlbumPage";
import ContactPage from "./pages/ContactPage";
import MapPage from "./pages/MapPage";

export default function App() {
  return (
    <VisitorLocationProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/album" replace />} />
        <Route path="/album" element={<AlbumPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/contact" element={<ContactPage />} />
      </Routes>
    </VisitorLocationProvider>
  );
}

