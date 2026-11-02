import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { PATHS } from "../constants/MyClasses.ts";
import PageSkeleton from "./PageSkeleton.jsx";

// fallback lets a route show its own skeleton while auth resolves.
const ProtectedRoute = ({ children, fallback = <PageSkeleton /> }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return fallback;
  }

  if (!user) {
    return <Navigate to={PATHS.HOME} replace />;
  }

  return children;
};

export default ProtectedRoute;
