import { Routes, Route } from "react-router-dom";
import FlightsStats from "./pages/FlightsStats.jsx";
import Flights from "./pages/Flights.jsx";
import About from "./pages/About";
import Login from "./pages/Login";
import AuthProvider from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import MyAppShell from "./pages/MyAppShell.jsx";
import { Paths } from "./constants/MyClasses.js";
import Landing from "./pages/Landing.jsx";

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path={Paths.HOME} element={<MyAppShell />}>
          <Route path={Paths.LOGIN} element={<Login />} />
          <Route path={Paths.ABOUT} element={<About />} />
          <Route path={Paths.HOME} element={<Landing />} />
          <Route
            path="*"
            element={
              <ProtectedRoute>
                <Routes>
                  <Route path={Paths.STATS} element={<FlightsStats />} />
                  <Route path={Paths.FLIGHTS} element={<Flights />} />
                </Routes>
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
