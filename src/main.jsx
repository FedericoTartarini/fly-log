// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "@mantine/core/styles.css";
import { createTheme, MantineProvider, ColorSchemeScript } from "@mantine/core";
import "./i18n"; // initialize i18n

import { App } from "./App.jsx";
import FlightsStats from "./pages/FlightsStats.jsx";
import About from "./pages/About.jsx";
import Flights from "./pages/Flights.jsx";
import { PATHS } from "./constants/MyClasses.ts";
import Login from "./pages/Login.jsx";
import Landing from "./pages/Landing.jsx";
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
        <RouterProvider router={router} />
      </AuthProvider>
    </MantineProvider>
  </React.StrictMode>,
);
