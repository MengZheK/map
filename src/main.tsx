import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "maplibre-gl/dist/maplibre-gl.css";
import "./styles.css";

const routerBasename =
  import.meta.env.BASE_URL === "/" ? undefined : import.meta.env.BASE_URL.replace(/\/$/, "");

function registerPhotoCacheWorker() {
  if (!("serviceWorker" in navigator)) return;
  const swUrl = new URL("sw.js", window.location.origin + import.meta.env.BASE_URL).href;
  navigator.serviceWorker.register(swUrl).catch(() => {
    /* 离线或本地 file:// 时忽略 */
  });
}

registerPhotoCacheWorker();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter basename={routerBasename}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
