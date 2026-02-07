import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged as fbOnAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  Timestamp,
  enableIndexedDbPersistence,
} from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBftl7iMtJnmX3D2waYTfdREsIH1IkuvTM",
  authDomain: "fly-log-78b66.firebaseapp.com",
  projectId: "fly-log-78b66",
  storageBucket: "fly-log-78b66.firebasestorage.app",
  messagingSenderId: "1098570639331",
  appId: "1:1098570639331:web:c58bae65c78641e2e122d6",
  measurementId: "G-F88REW0KLN"
};

let app: any = null;
let auth: any = null;
let firestore: any = null;

// Initialize Firebase only when a proper API key is set. This avoids errors in test
// environments where env vars are not configured (Vitest/Node). Callers should mock
// the exported functions in tests.
if (firebaseConfig.apiKey) {
  app = initializeApp(firebaseConfig);
  // Lazily import auth and firestore SDKs
  auth = getAuth(app);
  firestore = getFirestore(app);

  // Try to enable offline persistence for Firestore (IndexedDB). Not fatal if it fails.
  try {
    // @ts-ignore
    enableIndexedDbPersistence(firestore);
  } catch (e) {
    // Persistence can fail if multiple tabs open or unsupported environment; ignore.
    // eslint-disable-next-line no-console
    console.warn("Could not enable Firestore persistence:", e);
  }
}

export { auth, firestore };

const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  if (!auth) throw new Error("Firebase not initialized");
  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (err: any) {
    console.error("signInWithGoogle error:", err);
    // Normalize Firebase errors
    throw new Error(
      err?.code ? `${err.code}: ${err.message}` : err?.message || String(err),
    );
  }
};

export const signInWithEmail = async (email: string, password: string) => {
  if (!auth) throw new Error("Firebase not initialized");
  try {
    return await signInWithEmailAndPassword(auth, email, password);
  } catch (err: any) {
    console.error("signInWithEmail error:", err);
    // Extract useful info from different SDK shapes
    const code = err?.code || "auth/error";
    const tokenMsg =
      err?._tokenResponse?.error?.message || err?.customData?.message;
    const serverMsg = err?.message || tokenMsg || (err && JSON.stringify(err));
    const message = `${code}: ${serverMsg}`;
    throw new Error(message);
  }
};

export const signUpWithEmail = async (email: string, password: string) => {
  if (!auth) throw new Error("Firebase not initialized");
  try {
    return await createUserWithEmailAndPassword(auth, email, password);
  } catch (err: any) {
    console.error("signUpWithEmail error:", err);
    const code = err?.code || "auth/error";
    const tokenMsg =
      err?._tokenResponse?.error?.message || err?.customData?.message;
    const serverMsg = err?.message || tokenMsg || (err && JSON.stringify(err));
    const message = `${code}: ${serverMsg}`;
    throw new Error(message);
  }
};

export const signOutUser = async () => {
  if (!auth) throw new Error("Firebase not initialized");
  return fbSignOut(auth);
};

export const onAuthStateChanged = (cb: (user: any) => void) => {
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
  flights: any[],
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

    for (const f of chunk) {
      const data = { ...f };
      if (data.departure_date) {
        try {
          const d = new Date(data.departure_date);
          if (!isNaN(d.getTime())) {
            data.departure_date = Timestamp.fromDate(d);
          }
        } catch (e) {
          // ignore
        }
      }
      data.created_at = serverTimestamp();
      await addDoc(collection(firestore, "flights", uid, "records"), data);
      processed++;
      if (progressCb)
        progressCb(Math.round((processed / flights.length) * 100));
    }
  }

  if (progressCb) progressCb(100);
};

export const addFlightForUser = async (uid: string, flight: any) => {
  if (!uid) throw new Error("No user ID provided");
  if (!firestore)
    throw new Error(
      "Firestore is not initialized. Please set Firebase config (VITE_FIREBASE_...) and initialize Firebase.",
    );
  const data = { ...flight };
  if (data.departure_date) {
    try {
      const d = new Date(data.departure_date);
      if (!isNaN(d.getTime())) data.departure_date = Timestamp.fromDate(d);
    } catch (e) {
      // ignore
    }
  }
  data.created_at = serverTimestamp();
  return addDoc(collection(firestore, "flights", uid, "records"), data);
};

export { app, serverTimestamp, Timestamp };
