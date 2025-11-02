import { useCallback, useState } from "react";
import { requestPasswordReset, type ForgotPasswordFormValues, type ForgotPasswordResult } from "@/lib/auth/client";

export function useForgotPassword() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = useCallback(async (values: ForgotPasswordFormValues): Promise<ForgotPasswordResult> => {
    setLoading(true);
    try {
      const result = await requestPasswordReset(values.email);
      if (result.ok) {
        setSent(true);
      }
      return result;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, sent, submit };
}


