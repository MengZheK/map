/**
 * 国家简称（依赖 country-coder，仅地图圈选标题等场景按需 import 此模块）。
 */
import { iso1A2Code } from "@ideditor/country-coder";

const ISO2_TO_ZH: Record<string, string> = {
  JP: "日本",
  KR: "韩国",
  US: "美国",
  GB: "英国",
  FR: "法国",
  DE: "德国",
  IT: "意大利",
  ES: "西班牙",
  AU: "澳大利亚",
  NZ: "新西兰",
  SG: "新加坡",
  TH: "泰国",
  VN: "越南",
  MY: "马来西亚",
  ID: "印度尼西亚",
  PH: "菲律宾",
  IN: "印度",
  RU: "俄罗斯",
  CA: "加拿大",
  MX: "墨西哥",
  BR: "巴西",
  AR: "阿根廷",
  CH: "瑞士",
  NL: "荷兰",
  BE: "比利时",
  AT: "奥地利",
  SE: "瑞典",
  NO: "挪威",
  DK: "丹麦",
  FI: "芬兰",
  PL: "波兰",
  CZ: "捷克",
  PT: "葡萄牙",
  GR: "希腊",
  TR: "土耳其",
  EG: "埃及",
  ZA: "南非",
  AE: "阿联酋",
  SA: "沙特阿拉伯",
  IL: "以色列",
  TW: "中国台湾",
};

export function countryShortFromLatLon(lat: number, lon: number): string | null {
  const code = iso1A2Code([lon, lat]);
  if (!code) return null;
  if (code === "CN" || code === "HK" || code === "MO") return "中国";
  return ISO2_TO_ZH[code] ?? code;
}
