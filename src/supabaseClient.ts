// src/supabaseClient.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Add fallback values for tests
const supabaseUrl: string =
  (import.meta.env?.VITE_SUPABASE_URL as string) || "http://localhost:54321";
const supabaseAnonKey: string =
  (import.meta.env?.VITE_SUPABASE_ANON_KEY as string) || "test-anon-key";

/**
 * The Supabase client instance for database operations.
 * @type {SupabaseClient}
 */
export const supabaseClient: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey,
);
