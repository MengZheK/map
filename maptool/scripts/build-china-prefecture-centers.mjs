/**
 * 从阿里云 DataV areas_v3 拉取各省边界 GeoJSON，汇总「地级」驻点 center（GCJ-02），
 * 生成 chinaPrefectureCentersData.ts。运行需联网：node scripts/build-china-prefecture-centers.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, "../src/shared/chinaPrefectureCentersData.ts");

const BASE = "https://geo.datav.aliyun.com/areas_v3/bound";

/** 直辖市：省界 JSON 下只有区县，用省级 feature 的 center + 固定简称 */
const MUNICIPALITY_SHORT = {
  110000: "北京",
  120000: "天津",
  310000: "上海",
  500000: "重庆",
};

/** 省级即「市界」的特别行政区 / 台湾省，用 100000 中省级块中心 + 短名 */
const PROVINCE_AS_CITY = {
  710000: "台湾",
  810000: "香港",
  820000: "澳门",
};

function shortPrefectureName(full) {
  if (!full || typeof full !== "string") return full;
  // 乌兰察布市 → 乌兰察布；锡林郭勒盟、大兴安岭地区等保留后缀到「盟/地区」前不再砍
  if (full.endsWith("市")) return full.slice(0, -1);
  return full;
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function main() {
  const china = await fetchJson(`${BASE}/100000_full.json`);
  const list = [];

  for (const f of china.features) {
    const p = f.properties;
    const adcode = p.adcode;
    const center = p.center;
    if (!Array.isArray(center) || center.length < 2) continue;

    const mu = MUNICIPALITY_SHORT[adcode];
    if (mu) {
      list.push({ adcode, name: mu, lon: center[0], lat: center[1] });
      continue;
    }

    const pc = PROVINCE_AS_CITY[adcode];
    if (pc) {
      list.push({ adcode, name: pc, lon: center[0], lat: center[1] });
      continue;
    }

    let provinceFull;
    try {
      provinceFull = await fetchJson(`${BASE}/${adcode}_full.json`);
    } catch {
      continue;
    }

    for (const c of provinceFull.features ?? []) {
      const q = c.properties;
      if (!q || q.level !== "city" || !Array.isArray(q.center)) continue;
      const lon = q.center[0];
      const lat = q.center[1];
      list.push({
        adcode: q.adcode,
        name: shortPrefectureName(q.name),
        lon,
        lat,
      });
    }
  }

  list.sort((a, b) => a.adcode - b.adcode);

  const body = `/* eslint-disable quotes */\n/**
 * 地级行政单位政府驻地近似坐标（DataV center，GCJ-02）。由 scripts/build-china-prefecture-centers.mjs 生成，请勿手改。
 */\nexport type PrefectureCenter = { adcode: number; name: string; lon: number; lat: number };\n\nexport const CHINA_PREFECTURE_CENTERS: PrefectureCenter[] = ${JSON.stringify(list, null, 2)};\n`;

  fs.writeFileSync(outPath, body, "utf8");
  console.log(`Wrote ${list.length} prefecture centers to ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
