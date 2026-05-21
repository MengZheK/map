/**
 * 缓存相册图片与 photos.json，减少重复打开浏览器时的网络加载。
 */
const IMAGE_CACHE = "kang-map-images-v1";
const DATA_CACHE = "kang-map-data-v1";

function isImageRequest(request) {
  if (request.method !== "GET") return false;
  if (request.destination === "image") return true;
  const url = new URL(request.url);
  return /\.(webp|jpe?g|png|gif|avif)(\?|$)/i.test(url.pathname + url.search);
}

function isAlbumDataRequest(request) {
  if (request.method !== "GET") return false;
  const path = new URL(request.url).pathname;
  return path.endsWith("/photos/photos.json") || path.endsWith("/photos/categories.json");
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (!request.url.startsWith("http")) return;

  if (isImageRequest(request)) {
    event.respondWith(cacheFirstImage(request));
    return;
  }

  if (isAlbumDataRequest(request)) {
    event.respondWith(staleWhileRevalidateData(request));
  }
});

async function cacheFirstImage(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  try {
    const res = await fetch(request);
    if (res.ok) await cache.put(request, res.clone());
    return res;
  } catch (err) {
    if (hit) return hit;
    throw err;
  }
}

async function staleWhileRevalidateData(request) {
  const cache = await caches.open(DATA_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((res) => {
      if (res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => cached);

  return cached || network;
}
