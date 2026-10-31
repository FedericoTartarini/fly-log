// src/main.jsx
import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from "react-router-dom";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/charts/styles.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import "./index.css";
import { MantineProvider, ColorSchemeScript } from "@mantine/core";
import { theme, resolver } from "./theme.js";
import { Notifications } from "@mantine/notifications";
import "./i18n"; // initialize i18n

const FlightsStats = lazy(() => import("./pages/FlightsStats.jsx"));
const About = lazy(() => import("./pages/About.jsx"));
const Flights = lazy(() => import("./pages/Flights.jsx"));
const WorldTour = lazy(() => import("./pages/WorldTour.jsx"));
const Timeline = lazy(() => import("./pages/Timeline.jsx"));
const Badges = lazy(() => import("./pages/Badges.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
// MyAppShell and ProtectedRoute render on every route, so splitting them out
// bought nothing and cost an extra loading state on the way in.
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import HomeIndex from "./components/HomeIndex.jsx";
import MyAppShell from "./pages/MyAppShell.jsx";
import PageSkeleton from "./components/PageSkeleton.jsx";
import { PATHS } from "./constants/MyClasses.ts";
import AuthProvider from "./context/AuthContext";

// Route tree: MyAppShell hosts the main layout and nested pages.
const router = createBrowserRouter([
  {
    path: PATHS.HOME,
    element: <MyAppShell />,
    children: [
      {
        index: true, // Default route
        element: <HomeIndex />,
      },
      {
        // Kept so the previously indexed URL and any stale bookmark still
        // land somewhere. public/_redirects serves a 301 for real navigations.
        path: PATHS.LANDING,
        element: <Navigate to={PATHS.HOME} replace />,
      },
      {
        path: PATHS.ABOUT,
        element: <About />,
      },
      {
        path: PATHS.STATS,
        element: (
          <ProtectedRoute>
            <FlightsStats />
          </ProtectedRoute>
        ),
      },
      {
        path: PATHS.FLIGHTS,
        element: (
          <ProtectedRoute>
            <Flights />
          </ProtectedRoute>
        ),
      },
      {
        path: PATHS.TOUR,
        element: (
          <ProtectedRoute>
            <WorldTour />
          </ProtectedRoute>
        ),
      },
      {
        path: PATHS.TIMELINE,
        element: (
          <ProtectedRoute>
            <Timeline />
          </ProtectedRoute>
        ),
      },
      {
        path: PATHS.BADGES,
        element: (
          <ProtectedRoute>
            <Badges />
          </ProtectedRoute>
        ),
      },
      {
        path: PATHS.LOGIN,
        element: <Login />,
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ColorSchemeScript defaultColorScheme="auto" />
    <MantineProvider
      theme={theme}
      defaultColorScheme="auto"
      cssVariablesResolver={resolver}
    >
      {/* Above every modal, so validation errors show over the form */}
      <Notifications zIndex={2000} />
      <AuthProvider>
        <Suspense fallback={<PageSkeleton />}>
          <RouterProvider router={router} />
        </Suspense>
      </AuthProvider>
    </MantineProvider>
  </React.StrictMode>,
);

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
