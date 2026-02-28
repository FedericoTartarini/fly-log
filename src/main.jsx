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
import {
  createTheme,
  MantineProvider,
  ColorSchemeScript,
  Loader,
  Center,
} from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import "./i18n"; // initialize i18n

const FlightsStats = lazy(() => import("./pages/FlightsStats.jsx"));
const About = lazy(() => import("./pages/About.jsx"));
const Flights = lazy(() => import("./pages/Flights.jsx"));
const WorldTour = lazy(() => import("./pages/WorldTour.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const Landing = lazy(() => import("./pages/Landing.jsx"));
import { PATHS } from "./constants/MyClasses.ts";
import AuthProvider from "./context/AuthContext";
import MyAppShell from "./pages/MyAppShell.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

const router = createBrowserRouter([
  {
    path: PATHS.HOME,
    element: <MyAppShell />,
    children: [
      {
        index: true, // Default route
        element: <Navigate to={PATHS.STATS} replace />,
      },
      {
        path: PATHS.LANDING,
        element: <Landing />,
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
        path: PATHS.LOGIN,
        element: <Login />,
      },
    ],
  },
]);

const theme = createTheme({
  primaryColor: "primary", // purple will be the main theme color
  colors: {
    accent: [
      "#f3f0ff",
      "#e3def3",
      "#c3bae0",
      "#a294ce",
      "#8574bf",
      "#735fb6",
      "#6a55b3",
      "#554295",
      "#4f3d8e",
      "#44347e",
    ],
    primary: [
      "#ffe8ea",
      "#ffcfd2",
      "#ff9ca1",
      "#fe656e",
      "#fd3942",
      "#fe1e27",
      "#fe0f18",
      "#e6000d",
      "#cb0009",
      "#b10004",
    ],
  },
  defaultGradient: {
    from: "primary.6",
    to: "accent.6",
    deg: 75,
  },
  headings: {
    fontFamily: "Roboto, sans-serif",
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ColorSchemeScript defaultColorScheme="auto" />
    <MantineProvider
      theme={theme}
      defaultColorScheme="auto"
      // cssVariablesResolver={resolver}
    >
      <Notifications />
      <AuthProvider>
        <Suspense
          fallback={
            <Center h="100vh">
              <Loader />
            </Center>
          }
        >
          <RouterProvider router={router} />
        </Suspense>
      </AuthProvider>
    </MantineProvider>
  </React.StrictMode>,
);

// Register service worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    let hasRefreshedForNewWorker = false;

    const activateWaitingWorker = (registration) => {
      if (registration.waiting) {
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
      }
    };

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (hasRefreshedForNewWorker) return;
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
