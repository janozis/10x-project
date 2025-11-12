import { createSupabaseBrowserInstance } from "@/db/supabase.client";

export interface LoginFormValues {
  email: string;
  password: string;
}

export type AuthErrorCode = "invalid_credentials" | "too_many_requests" | "network_error" | "unknown_error";

export type LoginResult = { ok: true } | { ok: false; code: AuthErrorCode; message: string };

export async function loginWithEmailPassword(values: LoginFormValues): Promise<LoginResult> {
  try {
    const supabase = createSupabaseBrowserInstance();

    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      if (import.meta.env.DEV) {
        // Avoid logging sensitive credentials; only status and message
        // eslint-disable-next-line no-console
        console.debug("[auth] signInWithPassword error", {
          status: error.status,
          message: error.message,
        });
      }
      const mapped = mapSupabaseError(error);
      return { ok: false, ...mapped };
    }

    return { ok: true };
  } catch (e) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug("[auth] signInWithPassword network/unknown error", e);
    }
    return {
      ok: false,
      code: "network_error",
      message: "Problem z połączeniem. Spróbuj ponownie.",
    };
  }
}

export function isSafeInternalRedirect(redirectTo: string | null | undefined): redirectTo is string {
  if (!redirectTo) return false;
  if (!redirectTo.startsWith("/")) return false;
  if (redirectTo.startsWith("//")) return false; // protocol-relative
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(redirectTo)) return false; // has protocol
  return true;
}

function mapSupabaseError(error: { message: string; status?: number }): {
  code: AuthErrorCode;
  message: string;
} {
  if (error.status === 400 || /Invalid login credentials/i.test(error.message)) {
    return { code: "invalid_credentials", message: "Nieprawidłowy email lub hasło." };
  }
  if (error.status === 429) {
    return { code: "too_many_requests", message: "Zbyt wiele prób. Spróbuj za chwilę." };
  }
  return { code: "unknown_error", message: "Nieoczekiwany błąd. Spróbuj ponownie." };
}

export interface ForgotPasswordFormValues {
  email: string;
}

export type ForgotPasswordErrorCode = "too_many_requests" | "network_error" | "unknown_error";

export type ForgotPasswordResult = { ok: true } | { ok: false; code: ForgotPasswordErrorCode; message: string };

export async function requestPasswordReset(email: string): Promise<ForgotPasswordResult> {
  const supabase = createSupabaseBrowserInstance();

  const origin = typeof window !== "undefined" && window.location?.origin ? window.location.origin : "";
  const redirectTo = origin ? `${origin}/auth/reset-password` : undefined;
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined);
    if (error) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.debug("[auth] resetPasswordForEmail error", { status: error.status, message: error.message });
      }
      const mapped = mapResetPasswordError(error);
      return { ok: false, ...mapped };
    }
    return { ok: true };
  } catch (e) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug("[auth] resetPasswordForEmail network/unknown error", e);
    }
    return { ok: false, code: "network_error", message: "Problem z połączeniem. Spróbuj ponownie." };
  }
}

function mapResetPasswordError(error: { message: string; status?: number }): {
  code: ForgotPasswordErrorCode;
  message: string;
} {
  if (error.status === 429) {
    return { code: "too_many_requests", message: "Zbyt wiele prób. Spróbuj za chwilę." };
  }
  return { code: "unknown_error", message: "Nieoczekiwany błąd. Spróbuj ponownie." };
}

export type ResetPasswordErrorCode =
  | "session_missing"
  | "weak_password"
  | "too_many_requests"
  | "network_error"
  | "unknown_error";

export type ResetPasswordResult = { ok: true } | { ok: false; code: ResetPasswordErrorCode; message: string };

export async function updatePassword(newPassword: string): Promise<ResetPasswordResult> {
  try {
    const supabase = createSupabaseBrowserInstance();

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.debug("[auth] updateUser error", { status: error.status, message: error.message });
      }
      const mapped = mapUpdatePasswordError(error);
      return { ok: false, ...mapped };
    }
    return { ok: true };
  } catch (e) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug("[auth] updateUser network/unknown error", e);
    }
    return { ok: false, code: "network_error", message: "Problem z połączeniem. Spróbuj ponownie." };
  }
}

function mapUpdatePasswordError(error: { message: string; status?: number }): {
  code: ResetPasswordErrorCode;
  message: string;
} {
  if (error.status === 401 || error.status === 403 || /session/i.test(error.message) || /token/i.test(error.message)) {
    return { code: "session_missing", message: "Link wygasł lub jest nieprawidłowy." };
  }
  if (error.status === 400 || error.status === 422 || /password/i.test(error.message)) {
    return { code: "weak_password", message: "Hasło nie spełnia wymagań." };
  }
  if (error.status === 429) {
    return { code: "too_many_requests", message: "Zbyt wiele prób. Spróbuj za chwilę." };
  }
  return { code: "unknown_error", message: "Nieoczekiwany błąd. Spróbuj ponownie." };
}

export interface RegisterFormValues {
  email: string;
  password: string;
  confirmPassword: string;
}

export type RegisterErrorCode =
  | "email_already_exists"
  | "weak_password"
  | "too_many_requests"
  | "network_error"
  | "unknown_error";

export type RegisterResult = { ok: true } | { ok: false; code: RegisterErrorCode; message: string };

/**
 * Rejestracja nowego użytkownika przez Supabase Auth.
 * Supabase domyślnie wysyła email z linkiem potwierdzającym.
 */
export async function registerWithEmailPassword(values: RegisterFormValues): Promise<RegisterResult> {
  try {
    const supabase = createSupabaseBrowserInstance();

    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
    });

    if (error) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.debug("[auth] signUp error", {
          status: error.status,
          message: error.message,
        });
      }
      const mapped = mapRegisterError(error);
      return { ok: false, ...mapped };
    }

    return { ok: true };
  } catch (e) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug("[auth] signUp network/unknown error", e);
    }
    return {
      ok: false,
      code: "network_error",
      message: "Problem z połączeniem. Spróbuj ponownie.",
    };
  }
}

function mapRegisterError(error: { message: string; status?: number }): {
  code: RegisterErrorCode;
  message: string;
} {
  // User already registered
  if (error.status === 400 || /already registered/i.test(error.message) || /already exists/i.test(error.message)) {
    return { code: "email_already_exists", message: "Ten email jest już zarejestrowany." };
  }

  // Weak password (though frontend validation should catch this)
  if (error.status === 422 || /password/i.test(error.message)) {
    return { code: "weak_password", message: "Hasło nie spełnia wymagań bezpieczeństwa." };
  }

  // Rate limiting
  if (error.status === 429) {
    return { code: "too_many_requests", message: "Zbyt wiele prób. Spróbuj za chwilę." };
  }

  return { code: "unknown_error", message: "Nieoczekiwany błąd. Spróbuj ponownie." };
}
