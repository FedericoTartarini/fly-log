// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "@mantine/core/styles.css";
import { createTheme, MantineProvider, ColorSchemeScript } from "@mantine/core";

import { App } from "./App.jsx";
import FlightsStats from "./pages/FlightsStats.jsx";
import About from "./pages/About.jsx";
import Flights from "./pages/Flights.jsx";
import { Paths } from "./constants/MyClasses.js";
import Login from "./pages/Login.jsx";
import Landing from "./pages/Landing.jsx";
import AuthProvider from "./context/AuthContext";

const router = createBrowserRouter([
  {
    path: Paths.HOME,
    element: <App />,
    children: [
      {
        index: true, // Default route
        element: <Landing />,
      },
      {
        path: Paths.ABOUT,
        element: <About />,
      },
      {
        path: Paths.STATS,
        element: <FlightsStats />,
      },
      {
        path: Paths.FLIGHTS,
        element: <Flights />,
      },
      {
        path: Paths.LOGIN,
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
    <AuthProvider>
      <MantineProvider theme={theme} defaultColorScheme="auto">
        <ColorSchemeScript defaultColorScheme="auto" />

        <RouterProvider router={router} />
      </MantineProvider>
    </AuthProvider>
  </React.StrictMode>,
);
