import type { AstroCookies } from "astro";
import { createBrowserClient, createServerClient, type CookieOptionsWithName } from "@supabase/ssr";
import type { Database } from "../db/database.types";

// Use PUBLIC_ prefixed variables for client-side access (required in Astro)
// Fallback to non-prefixed for server-side compatibility
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_KEY || import.meta.env.SUPABASE_KEY;

export const cookieOptions: CookieOptionsWithName = {
  path: "/",
  secure: true,
  httpOnly: true,
  sameSite: "lax",
};

function parseCookieHeader(cookieHeader: string): { name: string; value: string }[] {
  return cookieHeader.split(";").map((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    return { name, value: rest.join("=") };
  });
}

/**
 * Create Supabase client for server-side operations (API routes, middleware, Astro pages).
 * Manages session via httpOnly cookies for security.
 */
export const createSupabaseServerInstance = (context: { headers: Headers; cookies: AstroCookies }) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_KEY environment variables");
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookieOptions,
    cookies: {
      getAll() {
        return parseCookieHeader(context.headers.get("Cookie") ?? "");
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => context.cookies.set(name, value, options));
      },
    },
  });

  return supabase;
};

/**
 * Create Supabase client for client-side operations (React components).
 * Manages session via localStorage by default.
 */
export const createSupabaseBrowserInstance = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_KEY environment variables");
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
};

// Legacy client for backward compatibility - to be phased out
// For now, keep it for services that haven't migrated yet
let supabaseClient: ReturnType<typeof createSupabaseBrowserInstance> | null = null;

if (supabaseUrl && supabaseAnonKey) {
  try {
    supabaseClient = createSupabaseBrowserInstance();
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

// Default user ID for backward compatibility with services not yet migrated to full auth
// After login, ctx.locals.user.id will contain the real authenticated user ID
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
