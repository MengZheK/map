import { countryShortFromLatLon } from "./countryFromCoordinate";
import { cityShortFromLatLon, provinceFullFromLatLon } from "./geoFromCoordinate";
import type { Photo } from "./photoUtils";
import {
  formatShortPlaceName,
  hasGps,
  resolveProvinceForCityName,
  shortAdminRegionName,
} from "./photoUtils";

/**
 * 地图圈选标题：按锚定时的缩放决定层级（市 / 省 / 国），均为简称，多项用顿号。
 */
export function mapSelectionAreaTitle(photos: Photo[], zoomAtAnchor: number): string {
  const list = photos.filter((p) => hasGps(p));
  if (list.length === 0) return "选区";

  const ZOOM_CITY = 10.5;
  const ZOOM_PROVINCE = 6;

  const uniqSorted = (arr: string[]): string =>
    [...new Set(arr.filter((s) => s && s !== "未标注" && s !== "其他"))].sort().join("、");

  const fallbackProvinceShort = (p: Photo) =>
    shortAdminRegionName(resolveProvinceForCityName((p.locationName ?? "").trim() || "未标注"));

  const fallbackCityShort = (p: Photo): string | null => {
    const c = formatShortPlaceName(p);
    return c !== "未标注" ? c : null;
  };

  const countryShortFromProvince = (province: string): string => {
    if (province === "其他") return "其他";
    if (/(省|自治区|特别行政区)$/.test(province) || /^(北京|上海|天津|重庆)市$/.test(province)) {
      return "中国";
    }
    return province;
  };

  if (zoomAtAnchor >= ZOOM_CITY) {
    const labels = list.map((p) => {
      const city = cityShortFromLatLon(p.lat, p.lon);
      if (city) return city;
      const provFull = provinceFullFromLatLon(p.lat, p.lon);
      if (provFull) return shortAdminRegionName(provFull);
      return fallbackCityShort(p) ?? fallbackProvinceShort(p);
    });
    return uniqSorted(labels) || "选区";
  }

  if (zoomAtAnchor >= ZOOM_PROVINCE) {
    const labels = list.map((p) => {
      const provFull = provinceFullFromLatLon(p.lat, p.lon);
      if (provFull) return shortAdminRegionName(provFull);
      return fallbackProvinceShort(p);
    });
    return uniqSorted(labels) || "选区";
  }

  const labels = list.map((p) => {
    const c = countryShortFromLatLon(p.lat, p.lon);
    if (c) return c;
    return countryShortFromProvince(
      resolveProvinceForCityName((p.locationName ?? "").trim() || "未标注"),
    );
  });
  return uniqSorted(labels) || "选区";
}
