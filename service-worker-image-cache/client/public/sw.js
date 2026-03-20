const IMAGE_CACHE = "no-store-image-cache-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function normalizeImageCacheKey(requestUrl) {
  const url = new URL(requestUrl);
  return `${url.origin}${url.pathname}`;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") {
    return;
  }

  if (!url.pathname.startsWith("/api/images/no-store/")) {
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(IMAGE_CACHE);
      const cacheKey = normalizeImageCacheKey(request.url);
      const cached = await cache.match(cacheKey);

      if (cached) {
        console.log(cached);
        return cached;
      }

      const networkResponse = await fetch(request);

      if (networkResponse.ok) {
        await cache.put(cacheKey, networkResponse.clone());
      }

      return networkResponse;
    })(),
  );
});
