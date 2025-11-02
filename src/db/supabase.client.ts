import { createClient } from "@supabase/supabase-js";
import type { Database } from "../db/database.types";

// Use PUBLIC_ prefixed variables for client-side access (required in Astro)
// Fallback to non-prefixed for server-side compatibility
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_KEY || import.meta.env.SUPABASE_KEY;

let supabaseClient: ReturnType<typeof createClient<Database>> | null = null;

if (supabaseUrl && supabaseAnonKey) {
  try {
    supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[supabase.client] Failed to create Supabase client:", error);
  }
} else {
  // eslint-disable-next-line no-console
  console.warn(
    "[supabase.client] PUBLIC_SUPABASE_URL/PUBLIC_SUPABASE_KEY or SUPABASE_URL/SUPABASE_KEY not found in environment variables"
  );
}

export { supabaseClient };

export type SupabaseClient = typeof supabaseClient;

// export const DEFAULT_USER_ID = "07f87b81-32db-46e2-bed4-1fab6cfe3a7f";

export const DEFAULT_USER_ID = "0d42a780-1a70-4051-b7f5-917974a52079";

// Prosty ping do bazy – minimalne zapytanie weryfikujące połączenie
export async function supabasePing() {
  if (!supabaseClient) {
    return { data: null, error: new Error("Supabase client not available") };
  }
  // Możesz zmienić nazwę tabeli jeśli "groups" nie istnieje
  const { data, error } = await supabaseClient.from("groups").select("id").limit(1);
  if (error) {
    // eslint-disable-next-line no-console
    console.error("[supabasePing] error:", error);
  }
  return { data, error };
}
