import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { PATHS } from "../constants/MyClasses.ts";
import { Center, Loader } from "@mantine/core";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Center>
        <Loader />
      </Center>
    );
  }

  if (!user) {
    return <Navigate to={PATHS.HOME} />;
  }

  return children;
};

export default ProtectedRoute;
