/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useRef, useState } from "react";

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const firebaseRef = useRef({ onAuthStateChanged: null, signOutUser: null });

  useEffect(() => {
    let mounted = true;
    let unsubscribe = () => {};
    setLoading(true);

    const initAuth = async () => {
      try {
        const firebase = await import("../firebaseClient");
        if (!mounted) return;

        firebaseRef.current = {
          onAuthStateChanged: firebase.onAuthStateChanged,
          signOutUser: firebase.signOutUser,
        };

        unsubscribe = firebase.onAuthStateChanged((firebaseUser) => {
          setUser(firebaseUser ?? null);
          setLoading(false);
        });
      } catch (error) {
        console.warn("Firebase auth init failed:", error);
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const signOut = async () => {
    if (!firebaseRef.current.signOutUser) {
      const firebase = await import("../firebaseClient");
      firebaseRef.current.signOutUser = firebase.signOutUser;
      if (!firebaseRef.current.onAuthStateChanged) {
        firebaseRef.current.onAuthStateChanged = firebase.onAuthStateChanged;
      }
    }

    return firebaseRef.current.signOutUser();
  };

  const value = {
    user,
    loading, // Expose loading state
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
