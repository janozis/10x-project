import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema, type ForgotPasswordSchema } from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import EmailField from "@/components/auth/EmailField";
import { useForgotPassword } from "@/lib/auth/useForgotPassword";

export default function ForgotPasswordForm() {
  const [submitError, setSubmitError] = useState<string | undefined>(undefined);
  const [successAnnounce, setSuccessAnnounce] = useState<string | undefined>(undefined);
  const alertId = useId();
  const alertRef = useRef<HTMLDivElement>(null);
  const { loading, submit, sent } = useForgotPassword();

  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors, isValid },
  } = useForm<ForgotPasswordSchema>({
    mode: "onChange",
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = useCallback(
    async (values: ForgotPasswordSchema) => {
      setSubmitError(undefined);
      setSuccessAnnounce(undefined);
      const result = await submit(values);
      if (result.ok) {
        setSuccessAnnounce("Jeśli konto istnieje, wysłaliśmy instrukcje resetu na podany adres.");
        return;
      }
      setSubmitError(result.message);
    },
    [submit]
  );

  useEffect(() => {
    if (submitError && alertRef.current) {
      alertRef.current.focus();
    }
  }, [submitError]);

  return (
    <form
      onSubmit={handleSubmit(onSubmit, (errs) => {
        if (errs.email) {
          setFocus("email");
        }
      })}
      noValidate
      className="grid gap-4"
      aria-labelledby={alertId}
    >
      {submitError ? (
        <div
          id={alertId}
          ref={alertRef}
          role="alert"
          aria-live="polite"
          tabIndex={-1}
          className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          data-test-id="auth-forgot-error-message"
        >
          {submitError}
        </div>
      ) : (
        <div id={alertId} className="sr-only" aria-live="polite" />
      )}

      {sent || successAnnounce ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-md border border-emerald-300/50 bg-emerald-50 dark:bg-emerald-900/20 p-3 text-sm text-emerald-700 dark:text-emerald-300"
          data-test-id="auth-forgot-success-message"
        >
          {successAnnounce ?? "Jeśli konto istnieje, wysłaliśmy instrukcje resetu na podany adres."}
        </div>
      ) : null}

      {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
      <EmailField register={register("email")} error={errors.email?.message} disabled={loading} autoFocus />

      <Button
        type="submit"
        disabled={!isValid || loading}
        aria-disabled={!isValid || loading}
        data-test-id="auth-forgot-submit-button"
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="animate-spin" />
            Wysyłanie...
          </span>
        ) : (
          "Wyślij instrukcje"
        )}
      </Button>
    </form>
  );
}
