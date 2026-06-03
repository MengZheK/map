import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "../styles/map-chrome.css";
import "../styles/map-panel.css";
import "../styles/gallery.css";
import usePhotos from "../usePhotos";
import useCategories from "../useCategories";
import { categoryTitleForId } from "../categoryLabels";
import type { Photo } from "../photoUtils";
import { BRUSH_RADIUS_PX, filterPhotosInPixelCircle } from "../mapBrush";
import {
  circlePolygonGeoJSON,
  filterPhotosInGeoCircle,
  pixelRadiusToMeters,
} from "../mapGeoCircle";
import {
  buildYearToSlotMap,
  collectTakenYears,
  formatShortPlaceName,
  getCityGroupKey,
  hasGps,
  makeLocationKey,
  markerColorIdxForPhotos,
  MAP_MARKER_COLORS,
  photoAltText,
} from "../photoUtils";
import { mapSelectionAreaTitle } from "../mapSelectionAreaTitle";
import PhotoThumbGrid from "../PhotoThumbGrid";
import PhotoDetailModal from "../PhotoDetailModal";
import LazyPhoto from "../LazyPhoto";
import MapNotice from "../MapNotice";
import PageLoader from "../PageLoader";
import ViewModeToggle from "../ViewModeToggle";
import { onActivateKeyDown } from "../keyboardActivate";
import { getRasterBasemapStyle } from "../mapBasemapStyle";
import { useVisitorLocation, useVisitorLocationRefresh } from "../VisitorLocation";

type Category = { id: string; title: string };

type Layer =
  | { kind: "root" }
  | {
      kind: "placePhotos";
      categoryId: string | null;
      locationKey: string | null;
      cityGroupKey: string | null;
    };

const ZOOM_STEP_DURATION_MS = 320;

/** MapLibre 在宽屏下会为 compact 控件默认加上 maplibregl-compact-show（展开文案）；折叠为仅显示信息图标 */
function collapseMaplibreAttribution(map: maplibregl.Map) {
  map.getContainer().querySelectorAll(".maplibregl-ctrl-attrib").forEach((el) => {
    el.classList.remove("maplibregl-compact-show");
    if (el instanceof HTMLDetailsElement) {
      el.removeAttribute("open");
    }
  });
}

type CityGroupRow = {
  cityGroupKey: string;
  label: string;
  photos: Photo[];
  cover: Photo;
  centerLat: number;
  centerLon: number;
};

function buildCityGroupsForCategory(photos: Photo[], categoryId: string): CityGroupRow[] {
  const list = photos.filter((p) => hasGps(p) && p.categoryId === categoryId);
  const m = new Map<string, Photo[]>();
  for (const p of list) {
    const k = getCityGroupKey(p);
    const arr = m.get(k) ?? [];
    arr.push(p);
    m.set(k, arr);
  }
  return Array.from(m.entries())
    .map(([cityGroupKey, plist]) => {
      const label = formatShortPlaceName(plist[0]);
      const centerLat = plist.reduce((s, p) => s + p.lat, 0) / plist.length;
      const centerLon = plist.reduce((s, p) => s + p.lon, 0) / plist.length;
      return { cityGroupKey, label, photos: plist, cover: plist[0], centerLat, centerLon };
    })
    .sort((a, b) => b.photos.length - a.photos.length);
}

export default function MapPage() {
  const { photos, loading, error } = usePhotos();
  const { categories: categoryDefs } = useCategories();
  const visitorLoc = useVisitorLocation();
  const refreshVisitorLocation = useVisitorLocationRefresh();
  const visitorLocRef = useRef(visitorLoc);
  visitorLocRef.current = visitorLoc;
  /**
   * 用户点击定位后为 true；已有坐标时会立刻 flyTo 并清掉。
   * 若当时尚在 loading，等 visitorLoc 变为 ok 后再飞（避免仅依赖 GPS 回调更新导致 effect 不跑）。
   */
  const pendingLocateFlyRef = useRef(false);

  const [layerStack, setLayerStack] = useState<Layer[]>([{ kind: "root" }]);
  const topLayer = layerStack[layerStack.length - 1];

  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  /** 左侧悬浮栏展开/折叠（参考图顶部 chevron） */
  const [sidePanelExpanded, setSidePanelExpanded] = useState(true);

  /** 跟随鼠标的预览圆（屏幕像素，DOM 直写避免 mousemove 触发整页重绘） */
  const brushCircleRef = useRef<HTMLDivElement | null>(null);
  /** 当前预览圆内是否有可展示照片（无则灰圈、点击不生效） */
  const [followerPickValid, setFollowerPickValid] = useState(true);
  /** 点击铆钉：地理范围固定，随地图缩放变化 */
  const [anchorGeo, setAnchorGeo] = useState<{
    lng: number;
    lat: number;
    radiusMeters: number;
  } | null>(null);
  /** 铆钉选区时地图缩放，用于标题层级（市 / 省 / 国） */
  const [anchorViewZoom, setAnchorViewZoom] = useState(3);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapNotice, setMapNotice] = useState<string | null>(null);
  const dismissMapNotice = useCallback(() => setMapNotice(null), []);

  const flyToLngLatRef = useRef<(lng: number, lat: number) => void>(() => {});
  flyToLngLatRef.current = (lng: number, lat: number) => {
    const map = mapRef.current;
    if (!map?.loaded()) return;
    map.flyTo({
      center: [lng, lat],
      zoom: 11,
      duration: 8000,
      essential: true,
    });
  };

  const detailOpenRef = useRef(false);
  detailOpenRef.current = detailOpen;

  const gpsPhotosForMapRef = useRef<Photo[]>([]);
  const followerScreenPointRef = useRef<{ x: number; y: number } | null>(null);
  const followerPickValidRef = useRef(true);
  const anchorGeoRef = useRef<typeof anchorGeo>(null);
  const moveRafRef = useRef<number | null>(null);
  const pendingMovePtRef = useRef<{ x: number; y: number } | null>(null);
  const cityGroupsCacheRef = useRef(new Map<string, CityGroupRow[]>());
  const photosForCityGroupsRef = useRef(photos);

  anchorGeoRef.current = anchorGeo;
  if (photosForCityGroupsRef.current !== photos) {
    photosForCityGroupsRef.current = photos;
    cityGroupsCacheRef.current.clear();
  }

  const getCityGroupsForCategory = useCallback(
    (categoryId: string) => {
      let groups = cityGroupsCacheRef.current.get(categoryId);
      if (!groups) {
        groups = buildCityGroupsForCategory(photos, categoryId);
        cityGroupsCacheRef.current.set(categoryId, groups);
      }
      return groups;
    },
    [photos],
  );

  const activeCategoryId: string | null =
    topLayer.kind === "placePhotos" ? topLayer.categoryId : null;

  const categoryList: Category[] = useMemo(() => {
    const idsInPhotos = new Set<string>();
    for (const p of photos) {
      if (p.categoryId) idsInPhotos.add(p.categoryId);
    }

    const orderedFromFile = categoryDefs.map((c) => c.id).filter((id) => idsInPhotos.has(id));
    const extraIds = [...idsInPhotos].filter((id) => !orderedFromFile.includes(id)).sort();

    return [...orderedFromFile, ...extraIds].map((id) => ({
      id,
      title: categoryTitleForId(id, categoryDefs),
    }));
  }, [photos, categoryDefs]);

  const gpsPhotosForMap = useMemo(() => {
    const list = photos.filter((p) => hasGps(p));
    if (!activeCategoryId) return list;
    return list.filter((p) => p.categoryId === activeCategoryId);
  }, [photos, activeCategoryId]);

  gpsPhotosForMapRef.current = gpsPhotosForMap;

  const brushPhotos = useMemo(() => {
    if (!anchorGeo) return [];
    return filterPhotosInGeoCircle(
      gpsPhotosForMap,
      { lon: anchorGeo.lng, lat: anchorGeo.lat },
      anchorGeo.radiusMeters,
    );
  }, [gpsPhotosForMap, anchorGeo]);

  const anchorCircleGeo = useMemo(() => {
    if (!anchorGeo) {
      return { type: "FeatureCollection" as const, features: [] };
    }
    return {
      type: "FeatureCollection" as const,
      features: [
        circlePolygonGeoJSON(anchorGeo.lng, anchorGeo.lat, anchorGeo.radiusMeters),
      ],
    };
  }, [anchorGeo]);

  const yearToSlotForMap = useMemo(() => {
    return buildYearToSlotMap(collectTakenYears(gpsPhotosForMap));
  }, [gpsPhotosForMap]);

  /** 每个带 GPS 的照片一个点，落在该照片自身坐标上（非聚合中心点） */
  const geojsonLocations = useMemo(() => {
    return {
      type: "FeatureCollection",
      features: gpsPhotosForMap.map((p) => {
        const locationKey = makeLocationKey(p) ?? "";
        return {
          type: "Feature" as const,
          properties: {
            locationKey,
            cityGroupKey: getCityGroupKey(p),
            photoId: p.id,
            colorIdx: markerColorIdxForPhotos([p], yearToSlotForMap),
          },
          geometry: { type: "Point" as const, coordinates: [p.lon, p.lat] },
        };
      }),
    };
  }, [gpsPhotosForMap, yearToSlotForMap]);

  /** 浏览器定位得到的访客位置（无权限则空集合） */
  const visitorLocationGeo = useMemo(() => {
    if (visitorLoc.status !== "ok") {
      return { type: "FeatureCollection" as const, features: [] };
    }
    return {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          properties: {},
          geometry: {
            type: "Point" as const,
            coordinates: [visitorLoc.lon, visitorLoc.lat],
          },
        },
      ],
    };
  }, [visitorLoc]);

  const photosInCurrentPlace = useMemo(() => {
    if (topLayer.kind !== "placePhotos") return [];
    const cat = topLayer.categoryId;
    const base = photos.filter((p) => hasGps(p)).filter((p) => (cat ? p.categoryId === cat : true));
    if (topLayer.cityGroupKey) {
      return base.filter((p) => getCityGroupKey(p) === topLayer.cityGroupKey);
    }
    if (topLayer.locationKey) {
      return base.filter((p) => makeLocationKey(p) === topLayer.locationKey);
    }
    return [];
  }, [photos, topLayer]);

  const titleForHeader = useMemo(() => {
    if (anchorGeo) {
      const area = mapSelectionAreaTitle(brushPhotos, anchorViewZoom);
      return `${area} · ${brushPhotos.length} 张`;
    }
    if (topLayer.kind === "root") return "";
    if (topLayer.kind === "placePhotos" && topLayer.cityGroupKey) {
      const one = photos.find((p) => hasGps(p) && getCityGroupKey(p) === topLayer.cityGroupKey);
      return one ? formatShortPlaceName(one) : "地点相册";
    }
    if (topLayer.kind === "placePhotos" && topLayer.locationKey) {
      const group = photos.filter((p) => hasGps(p) && makeLocationKey(p) === topLayer.locationKey);
      const name = group.find((p) => p.locationName)?.locationName;
      return name ?? "未命名位置";
    }
    return "";
  }, [photos, topLayer, anchorGeo, brushPhotos, anchorViewZoom]);

  const detailModalPhotos = useMemo(() => {
    if (anchorGeo) return brushPhotos;
    if (topLayer.kind === "placePhotos") return photosInCurrentPlace;
    return [];
  }, [anchorGeo, topLayer.kind, photosInCurrentPlace, brushPhotos]);

  useEffect(() => {
    if (loading || error) return;
    if (!mapContainerRef.current) return;
    if (mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: getRasterBasemapStyle(),
      center: [105, 35],
      zoom: 3,
      attributionControl: false,
    });

    mapRef.current = map;

    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

    map.on("error", (e) => {
      console.error("[maplibre]", e.error);
      setMapNotice("地图瓦片加载失败，请检查网络或稍后重试");
    });

    map.on("load", () => {
      map.addSource("brush-anchor-source", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "brush-anchor-fill",
        type: "fill",
        source: "brush-anchor-source",
        paint: {
          "fill-color": "rgba(46, 134, 255, 0.15)",
        },
      });

      map.addLayer({
        id: "brush-anchor-line",
        type: "line",
        source: "brush-anchor-source",
        paint: {
          "line-color": "rgba(46, 134, 255, 0.78)",
          "line-width": 2,
        },
      });

      map.addSource("locations-source", {
        type: "geojson",
        data: geojsonLocations,
      });

      map.addLayer({
        id: "locations-layer",
        type: "circle",
        source: "locations-source",
        paint: {
          "circle-radius": 5,
          "circle-color": [
            "match",
            ["get", "colorIdx"],
            0,
            MAP_MARKER_COLORS[0],
            1,
            MAP_MARKER_COLORS[1],
            2,
            MAP_MARKER_COLORS[2],
            3,
            MAP_MARKER_COLORS[3],
            MAP_MARKER_COLORS[4],
          ],
          "circle-stroke-width": 1,
          "circle-stroke-color": "#ffffff",
        },
      });

      map.addLayer({
        id: "locations-selected-layer",
        type: "circle",
        source: "locations-source",
        filter: ["==", ["get", "photoId"], "__none__"],
        paint: {
          "circle-radius": 5,
          "circle-color": "#FF3B30",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });

      map.addSource("visitor-location-source", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "visitor-location-pulse",
        type: "circle",
        source: "visitor-location-source",
        paint: {
          "circle-radius": 18,
          "circle-color": "rgba(16, 185, 129, 0.22)",
          "circle-blur": 0.35,
        },
      });
      map.addLayer({
        id: "visitor-location-dot",
        type: "circle",
        source: "visitor-location-source",
        paint: {
          "circle-radius": 7,
          "circle-color": "#10B981",
          "circle-stroke-width": 2.5,
          "circle-stroke-color": "#ffffff",
        },
      });

      setMapLoaded(true);
      queueMicrotask(() => collapseMaplibreAttribution(map));
    });

    map.once("idle", () => {
      collapseMaplibreAttribution(map);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // 首屏在 photos 请求完成前不渲染地图容器，若只在 [] 里初始化会永远错过 ref，需等 loading 结束。
  }, [loading, error]);

  // Update map data when filters / category changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const src = map.getSource("locations-source") as maplibregl.GeoJSONSource | undefined;
    if (src) src.setData(geojsonLocations as any);
  }, [geojsonLocations, mapLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const src = map.getSource("brush-anchor-source") as maplibregl.GeoJSONSource | undefined;
    if (src) src.setData(anchorCircleGeo as any);
  }, [anchorCircleGeo, mapLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const src = map.getSource("visitor-location-source") as maplibregl.GeoJSONSource | undefined;
    if (src) src.setData(visitorLocationGeo as any);
  }, [visitorLocationGeo, mapLoaded]);

  useEffect(() => {
    if (!pendingLocateFlyRef.current) return;
    if (visitorLoc.status === "ok") {
      const map = mapRef.current;
      if (!map?.loaded()) return;
      pendingLocateFlyRef.current = false;
      map.flyTo({
        center: [visitorLoc.lon, visitorLoc.lat],
        zoom: Math.max(map.getZoom(), 10),
        duration: 1600,
        essential: true,
      });
      return;
    }
    if (visitorLoc.status !== "loading" && visitorLoc.status !== "idle") {
      if (pendingLocateFlyRef.current) {
        if (visitorLoc.status === "denied") {
          setMapNotice("定位权限被拒绝，请在浏览器设置中允许定位");
        } else if (visitorLoc.status === "unavailable") {
          setMapNotice("当前设备不支持定位");
        } else if (visitorLoc.status === "error") {
          setMapNotice("定位失败，请稍后重试");
        }
      }
      pendingLocateFlyRef.current = false;
    }
  }, [visitorLoc, mapLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    if (!anchorGeo || brushPhotos.length === 0) {
      map.setFilter("locations-selected-layer", ["==", ["get", "photoId"], "__none__"]);
      return;
    }
    map.setFilter("locations-selected-layer", [
      "in",
      ["get", "photoId"],
      ["literal", brushPhotos.map((p) => p.id)],
    ]);
  }, [brushPhotos, anchorGeo, mapLoaded]);

  /** 预览圆跟随鼠标；无照片区域预览为灰；点击仅在圈内≥1张照片时铆钉 */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const moveBrushCircle = (pt: { x: number; y: number }) => {
      const el = brushCircleRef.current;
      if (!el) return;
      el.style.display = "block";
      el.style.left = `${pt.x - BRUSH_RADIUS_PX}px`;
      el.style.top = `${pt.y - BRUSH_RADIUS_PX}px`;
    };

    const refreshPreviewAt = (pt: { x: number; y: number }) => {
      const count = filterPhotosInPixelCircle(
        map,
        gpsPhotosForMapRef.current,
        pt,
        BRUSH_RADIUS_PX,
      ).length;
      const valid = count > 0;
      if (valid !== followerPickValidRef.current) {
        followerPickValidRef.current = valid;
        setFollowerPickValid(valid);
      }
      const gray = !!anchorGeoRef.current || !valid;
      brushCircleRef.current?.classList.toggle("mapBrushCircle--followGray", gray);
    };

    const onMove = (e: maplibregl.MapMouseEvent) => {
      if (detailOpenRef.current) return;
      const pt = { x: e.point.x, y: e.point.y };
      followerScreenPointRef.current = pt;
      pendingMovePtRef.current = pt;
      moveBrushCircle(pt);
      if (moveRafRef.current != null) return;
      moveRafRef.current = window.requestAnimationFrame(() => {
        moveRafRef.current = null;
        const pending = pendingMovePtRef.current;
        if (pending) refreshPreviewAt(pending);
      });
    };

    const onClick = (e: maplibregl.MapMouseEvent) => {
      if (detailOpenRef.current) return;
      const pt = { x: e.point.x, y: e.point.y };
      const ll = e.lngLat;
      const picked = filterPhotosInPixelCircle(
        map,
        gpsPhotosForMapRef.current,
        pt,
        BRUSH_RADIUS_PX,
      );
      if (picked.length === 0) return;
      const radiusMeters = pixelRadiusToMeters(map, pt, BRUSH_RADIUS_PX);
      setAnchorViewZoom(map.getZoom());
      setAnchorGeo({ lng: ll.lng, lat: ll.lat, radiusMeters });
    };

    const onMapViewChange = () => {
      const pt = followerScreenPointRef.current;
      if (!pt || detailOpenRef.current) return;
      refreshPreviewAt(pt);
    };

    map.on("mousemove", onMove);
    map.on("click", onClick);
    map.on("zoomend", onMapViewChange);
    map.on("moveend", onMapViewChange);

    return () => {
      map.off("mousemove", onMove);
      map.off("click", onClick);
      map.off("zoomend", onMapViewChange);
      map.off("moveend", onMapViewChange);
      if (moveRafRef.current != null) {
        window.cancelAnimationFrame(moveRafRef.current);
        moveRafRef.current = null;
      }
    };
  }, [mapLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.loaded()) return;
    const c = map.getCanvas();
    if (detailOpen || anchorGeo) {
      c.style.cursor = "";
      return;
    }
    c.style.cursor = followerPickValid ? "crosshair" : "not-allowed";
  }, [followerPickValid, anchorGeo, detailOpen, mapLoaded]);

  useEffect(() => {
    const gray = !!anchorGeo || !followerPickValidRef.current;
    brushCircleRef.current?.classList.toggle("mapBrushCircle--followGray", gray);
  }, [anchorGeo, followerPickValid]);

  useEffect(() => {
    // If user goes back to root, close detail modal.
    setDetailOpen(false);
    setActivePhotoId(null);
  }, [topLayer.kind]);

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

  const onBack = () => {
    if (anchorGeo) {
      setAnchorGeo(null);
      setDetailOpen(false);
      setActivePhotoId(null);
      setAnchorViewZoom(3);
      return;
    }
    setLayerStack((prev) => {
      if (prev.length <= 1) return prev;
      return prev.slice(0, prev.length - 1);
    });
    setDetailOpen(false);
    setActivePhotoId(null);
  };

  const onMapZoomIn = () => {
    const map = mapRef.current;
    if (!map?.loaded()) return;
    map.zoomIn({ duration: ZOOM_STEP_DURATION_MS });
  };

  const onMapZoomOut = () => {
    const map = mapRef.current;
    if (!map?.loaded()) return;
    map.zoomOut({ duration: ZOOM_STEP_DURATION_MS });
  };

  return (
    <div className="page" style={{ position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0 }}>
        <div ref={mapContainerRef} style={{ position: "absolute", inset: 0 }} />
        <div
          ref={brushCircleRef}
          className="mapBrushCircle mapBrushCircle--followGray"
          style={{
            display: "none",
            position: "absolute",
            left: 0,
            top: 0,
            width: BRUSH_RADIUS_PX * 2,
            height: BRUSH_RADIUS_PX * 2,
            pointerEvents: "none",
          }}
          aria-hidden
        />
      </div>

      <MapNotice message={mapNotice} onDismiss={dismissMapNotice} />

      {/* 右上角：模式切换 + 缩放 */}
      <div className="mapTopRightStack">
        <ViewModeToggle />
        <div className="mapZoomControls" role="group" aria-label="地图缩放与定位">
          <button
            type="button"
            className="mapZoomBtn mapZoomBtn--locate"
            onClick={() => {
              pendingLocateFlyRef.current = true;
              refreshVisitorLocation();
              const v = visitorLocRef.current;
              const map = mapRef.current;
              if (v.status === "ok" && map?.loaded()) {
                map.flyTo({
                  center: [v.lon, v.lat],
                  zoom: Math.max(map.getZoom(), 10),
                  duration: 1600,
                  essential: true,
                });
                pendingLocateFlyRef.current = false;
              }
            }}
            aria-label="定位到当前位置"
            title="飞到当前定位；并重新获取 GPS"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
              <path
                d="M12 3v3m0 15v3M3 12h3m15 0h3"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <button type="button" className="mapZoomBtn" onClick={onMapZoomIn} aria-label="放大">
            +
          </button>
          <button type="button" className="mapZoomBtn" onClick={onMapZoomOut} aria-label="缩小">
            −
          </button>
        </div>
      </div>

      <div
        className={"leftPanel " + (!sidePanelExpanded ? "leftPanel--collapsed" : "")}
        style={{ zIndex: 4 }}
      >
        <button
          type="button"
          className="leftPanelFoldBtn"
          onClick={() => setSidePanelExpanded((v) => !v)}
          aria-expanded={sidePanelExpanded}
          aria-label={sidePanelExpanded ? "折叠侧栏" : "展开侧栏"}
        >
          <span className="leftPanelFoldIcon" aria-hidden>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M6 9l6 6 6-6"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </button>

        <div className="leftPanelMain">
          {topLayer.kind !== "root" || anchorGeo ? (
            <div className="leftPanelHeader">
              <button type="button" className="backBtn" onClick={onBack} aria-label="返回">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M15 18l-6-6 6-6"
                    stroke="currentColor"
                    strokeWidth="2.15"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <div className="leftPanelTitle">{titleForHeader}</div>
              <div style={{ width: 34 }} />
            </div>
          ) : null}

          <div className="leftPanelBody">
            {anchorGeo ? (
              <>
                <PhotoThumbGrid
                  photos={brushPhotos}
                  activePhotoId={activePhotoId}
                  onClickPhoto={(photoId) => {
                    setActivePhotoId(photoId);
                    setDetailOpen(true);
                  }}
                />
              </>
            ) : (
              <>
                {topLayer.kind === "root" ? (
                  <div className="mapNavRoot">
                    {categoryList.map((c) => {
                      const groups = getCityGroupsForCategory(c.id);
                      if (groups.length === 0) return null;
                      return (
                        <section key={c.id} className="mapNavSection">
                          <h2 className="mapNavSectionTitle">{c.title}</h2>
                          <div className="placeCardGrid">
                            {groups.map((g) => (
                              <div
                                key={g.cityGroupKey}
                                className="placeCard"
                                onClick={() => {
                                  flyToLngLatRef.current(g.centerLon, g.centerLat);
                                  setLayerStack([
                                    { kind: "root" },
                                    {
                                      kind: "placePhotos",
                                      categoryId: c.id,
                                      locationKey: null,
                                      cityGroupKey: g.cityGroupKey,
                                    },
                                  ]);
                                }}
                                onKeyDown={(e) =>
                                  onActivateKeyDown(e, () => {
                                    flyToLngLatRef.current(g.centerLon, g.centerLat);
                                    setLayerStack([
                                      { kind: "root" },
                                      {
                                        kind: "placePhotos",
                                        categoryId: c.id,
                                        locationKey: null,
                                        cityGroupKey: g.cityGroupKey,
                                      },
                                    ]);
                                  })
                                }
                                role="button"
                                tabIndex={0}
                                title={g.label}
                              >
                                <LazyPhoto
                                  src={g.cover.src}
                                  alt={photoAltText(g.cover)}
                                  className="placeCardImg"
                                  variant="thumb"
                                  fit="cover"
                                  rootMargin="160px 0px"
                                  placeholder={false}
                                />
                                <div className="placeCardShade" aria-hidden />
                                <div className="placeCardName">{g.label}</div>
                              </div>
                            ))}
                          </div>
                        </section>
                      );
                    })}
                  </div>
                ) : null}

                {topLayer.kind === "placePhotos" ? (
                  <PhotoThumbGrid
                    photos={photosInCurrentPlace}
                    activePhotoId={activePhotoId}
                    onClickPhoto={(photoId) => {
                      setActivePhotoId(photoId);
                      setDetailOpen(true);
                    }}
                  />
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>

      {activePhotoId && detailOpen ? (
        <PhotoDetailModal
          photos={detailModalPhotos}
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

