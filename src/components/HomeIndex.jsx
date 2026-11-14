import { lazy } from "react";
import { Navigate } from "react-router-dom";
import { hasSignedInHint, useAuth } from "../context/AuthContext";
import { PATHS } from "../constants/MyClasses.ts";
import PageSkeleton from "./PageSkeleton.jsx";

const Landing = lazy(() => import("../pages/Landing.jsx"));

// "/" is the URL Google has indexed, so render the landing page there directly
// for logged-out visitors. Redirecting instead left the indexed URL with no
// content of its own and pushed the real content onto /landing, which then fell
// out of the index.
// While auth loads, the landing page shows unless this browser was signed in
// last time. That matches the HTML rendered at build time, so React can adopt
// it, and a returning signed-in visitor sees the skeleton, not the landing.
const HomeIndex = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return hasSignedInHint() ? <PageSkeleton /> : <Landing />;
  }

  return user ? <Navigate to={PATHS.STATS} replace /> : <Landing />;
};

export default HomeIndex;
