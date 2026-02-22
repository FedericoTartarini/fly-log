const CACHE_NAME = "fly-log-static-v3";
const DYNAMIC_CACHE = "fly-log-dynamic-v3";
const OFFLINE_URL = "/offline.html";
const LOCALES_PREFIX = "/locales/";

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
        const cachesToDelete = cacheNames.filter(
          (cache) =>
            cache.startsWith("fly-log-") &&
            cache !== CACHE_NAME &&
            cache !== DYNAMIC_CACHE,
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

// Fetch event - cache strategy
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  if (!requestUrl.protocol.startsWith("http")) return;

  const isDocumentRequest =
    event.request.mode === "navigate" ||
    event.request.destination === "document";

  if (isDocumentRequest && requestUrl.origin === self.location.origin) {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cachedOfflinePage = await caches.match(OFFLINE_URL);
        return cachedOfflinePage || Response.error();
      }),
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

  // For Firestore requests (flight data), cache dynamically
  if (event.request.url.includes("firestore.googleapis.com")) {
    event.respondWith(
      fetch(event.request)
        .then((fetchResponse) => {
          // Firestore returns POST for most structured queries, so we only cache GET responses.
          if (fetchResponse.status === 200 && event.request.method === "GET") {
            return caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(event.request, fetchResponse.clone());
              return fetchResponse;
            });
          }
          return fetchResponse;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => cached || Response.error());
        }),
    );
  }
  // Default: network first for other requests (no offline fallback)
  event.respondWith(
    fetch(event.request).catch(async () => {
      const cached = await caches.match(event.request);
      return cached || Response.error();
    }),
  );
});

// Background sync for offline actions (placeholder)
self.addEventListener("sync", (event) => {
  if (event.tag === "background-sync") {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Implement syncing offline flight data here
  console.log("Background sync triggered");
  // Placeholder: simulate async work
  await new Promise((resolve) => setTimeout(resolve, 1000)); // Example delay
}
