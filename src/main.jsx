// src/main.jsx
import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "@mantine/core/styles.css";
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
const Login = lazy(() => import("./pages/Login.jsx"));
const Landing = lazy(() => import("./pages/Landing.jsx"));
import { PATHS } from "./constants/MyClasses.ts";
import AuthProvider from "./context/AuthContext";
import MyAppShell from "./pages/MyAppShell.jsx";

const router = createBrowserRouter([
  {
    path: PATHS.HOME,
    element: <MyAppShell />,
    children: [
      {
        index: true, // Default route
        element: <Landing />,
      },
      {
        path: PATHS.ABOUT,
        element: <About />,
      },
      {
        path: PATHS.STATS,
        element: <FlightsStats />,
      },
      {
        path: PATHS.FLIGHTS,
        element: <Flights />,
      },
      {
        path: PATHS.LOGIN,
        element: <Login />,
      },
    ],
  },
]);

const theme = createTheme({
  headings: {
    fontFamily: "Roboto, sans-serif",
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ColorSchemeScript defaultColorScheme="auto" />
    <MantineProvider theme={theme} defaultColorScheme="auto">
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
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("Service Worker registered: ", registration);
      })
      .catch((registrationError) => {
        console.error("Service Worker registration failed:", registrationError);
      });
  });
}
