import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 自定义域名挂在站点根路径，base 为 "/"。`import.meta.env.BASE_URL` 与 React Router 会随之一致。
// 若需同时支持 github.io/仓库名/ 子路径，可改回 `defineConfig(({ mode }) => ({ base: mode === "production" ? "/map/" : "/" }))` 等方案。
export default defineConfig({
  base: "/",
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
});
