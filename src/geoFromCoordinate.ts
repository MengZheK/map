/**
 * 由 WGS84 经纬度推断行政区（边界框近似，省界相邻处可能有误差）。
 * 用于地图圈选标题：按圈内各点坐标汇总城市 / 省 / 国家简称。
 */
import { iso1A2Code } from "@ideditor/country-coder";

type Box = { minLat: number; maxLat: number; minLon: number; maxLon: number };

function inBox(lat: number, lon: number, b: Box): boolean {
  return lat >= b.minLat && lat <= b.maxLat && lon >= b.minLon && lon <= b.maxLon;
}

/** 直辖市与特别行政区等优先于邻省大框 */
const PROVINCE_BOXES: { box: Box; fullName: string }[] = [
  { box: { minLat: 22.13, maxLat: 22.58, minLon: 113.82, maxLon: 114.45 }, fullName: "香港特别行政区" },
  { box: { minLat: 22.07, maxLat: 22.22, minLon: 113.52, maxLon: 113.61 }, fullName: "澳门特别行政区" },
  { box: { minLat: 39.44, maxLat: 41.06, minLon: 115.42, maxLon: 117.51 }, fullName: "北京市" },
  { box: { minLat: 38.56, maxLat: 40.25, minLon: 116.7, maxLon: 118.1 }, fullName: "天津市" },
  { box: { minLat: 30.68, maxLat: 31.87, minLon: 120.86, maxLon: 122.2 }, fullName: "上海市" },
  { box: { minLat: 28.1, maxLat: 32.2, minLon: 105.29, maxLon: 110.2 }, fullName: "重庆市" },
  { box: { minLat: 36.02, maxLat: 42.62, minLon: 113.45, maxLon: 119.84 }, fullName: "河北省" },
  { box: { minLat: 34.34, maxLat: 40.74, minLon: 110.23, maxLon: 114.85 }, fullName: "山西省" },
  { box: { minLat: 37.41, maxLat: 53.33, minLon: 97.2, maxLon: 126.04 }, fullName: "内蒙古自治区" },
  { box: { minLat: 38.72, maxLat: 43.43, minLon: 118.84, maxLon: 125.46 }, fullName: "辽宁省" },
  { box: { minLat: 40.89, maxLat: 46.3, minLon: 121.38, maxLon: 131.19 }, fullName: "吉林省" },
  { box: { minLat: 43.42, maxLat: 53.56, minLon: 121.11, maxLon: 135.09 }, fullName: "黑龙江省" },
  { box: { minLat: 30.75, maxLat: 35.12, minLon: 116.35, maxLon: 121.95 }, fullName: "江苏省" },
  { box: { minLat: 27.05, maxLat: 31.18, minLon: 118.01, maxLon: 123.23 }, fullName: "浙江省" },
  { box: { minLat: 29.37, maxLat: 34.65, minLon: 114.88, maxLon: 119.64 }, fullName: "安徽省" },
  { box: { minLat: 23.52, maxLat: 28.32, minLon: 115.85, maxLon: 120.72 }, fullName: "福建省" },
  { box: { minLat: 24.29, maxLat: 30.04, minLon: 113.57, maxLon: 118.47 }, fullName: "江西省" },
  { box: { minLat: 34.38, maxLat: 38.4, minLon: 114.82, maxLon: 122.7 }, fullName: "山东省" },
  { box: { minLat: 31.23, maxLat: 36.36, minLon: 110.35, maxLon: 116.65 }, fullName: "河南省" },
  { box: { minLat: 29.05, maxLat: 33.27, minLon: 108.21, maxLon: 116.12 }, fullName: "湖北省" },
  { box: { minLat: 24.63, maxLat: 30.12, minLon: 108.79, maxLon: 114.26 }, fullName: "湖南省" },
  { box: { minLat: 20.24, maxLat: 25.52, minLon: 109.66, maxLon: 117.31 }, fullName: "广东省" },
  { box: { minLat: 20.9, maxLat: 26.38, minLon: 104.26, maxLon: 112.03 }, fullName: "广西壮族自治区" },
  { box: { minLat: 18.15, maxLat: 20.12, minLon: 108.37, maxLon: 111.03 }, fullName: "海南省" },
  { box: { minLat: 26.03, maxLat: 34.31, minLon: 97.35, maxLon: 108.54 }, fullName: "四川省" },
  { box: { minLat: 24.37, maxLat: 29.22, minLon: 103.6, maxLon: 109.59 }, fullName: "贵州省" },
  { box: { minLat: 21.14, maxLat: 29.15, minLon: 97.52, maxLon: 106.19 }, fullName: "云南省" },
  { box: { minLat: 26.85, maxLat: 36.46, minLon: 78.39, maxLon: 99.1 }, fullName: "西藏自治区" },
  { box: { minLat: 31.42, maxLat: 39.58, minLon: 105.49, maxLon: 111.24 }, fullName: "陕西省" },
  { box: { minLat: 32.11, maxLat: 42.57, minLon: 92.13, maxLon: 108.71 }, fullName: "甘肃省" },
  { box: { minLat: 31.6, maxLat: 39.19, minLon: 89.4, maxLon: 103.04 }, fullName: "青海省" },
  { box: { minLat: 35.23, maxLat: 38.47, minLon: 104.17, maxLon: 107.65 }, fullName: "宁夏回族自治区" },
  { box: { minLat: 34.25, maxLat: 49.17, minLon: 73.4, maxLon: 96.38 }, fullName: "新疆维吾尔自治区" },
  { box: { minLat: 21.9, maxLat: 25.3, minLon: 119.3, maxLon: 122.0 }, fullName: "台湾省" },
];

/** 地级 / 国外主要城市：框更紧，优先于省级汇总 */
const CITY_BOXES: { box: Box; shortName: string }[] = [
  { box: { minLat: 22.45, maxLat: 22.88, minLon: 113.78, maxLon: 114.62 }, shortName: "深圳" },
  { box: { minLat: 22.78, maxLat: 23.95, minLon: 112.95, maxLon: 113.7 }, shortName: "广州" },
  { box: { minLat: 29.95, maxLat: 30.5, minLon: 119.85, maxLon: 120.65 }, shortName: "杭州" },
  { box: { minLat: 31.15, maxLat: 32.55, minLon: 118.35, maxLon: 119.25 }, shortName: "南京" },
  { box: { minLat: 30.5, maxLat: 31.45, minLon: 103.9, maxLon: 104.9 }, shortName: "成都" },
  { box: { minLat: 33.95, maxLat: 34.75, minLon: 108.65, maxLon: 109.45 }, shortName: "西安" },
  { box: { minLat: 30.4, maxLat: 31.0, minLon: 113.95, maxLon: 115.0 }, shortName: "武汉" },
  { box: { minLat: 24.4, maxLat: 24.75, minLon: 117.95, maxLon: 118.35 }, shortName: "厦门" },
  { box: { minLat: 35.9, maxLat: 36.45, minLon: 120.0, maxLon: 120.75 }, shortName: "青岛" },
  { box: { minLat: 31.2, maxLat: 31.55, minLon: 120.45, maxLon: 121.0 }, shortName: "苏州" },
  { box: { minLat: 39.75, maxLat: 40.2, minLon: 116.15, maxLon: 116.7 }, shortName: "北京" },
  { box: { minLat: 31.1, maxLat: 31.45, minLon: 121.35, maxLon: 121.9 }, shortName: "上海" },
  { box: { minLat: 39.0, maxLat: 39.7, minLon: 117.0, maxLon: 117.9 }, shortName: "天津" },
  { box: { minLat: 29.4, maxLat: 30.0, minLon: 106.3, maxLon: 107.0 }, shortName: "重庆" },
  { box: { minLat: 45.9, maxLat: 46.1, minLon: 7.65, maxLon: 7.95 }, shortName: "采尔马特" },
  { box: { minLat: 48.75, maxLat: 48.95, minLon: 2.15, maxLon: 2.55 }, shortName: "巴黎" },
  { box: { minLat: 51.35, maxLat: 51.6, minLon: -0.35, maxLon: 0.15 }, shortName: "伦敦" },
];

const ISO2_TO_ZH: Record<string, string> = {
  CN: "中国",
  TW: "台湾",
  FR: "法国",
  GB: "英国",
  CH: "瑞士",
  DE: "德国",
  IT: "意大利",
  ES: "西班牙",
  US: "美国",
  JP: "日本",
  KR: "韩国",
  TH: "泰国",
  SG: "新加坡",
  MY: "马来西亚",
  AU: "澳大利亚",
  NZ: "新西兰",
  CA: "加拿大",
  IN: "印度",
  VN: "越南",
  ID: "印度尼西亚",
  PH: "菲律宾",
  NL: "荷兰",
  BE: "比利时",
  AT: "奥地利",
  PT: "葡萄牙",
  SE: "瑞典",
  NO: "挪威",
  FI: "芬兰",
  DK: "丹麦",
  PL: "波兰",
  CZ: "捷克",
  GR: "希腊",
  TR: "土耳其",
  EG: "埃及",
  AE: "阿联酋",
  SA: "沙特阿拉伯",
  IL: "以色列",
  ZA: "南非",
  BR: "巴西",
  AR: "阿根廷",
  MX: "墨西哥",
  RU: "俄罗斯",
};

/**
 * 城市级简称：坐标落在已知城市框内则返回该简称，否则 null。
 */
export function cityShortFromLatLon(lat: number, lon: number): string | null {
  for (const { box, shortName } of CITY_BOXES) {
    if (inBox(lat, lon, box)) return shortName;
  }
  return null;
}

/**
 * 省级全称（与 photoUtils.resolveProvinceForCityName 体系一致），便于再转为简称。
 */
export function provinceFullFromLatLon(lat: number, lon: number): string | null {
  for (const { box, fullName } of PROVINCE_BOXES) {
    if (inBox(lat, lon, box)) return fullName;
  }
  return null;
}

/**
 * 国家简称（ISO + 手工映射）。坐标不在任何国家多边形内时可能为 null。
 */
export function countryShortFromLatLon(lat: number, lon: number): string | null {
  const code = iso1A2Code([lon, lat]);
  if (!code) return null;
  if (code === "CN" || code === "HK" || code === "MO") return "中国";
  return ISO2_TO_ZH[code] ?? code;
}
