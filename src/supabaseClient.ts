// src/supabaseClient.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Get environment variable from Vite or Node.js process.
 * @param {string} key - The environment variable key
 * @param {string} fallback - The fallback value if not set
 * @returns {string}
 */
const getEnv = (key: string, fallback: string): string => {
  // @ts-ignore
  if (
    typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env[key]
  ) {
    // @ts-ignore
    return import.meta.env[key] as string;
  }
  if (typeof process !== "undefined" && process.env && process.env[key]) {
    return process.env[key] as string;
  }
  return fallback;
};

const supabaseUrl: string = getEnv(
  "VITE_SUPABASE_URL",
  "http://localhost:54321",
);
const supabaseAnonKey: string = getEnv(
  "VITE_SUPABASE_ANON_KEY",
  "test-anon-key",
);

/**
 * The Supabase client instance for database operations.
 * @type {SupabaseClient}
 */
export const supabaseClient: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey,
);
