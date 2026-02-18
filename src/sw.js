import { precacheAndRoute } from "workbox-precaching";

const CACHE_NAME = "fly-log-v2";
const DYNAMIC_CACHE = "fly-log-dynamic-v2";
const OFFLINE_URL = "/offline.html";

// Precache all assets
precacheAndRoute(self.__WB_MANIFEST);

// Install event - cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const staticAssets = [
        "/",
        "/index.html",
        "/manifest.json",
        "/airplane.png",
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
        const cachesToDelete = cacheNames.filter((cache) => {
          if (cache === CACHE_NAME || cache === DYNAMIC_CACHE) return false;
          return !(
            cache.startsWith("workbox-precache") ||
            cache.startsWith("workbox-runtime")
          );
        });
        return Promise.all(cachesToDelete.map((cache) => caches.delete(cache)));
      })
      .then(() => self.clients.claim()),
  );
});

// Fetch event - cache strategy
self.addEventListener("fetch", (event) => {
  // For Firestore requests (flight data), cache dynamically
  if (event.request.url.includes("firestore.googleapis.com")) {
    event.respondWith(
      fetch(event.request)
        .then((fetchResponse) => {
          if (fetchResponse.status === 200) {
            return caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(event.request, fetchResponse.clone());
              return fetchResponse;
            });
          }
          return fetchResponse;
        })
        .catch(() => {
          return caches
            .match(event.request)
            .then((cached) => cached || caches.match(OFFLINE_URL));
        }),
    );
  }
  // Default: network first for other requests
  else {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches
          .match(event.request)
          .then((cached) => cached || caches.match(OFFLINE_URL));
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
