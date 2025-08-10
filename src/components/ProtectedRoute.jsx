import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { PATHS } from "../constants/MyClasses.ts";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // or a loading spinner
  }

  if (!user) {
    return <Navigate to={PATHS.HOME} />;
  }

  return children;
};

export default ProtectedRoute;
