// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/notifications/styles.css";
import "./index.css";
import i18n, { i18nReady } from "./i18n";
import App from "./App.jsx";
import routes from "./routes.jsx";

const router = createBrowserRouter(routes);
const app = (
  <App>
    <RouterProvider router={router} />
  </App>
);
const root = document.getElementById("root");

// index.html holds the landing page rendered at build time, in English. The
// inline script after #root empties it on any other route and for signed-in
// visitors, so what is left is the landing page for a signed-out visitor on
// "/". React adopts that HTML instead of redrawing it, once the English
// strings it was rendered with have loaded. Any other language redraws.
if (root.hasChildNodes()) {
  const boot = () => {
    if (i18n.resolvedLanguage === "en") {
      ReactDOM.hydrateRoot(root, app);
    } else {
      root.textContent = "";
      ReactDOM.createRoot(root).render(app);
    }
  };
  // A failed load still boots; the language check then decides.
  i18nReady.then(boot, boot);
} else {
  ReactDOM.createRoot(root).render(app);
}

// Register service worker in production to enable offline caching.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    let hasRefreshedForNewWorker = false;

    const activateWaitingWorker = (registration) => {
      if (registration.waiting) {
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
      }
    };

    // On a first visit there is no controller yet, and the new worker taking
    // control is not an update, so reloading would only replay the load.
    const hadController = !!navigator.serviceWorker.controller;

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!hadController || hasRefreshedForNewWorker) return;
      hasRefreshedForNewWorker = true;
      window.location.reload();
    });

    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((registration) => {
        console.log("Service Worker registered:", registration);

        activateWaitingWorker(registration);

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              activateWaitingWorker(registration);
            }
          });
        });

        registration.update().catch((error) => {
          console.warn("Service Worker update check failed:", error);
        });
      })
      .catch((registrationError) => {
        console.error("Service Worker registration failed:", registrationError);
      });
  });
}
