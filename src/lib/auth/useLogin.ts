import { useState, useCallback } from "react";
import { loginWithEmailPassword, isSafeInternalRedirect, type LoginFormValues, type LoginResult } from "@/lib/auth/client";

export function useLogin() {
  const [loading, setLoading] = useState(false);

  const submit = useCallback(async (
    values: LoginFormValues,
    redirectTo?: string,
    onRedirect?: () => void
  ): Promise<LoginResult> => {
    setLoading(true);
    try {
      const result = await loginWithEmailPassword(values);
      if (result.ok) {
        const target = isSafeInternalRedirect(redirectTo) ? redirectTo : "/";
        if (onRedirect) onRedirect();
        setTimeout(() => {
          window.location.assign(target);
        }, 0);
      }
      return result;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, submit };
}


