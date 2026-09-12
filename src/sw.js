// Cache name carries the build id injected by vite-plugin-static-copy at build
// time, so every deploy lands in a fresh cache and `activate` evicts the old one.
const CACHE_NAME = "fly-log-static-__BUILD_ID__";
const OFFLINE_URL = "/offline.html";
const LOCALES_PREFIX = "/locales/";
const DATA_PREFIX = "/data/";
const ASSETS_PREFIX = "/assets/";

// Install event - cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const staticAssets = [
        "/manifest.json",
        "/airplane.png",
        "/airplane-192.png",
        OFFLINE_URL,
        "/data/world-fallback.json",
      ];
      const cache = await caches.open(CACHE_NAME);
      // Add static assets atomically
      await cache.addAll(staticAssets);
      self.skipWaiting();
    })(),
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        // This worker is the only one registered on the origin, so any cache
        // that is not the current one is garbage. The previous filter only
        // matched "fly-log-" names, which left 4.7 MB of precache behind from
        // an old vite-plugin-pwa setup sitting on every existing device.
        const cachesToDelete = cacheNames.filter(
          (cache) => cache !== CACHE_NAME,
        );
        return Promise.all(cachesToDelete.map((cache) => caches.delete(cache)));
      })
      .then(() => self.clients.claim()),
  );
});

// Allow page script to force-activate an updated worker.
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Serve the cached copy immediately and refresh it in the background.
const staleWhileRevalidate = async (event, fallbackToOffline = false) => {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(event.request);

  const update = fetch(event.request)
    .then((response) => {
      if (response.ok) cache.put(event.request, response.clone());
      return response;
    })
    .catch(async () => {
      if (cached) return cached;
      if (fallbackToOffline) {
        return (await caches.match(OFFLINE_URL)) || Response.error();
      }
      return Response.error();
    });

  if (cached) {
    // Keep the worker alive long enough to finish the refresh.
    event.waitUntil(update.catch(() => {}));
    return cached;
  }
  return update;
};

// Fetch event - cache strategy
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  if (!requestUrl.protocol.startsWith("http")) return;

  const isDocumentRequest =
    event.request.mode === "navigate" ||
    event.request.destination === "document";

  // The app shell is not content-hashed, so it cannot be cache-first. Serving
  // the cached copy makes an installed PWA launch without waiting on the radio;
  // the background refresh plus the SKIP_WAITING flow in main.jsx picks up a
  // new deploy on the following launch.
  if (isDocumentRequest && requestUrl.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(event, true));
    return;
  }

  // Built assets are content-hashed, so a cached copy can never be stale: new
  // content always means a new filename. Cache-first, no revalidation.
  if (
    requestUrl.origin === self.location.origin &&
    requestUrl.pathname.startsWith(ASSETS_PREFIX)
  ) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;

        const response = await fetch(event.request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(event.request, response.clone());
        }
        return response;
      })(),
    );
    return;
  }

  // Cache locale files dynamically to avoid brittle hardcoded lists.
  if (requestUrl.pathname.startsWith(LOCALES_PREFIX)) {
    event.respondWith(
      fetch(event.request)
        .then((fetchResponse) => {
          if (fetchResponse.ok) {
            return caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, fetchResponse.clone());
              return fetchResponse;
            });
          }
          return fetchResponse;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          return cached || Response.error();
        }),
    );
    return;
  }

  // Reference data (airports, airlines) is large and only changes on deploy,
  // so serve the cached copy immediately and refresh it in the background.
  if (requestUrl.pathname.startsWith(DATA_PREFIX)) {
    event.respondWith(staleWhileRevalidate(event));
    return;
  }

  // Default: network first for other requests (no offline fallback)
  event.respondWith(
    fetch(event.request).catch(async () => {
      const cached = await caches.match(event.request);
      return cached || Response.error();
    }),
  );
});
