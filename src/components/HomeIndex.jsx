import { lazy } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { PATHS } from "../constants/MyClasses.ts";
import PageSkeleton from "./PageSkeleton.jsx";

const Landing = lazy(() => import("../pages/Landing.jsx"));

// "/" is the URL Google has indexed, so render the landing page there directly
// for logged-out visitors. Redirecting instead left the indexed URL with no
// content of its own and pushed the real content onto /landing, which then fell
// out of the index.
const HomeIndex = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageSkeleton />;
  }

  return user ? <Navigate to={PATHS.STATS} replace /> : <Landing />;
};

export default HomeIndex;
