// src/main.jsx
import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "@mantine/core/styles.css";
import {
  createTheme,
  MantineProvider,
  ColorSchemeScript,
  Loader,
  Center,
} from "@mantine/core";
import "./i18n"; // initialize i18n

import { App } from "./App.jsx";
const FlightsStats = lazy(() => import("./pages/FlightsStats.jsx"));
const About = lazy(() => import("./pages/About.jsx"));
const Flights = lazy(() => import("./pages/Flights.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const Landing = lazy(() => import("./pages/Landing.jsx"));
import { PATHS } from "./constants/MyClasses.ts";
import AuthProvider from "./context/AuthContext";

const router = createBrowserRouter([
  {
    path: PATHS.HOME,
    element: <App />,
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
