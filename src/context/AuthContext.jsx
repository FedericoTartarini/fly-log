/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useRef, useState } from "react";

// AuthContext holds the current Firebase user + auth helpers.
const AuthContext = createContext({});

// Must match the key read by the inline script in index.html.
const SIGNED_IN_HINT_KEY = "fly-log:signed-in";

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
          // Read by index.html before React loads, to skip painting the
          // signed-out landing copy for returning signed-in users.
          try {
            if (firebaseUser) localStorage.setItem(SIGNED_IN_HINT_KEY, "1");
            else localStorage.removeItem(SIGNED_IN_HINT_KEY);
          } catch {
            // Storage blocked (private mode); the hint is only cosmetic.
          }
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
