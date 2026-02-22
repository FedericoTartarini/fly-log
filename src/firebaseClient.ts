import { initializeApp } from "firebase/app";
import type { FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged as fbOnAuthStateChanged,
} from "firebase/auth";
import type { Auth, User } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  collection,
  addDoc,
  doc,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import type { Firestore } from "firebase/firestore";

// Read Vite env vars
const getEnv = (key: string, fallback = ""): string => {
  // @ts-expect-error - Vite injects import.meta.env at build time
  if (typeof import.meta !== "undefined" && import.meta.env?.[key]) {
    // @ts-expect-error - Vite injects import.meta.env at build time
    return import.meta.env[key] as string;
  }
  if (typeof process !== "undefined" && process.env?.[key]) {
    return process.env[key] as string;
  }
  return fallback;
};

const firebaseConfig = {
  apiKey: getEnv("VITE_FIREBASE_API_KEY", ""),
  authDomain: getEnv("VITE_FIREBASE_AUTH_DOMAIN", ""),
  projectId: getEnv("VITE_FIREBASE_PROJECT_ID", ""),
  storageBucket: getEnv("VITE_FIREBASE_STORAGE_BUCKET", ""),
  messagingSenderId: getEnv("VITE_FIREBASE_MESSAGING_SENDER_ID", ""),
  appId: getEnv("VITE_FIREBASE_APP_ID", ""),
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let firestore: Firestore | null = null;

// Initialize Firebase only when a proper API key is set. This avoids errors in test
// environments where env vars are not configured (Vitest/Node). Callers should mock
// the exported functions in tests.
if (firebaseConfig.apiKey) {
  app = initializeApp(firebaseConfig);
  // Lazily import auth and firestore SDKs
  auth = getAuth(app);
  try {
    firestore = initializeFirestore(app, {
      localCache: persistentLocalCache(),
    });
  } catch (error) {
    // Persistence can fail if multiple tabs open or unsupported environment; ignore.
    console.warn("Could not enable Firestore persistence:", error);
  }
}

export { auth, firestore };

const googleProvider = new GoogleAuthProvider();

type FirebaseErrorLike = {
  code?: string;
  message?: string;
  _tokenResponse?: { error?: { message?: string } };
  customData?: { message?: string };
};

const getFirebaseErrorInfo = (err: unknown) => {
  if (!err || typeof err !== "object") {
    return { code: "auth/error", message: String(err) };
  }
  const error = err as FirebaseErrorLike;
  const code = error.code ?? "auth/error";
  const tokenMsg =
    error._tokenResponse?.error?.message || error.customData?.message;
  const serverMsg = error.message || tokenMsg || JSON.stringify(error);
  return { code, message: serverMsg };
};

export const signInWithGoogle = async () => {
  if (!auth) throw new Error("Firebase not initialized");
  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (err: unknown) {
    console.error("signInWithGoogle error:", err);
    const { code, message } = getFirebaseErrorInfo(err);
    throw new Error(`${code}: ${message}`);
  }
};

export const signInWithEmail = async (email: string, password: string) => {
  if (!auth) throw new Error("Firebase not initialized");
  try {
    return await signInWithEmailAndPassword(auth, email, password);
  } catch (err: unknown) {
    console.error("signInWithEmail error:", err);
    const { code, message } = getFirebaseErrorInfo(err);
    throw new Error(`${code}: ${message}`);
  }
};

export const signUpWithEmail = async (email: string, password: string) => {
  if (!auth) throw new Error("Firebase not initialized");
  try {
    return await createUserWithEmailAndPassword(auth, email, password);
  } catch (err: unknown) {
    console.error("signUpWithEmail error:", err);
    const { code, message } = getFirebaseErrorInfo(err);
    throw new Error(`${code}: ${message}`);
  }
};

export const signOutUser = async () => {
  if (!auth) throw new Error("Firebase not initialized");
  return fbSignOut(auth);
};

export const onAuthStateChanged = (cb: (user: User | null) => void) => {
  if (!auth) {
    // In non-initialized environments, call back with null and return a noop unsubscribe
    cb(null);
    return () => {};
  }
  return fbOnAuthStateChanged(auth, cb);
};

/**
 * Add many flights for a given user using batched writes in chunks (max 500 per batch).
 * Each flight will get a serverTimestamp() on `created_at` and departure_date will be
 * saved as a Firestore Timestamp when possible.
 *
 * @param uid - user id
 * @param flights - array of flight objects
 * @param progressCb - optional callback(progressPercent:number)
 */
export const addFlightsForUser = async (
  uid: string,
  flights: Array<{ departure_date?: unknown } & Record<string, unknown>>,
  progressCb?: (p: number) => void,
) => {
  if (!uid) throw new Error("No user ID provided");
  if (!firestore)
    throw new Error(
      "Firestore is not initialized. Please set Firebase config (VITE_FIREBASE_...) and initialize Firebase.",
    );
  const chunkSize = 450; // keep below 500 to be safe
  let processed = 0;

  for (let i = 0; i < flights.length; i += chunkSize) {
    const chunk = flights.slice(i, i + chunkSize);
    const batch = writeBatch(firestore);
    const recordsCol = collection(firestore, "flights", uid, "records");

    for (const f of chunk) {
      const data: { departure_date?: unknown } & Record<string, unknown> = {
        ...f,
      };
      if (data.departure_date) {
        try {
          const d = new Date(data.departure_date as string);
          if (!isNaN(d.getTime())) {
            data.departure_date = Timestamp.fromDate(d);
          }
        } catch {
          // ignore
        }
      }
      data.created_at = serverTimestamp();
      batch.set(doc(recordsCol), data);
    }

    await batch.commit();
    processed += chunk.length;
    if (progressCb) progressCb(Math.round((processed / flights.length) * 100));
  }

  if (progressCb) progressCb(100);
};

export const addFlightForUser = async (
  uid: string,
  flight: { departure_date?: unknown } & Record<string, unknown>,
) => {
  if (!uid) throw new Error("No user ID provided");
  if (!firestore)
    throw new Error(
      "Firestore is not initialized. Please set Firebase config (VITE_FIREBASE_...) and initialize Firebase.",
    );
  const data: { departure_date?: unknown } & Record<string, unknown> = {
    ...flight,
  };
  if (data.departure_date) {
    try {
      const d = new Date(data.departure_date as string);
      if (!isNaN(d.getTime())) data.departure_date = Timestamp.fromDate(d);
    } catch {
      // ignore
    }
  }
  data.created_at = serverTimestamp();
  return addDoc(collection(firestore, "flights", uid, "records"), data);
};

export { app, serverTimestamp, Timestamp };
