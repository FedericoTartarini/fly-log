import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { PATHS } from "../constants/MyClasses.ts";
import PageSkeleton from "./PageSkeleton.jsx";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageSkeleton />;
  }

  if (!user) {
    return <Navigate to={PATHS.HOME} replace />;
  }

  return children;
};

export default ProtectedRoute;
