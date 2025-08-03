// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "@mantine/core/styles.css";
import { createTheme, MantineProvider, ColorSchemeScript } from "@mantine/core";

import { App } from "./App.jsx";
import Home from "./pages/Home.jsx";
import About from "./pages/About.jsx";
import FlightStats from "./pages/FlightStats.jsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true, // Default route
        element: <Home />,
      },
      {
        path: "about",
        element: <About />,
      },
      {
        path: "flights_stats",
        element: <FlightStats />,
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
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <ColorSchemeScript defaultColorScheme="auto" />

      <RouterProvider router={router} />
    </MantineProvider>
  </React.StrictMode>,
);
