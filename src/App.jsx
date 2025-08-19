import { Routes, Route } from "react-router-dom";
import FlightsStats from "./pages/FlightsStats.jsx";
import Flights from "./pages/Flights.jsx";
import About from "./pages/About";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import MyAppShell from "./pages/MyAppShell.jsx";
import { PATHS } from "./constants/MyClasses.ts";
import Landing from "./pages/Landing.jsx";

import "@mantine/core/styles.css";
// ‼️ import dates styles after core package styles
import "@mantine/dates/styles.css";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<MyAppShell />}>
        <Route path={PATHS.LOGIN} element={<Login />} />
        <Route path={PATHS.ABOUT} element={<About />} />
        <Route path={PATHS.HOME} element={<Landing />} />
        <Route
          path="*"
          element={
            <ProtectedRoute>
              <Routes>
                <Route path={PATHS.STATS} element={<FlightsStats />} />
                <Route path={PATHS.FLIGHTS} element={<Flights />} />
              </Routes>
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
}
