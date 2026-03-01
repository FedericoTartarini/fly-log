/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useRef, useState } from "react";

// AuthContext holds the current Firebase user + auth helpers.
const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // Cache Firebase module functions after lazy import to avoid re-imports.
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
    try {
      if (!firebaseRef.current.signOutUser) {
        const firebase = await import("../firebaseClient");
        firebaseRef.current.signOutUser = firebase.signOutUser;
      }

      return await firebaseRef.current.signOutUser();
    } catch (error) {
      console.error("Firebase signOut failed:", error);
      throw error;
    }
  };

  const value = {
    user,
    loading, // Expose loading state
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
