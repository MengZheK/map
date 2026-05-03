/**
 * Prefix absolute paths from `public/` with Vite `base` (GitHub Pages 子路径部署).
 */
export function publicUrl(path: string): string {
  if (!path.startsWith("/")) return path;
  const base = import.meta.env.BASE_URL;
  const rest = path.slice(1);
  return base.endsWith("/") ? `${base}${rest}` : `${base}/${rest}`;
}
