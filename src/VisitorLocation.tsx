import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/** 无定位权限或失败时，附近/远方与旧版一致，用国内参考点 */
export const DEFAULT_REF_HOME = { lat: 35.0, lon: 105.0 };

export type VisitorLocationState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; lat: number; lon: number; accuracyM: number | null }
  | { status: "denied" }
  | { status: "unavailable" }
  | { status: "error"; message: string };

type VisitorLocationContextValue = {
  state: VisitorLocationState;
  /** 重新向浏览器请求当前位置（不使用缓存坐标） */
  refresh: () => void;
};

const VisitorLocationContext = createContext<VisitorLocationContextValue | null>(null);

/**
 * 在应用根级请求浏览器定位，供相册（附近/远方）与地图（访客点）共用。
 * 使用 maximumAge: 0，避免长期使用旧缓存；切回页签时可配合 refresh 更新。
 */
export function VisitorLocationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<VisitorLocationState>({ status: "idle" });

  const refresh = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState({ status: "unavailable" });
      return;
    }

    setState((prev) => {
      if (prev.status === "ok") return prev;
      return { status: "loading" };
    });

    const onSuccess = (pos: GeolocationPosition) => {
      setState({
        status: "ok",
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
        accuracyM: pos.coords.accuracy != null ? pos.coords.accuracy : null,
      });
    };

    const onError = (err: GeolocationPositionError) => {
      if (err.code === err.PERMISSION_DENIED) {
        setState({ status: "denied" });
      } else {
        setState({ status: "error", message: err.message || "定位失败" });
      }
    };

    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      timeout: 18_000,
      maximumAge: 0,
    });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [refresh]);

  const value = useMemo(() => ({ state, refresh }), [state, refresh]);

  return (
    <VisitorLocationContext.Provider value={value}>{children}</VisitorLocationContext.Provider>
  );
}

export function useVisitorLocation(): VisitorLocationState {
  const v = useContext(VisitorLocationContext);
  if (v == null) {
    throw new Error("useVisitorLocation must be used within VisitorLocationProvider");
  }
  return v.state;
}

/** 手动触发重新定位（例如长途移动后地图仍显示旧城市） */
export function useVisitorLocationRefresh(): () => void {
  const v = useContext(VisitorLocationContext);
  if (v == null) {
    throw new Error("useVisitorLocationRefresh must be used within VisitorLocationProvider");
  }
  return v.refresh;
}

export function getRefPointForDistance(state: VisitorLocationState): { lat: number; lon: number } {
  if (state.status === "ok") {
    return { lat: state.lat, lon: state.lon };
  }
  return DEFAULT_REF_HOME;
}
