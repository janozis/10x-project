import { useCallback, useEffect, useState } from "react";
import { supabaseClient } from "@/db/supabase.client";
import { updatePassword } from "@/lib/auth/client";
import type { ResetPasswordSchema } from "@/lib/validation/auth";

interface UseResetPasswordOptions {
  redirectTo?: string;
  redirectAfterMs?: number;
}

interface UseResetPasswordState {
  loading: boolean;
  sessionReady: boolean;
  submitError?: string;
  submitSuccess?: string;
  tokenError?: string;
}

export function useResetPassword(options: UseResetPasswordOptions = {}) {
  const { redirectTo = "/login", redirectAfterMs = 2000 } = options;

  const [state, setState] = useState<UseResetPasswordState>({
    loading: false,
    sessionReady: false,
  });

  useEffect(() => {
    let cancelled = false;

    async function ensureSession() {
      // 1) Check existing session
      const { data: sessionData } = await supabaseClient.auth.getSession();
      if (!cancelled && sessionData?.session) {
        setState((s) => ({ ...s, sessionReady: true, tokenError: undefined }));
        return;
      }

      // 2) Try exchange code from URL (Supabase Magic Link style)
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        if (code) {
          const { data, error } = await supabaseClient.auth.exchangeCodeForSession(code);
          if (!cancelled && data?.session && !error) {
            setState((s) => ({ ...s, sessionReady: true, tokenError: undefined }));
            return;
          }
        }
      } catch (e) {
        // ignore URL parse errors
      }

      // 3) Fallback: short delay and re-check in case SDK auto-initialized from hash
      await new Promise((r) => setTimeout(r, 250));
      const { data: recheck } = await supabaseClient.auth.getSession();
      if (!cancelled && recheck?.session) {
        setState((s) => ({ ...s, sessionReady: true, tokenError: undefined }));
        return;
      }

      if (!cancelled) {
        setState((s) => ({ ...s, sessionReady: false, tokenError: "Link wygasł lub jest nieprawidłowy." }));
      }
    }

    void ensureSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = useCallback(async (values: ResetPasswordSchema) => {
    // Prevent submission when no active reset session
    const { sessionReady } = state;
    if (!sessionReady) {
      setState((s) => ({ ...s, submitError: "Link wygasł lub jest nieprawidłowy.", submitSuccess: undefined }));
      return;
    }

    setState((s) => ({ ...s, loading: true, submitError: undefined, submitSuccess: undefined }));

    const result = await updatePassword(values.password);
    if (!result.ok) {
      const msg = result.code === "weak_password"
        ? "Hasło nie spełnia wymagań."
        : result.code === "too_many_requests"
        ? "Zbyt wiele prób. Spróbuj za chwilę."
        : result.code === "session_missing"
        ? "Link wygasł lub jest nieprawidłowy."
        : "Nieoczekiwany błąd. Spróbuj ponownie.";

      setState((s) => ({ ...s, loading: false, submitError: msg }));

      if (result.code === "session_missing") {
        setState((s) => ({ ...s, sessionReady: false, tokenError: msg }));
      }
      return;
    }

    setState((s) => ({ ...s, loading: false, submitSuccess: "Hasło zostało zmienione." }));

    // Ensure old session is closed and redirect back to login
    try {
      await supabaseClient.auth.signOut();
    } catch {
      // ignore
    }
    window.setTimeout(() => {
      try {
        window.location.assign(redirectTo);
      } catch {
        // ignore
      }
    }, redirectAfterMs);
  }, [redirectAfterMs, redirectTo, state]);

  const resetMessages = useCallback(() => {
    setState((s) => ({ ...s, submitError: undefined, submitSuccess: undefined }));
  }, []);

  return {
    ...state,
    submit,
    resetMessages,
  };
}


