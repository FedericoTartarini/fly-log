import React, { lazy, Suspense } from "react";
import { Navigate } from "react-router-dom";

const FlightsStats = lazy(() => import("./pages/FlightsStats.jsx"));
const AllStats = lazy(() => import("./pages/AllStats.jsx"));
const About = lazy(() => import("./pages/About.jsx"));
const Changelog = lazy(() => import("./pages/Changelog.jsx"));
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
import FlightsListSkeleton from "./components/FlightsListSkeleton.jsx";
import AllStatsSkeleton from "./components/AllStatsSkeleton.jsx";
import TourSkeleton from "./components/TourSkeleton.jsx";
import TimelineSkeleton from "./components/TimelineSkeleton.jsx";
import BadgesSkeleton from "./components/BadgesSkeleton.jsx";
import { PATHS } from "./constants/MyClasses.ts";

// Route tree: MyAppShell hosts the main layout and nested pages. Shared by
// the browser router in main.jsx and the build-time render of "/" in
// entry-server.jsx.
const routes = [
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
        path: PATHS.CHANGELOG,
        element: <Changelog />,
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
        path: PATHS.ALL_STATS,
        element: (
          <ProtectedRoute fallback={<AllStatsSkeleton />}>
            <Suspense fallback={<AllStatsSkeleton />}>
              <AllStats />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: PATHS.FLIGHTS,
        element: (
          <ProtectedRoute fallback={<FlightsListSkeleton />}>
            <Suspense fallback={<FlightsListSkeleton />}>
              <Flights />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: PATHS.TOUR,
        element: (
          <ProtectedRoute fallback={<TourSkeleton />}>
            <Suspense fallback={<TourSkeleton />}>
              <WorldTour />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: PATHS.TIMELINE,
        element: (
          <ProtectedRoute fallback={<TimelineSkeleton />}>
            <Suspense fallback={<TimelineSkeleton />}>
              <Timeline />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: PATHS.BADGES,
        element: (
          <ProtectedRoute fallback={<BadgesSkeleton />}>
            <Suspense fallback={<BadgesSkeleton />}>
              <Badges />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: PATHS.LOGIN,
        element: <Login />,
      },
    ],
  },
];

export default routes;
