import { createClient } from "@supabase/supabase-js";
import type { Database } from "../db/database.types";

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);

export type SupabaseClient = typeof supabaseClient;

// export const DEFAULT_USER_ID = "07f87b81-32db-46e2-bed4-1fab6cfe3a7f";

export const DEFAULT_USER_ID = "a7a0c17c-69e9-49a3-8b8e-5926b825a021";

// Prosty ping do bazy – minimalne zapytanie weryfikujące połączenie
export async function supabasePing() {
  // Możesz zmienić nazwę tabeli jeśli "groups" nie istnieje
  const { data, error } = await supabaseClient.from("groups").select("id").limit(1);
  if (error) {
    // Lekki log (możesz zastąpić loggerem)
    console.error("[supabasePing] error:", error);
  }
  return { data, error };
}
