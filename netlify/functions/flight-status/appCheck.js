import { createRemoteJWKSet, jwtVerify } from "jose";

// App Check tokens are RS256 JWTs signed by Firebase. Verifying one needs only
// Firebase's public keys, so this deliberately avoids firebase-admin and the
// service-account secret it would require.
const JWKS_URL = "https://firebaseappcheck.googleapis.com/v1/jwks";

// createRemoteJWKSet caches the key set and refetches only when it meets an
// unknown `kid`, so a warm invocation verifies with no network round trip.
let jwks;
const getJwks = () => (jwks ??= createRemoteJWKSet(new URL(JWKS_URL)));

/**
 * Verifies a Firebase App Check token.
 *
 * Both identifiers below are public (they ship in the client bundle already),
 * which is why the server can reuse the VITE_-prefixed vars rather than
 * duplicating project config under a second set of names. The RapidAPI key is
 * the only actual secret this function reads.
 *
 * @param token - the raw X-Firebase-AppCheck header value, if any
 * @returns `{ ok: true }`, or `{ ok: false, status, error }` for the caller
 *          to turn into a response
 */
export const verifyAppCheckToken = async (token) => {
  const projectNumber = process.env.VITE_FIREBASE_MESSAGING_SENDER_ID;
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;

  // Fail closed. A missing project id would otherwise leave the audience
  // unconstrained, which would accept a token minted for any Firebase project.
  if (!projectNumber || !projectId) {
    console.error(
      "App Check cannot be verified: VITE_FIREBASE_MESSAGING_SENDER_ID or VITE_FIREBASE_PROJECT_ID is not set for this function",
    );
    return { ok: false, status: 500, error: "App Check is not configured" };
  }

  if (!token) {
    return { ok: false, status: 401, error: "Missing App Check token" };
  }

  try {
    await jwtVerify(token, getJwks(), {
      algorithms: ["RS256"],
      issuer: `https://firebaseappcheck.googleapis.com/${projectNumber}`,
      audience: [`projects/${projectNumber}`, `projects/${projectId}`],
    });
    return { ok: true };
  } catch (err) {
    // Expected for an expired or replayed token, so this is not an error the
    // operator needs to act on - but the reason is worth having in the log.
    console.warn("App Check verification failed:", err?.code ?? err?.message);
    return { ok: false, status: 401, error: "Invalid App Check token" };
  }
};
