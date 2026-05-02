/**
 * GitHub Pages 无服务端路由：将任意路径的 404 交给 SPA。
 * 复制 index.html 为 404.html，GitHub 会对未知路径返回该页，由 React Router 接管。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const indexHtml = path.join(dist, "index.html");
const fallback = path.join(dist, "404.html");

if (!fs.existsSync(indexHtml)) {
  console.error("copy-spa-fallback: dist/index.html missing; run vite build first.");
  process.exit(1);
}
fs.copyFileSync(indexHtml, fallback);
console.log("copy-spa-fallback: dist/404.html OK");
