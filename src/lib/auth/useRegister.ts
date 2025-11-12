import { useState, useCallback } from "react";
import { registerWithEmailPassword, type RegisterFormValues, type RegisterResult } from "@/lib/auth/client";

/**
 * Hook dla rejestracji użytkownika przez Supabase Auth.
 * Po rejestracji Supabase automatycznie wysyła email z linkiem potwierdzającym.
 */
export function useRegister() {
  const [loading, setLoading] = useState(false);

  const submit = useCallback(async (values: RegisterFormValues): Promise<RegisterResult> => {
    setLoading(true);
    try {
      const result = await registerWithEmailPassword(values);
      return result;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, submit };
}
