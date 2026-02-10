import { precacheAndRoute } from "workbox-precaching";

const CACHE_NAME = "fly-log-v2";
const DYNAMIC_CACHE = "fly-log-dynamic-v2";
const OFFLINE_URL = "/offline.html";

// Precache all assets
precacheAndRoute(self.__WB_MANIFEST);

// Install event - cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll([
          "/",
          "/index.html",
          "/manifest.json",
          "/airplane.png",
          OFFLINE_URL,
          // Add other static assets as needed
        ]);
      })
      .then(() => self.skipWaiting()),
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
          if (
            cache.startsWith("workbox-precache") ||
            cache.startsWith("workbox-runtime")
          )
            return false;
          return true;
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
