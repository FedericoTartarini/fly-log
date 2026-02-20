const CACHE_NAME = "fly-log-static-v3";
const DYNAMIC_CACHE = "fly-log-dynamic-v3";
const OFFLINE_URL = "/offline.html";

// Install event - cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const staticAssets = [
        "/manifest.json",
        "/airplane.png",
        "/airplane-192.png",
        OFFLINE_URL,
      ];
      const localeFiles = [
        "/locales/en/about.json",
        "/locales/en/common.json",
        "/locales/en/flights.json",
        "/locales/en/landing.json",
        "/locales/en/login.json",
        "/locales/en/translation.json",
        "/locales/it/about.json",
        "/locales/it/common.json",
        "/locales/it/flights.json",
        "/locales/it/landing.json",
        "/locales/it/login.json",
        "/locales/it/translation.json",
        // Add other static assets as needed
      ];
      const cache = await caches.open(CACHE_NAME);
      // Add static assets atomically
      await cache.addAll(staticAssets);
      // Fetch and cache locale files individually
      const localePromises = localeFiles.map(async (url) => {
        try {
          const response = await fetch(url);
          if (response.ok) {
            await cache.put(url, response.clone());
          } else {
            console.warn("Locale file failed to fetch:", url, response.status);
          }
        } catch (err) {
          console.warn("Locale file fetch error:", url, err);
        }
      });
      await Promise.allSettled(localePromises);
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

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cachedOfflinePage = await caches.match(OFFLINE_URL);
        return cachedOfflinePage || Response.error();
      }),
    );
    return;
  }

  // For Firestore requests (flight data), cache dynamically
  if (event.request.url.includes("firestore.googleapis.com")) {
    event.respondWith(
      fetch(event.request)
        .then((fetchResponse) => {
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
  // Default: network first for other requests
  else {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cached = await caches.match(event.request);
        return cached || Response.error();
      }),
    );
  }
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
