import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Paths } from "../constants/MyClasses.js";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // or a loading spinner
  }

  if (!user) {
    return <Navigate to={Paths.HOME} />;
  }

  return children;
};

export default ProtectedRoute;
