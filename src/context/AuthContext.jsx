/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOutUser } from "../firebaseClient";

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser ?? null);
      setSession(firebaseUser ?? null);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    session,
    user,
    loading, // Expose loading state
    signOut: () => signOutUser(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
