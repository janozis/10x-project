import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordSchema, type ResetPasswordSchema } from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import PasswordField from "@/components/auth/PasswordField";
import { useResetPassword } from "@/lib/auth/useResetPassword";
import PasswordStrengthIndicator from "@/components/auth/PasswordStrengthIndicator";

export default function ResetPasswordForm() {
  const { loading, sessionReady, submit, submitError: hookError, submitSuccess, tokenError } = useResetPassword();

  const [submitError, setSubmitError] = useState<string | undefined>(undefined);
  const alertId = useId();
  const alertRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    setFocus,
    watch,
    formState: { errors, isValid },
  } = useForm<ResetPasswordSchema>({
    mode: "onChange",
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const passwordValue = watch("password");
  const strengthId = useId();

  useEffect(() => {
    setSubmitError(hookError);
  }, [hookError]);

  useEffect(() => {
    if (submitError && alertRef.current) {
      alertRef.current.focus();
    }
  }, [submitError]);

  useEffect(() => {
    if (submitSuccess && successRef.current) {
      successRef.current.focus();
    }
  }, [submitSuccess]);

  const onSubmit = useCallback(
    async (values: ResetPasswordSchema) => {
      setSubmitError(undefined);
      await submit(values);
    },
    [submit]
  );

  // When no valid reset session, show message instead of form
  if (!sessionReady) {
    return (
      <div className="grid gap-4" aria-labelledby={alertId}>
        <div
          id={alertId}
          ref={alertRef}
          role="alert"
          aria-live="polite"
          tabIndex={-1}
          className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          data-test-id="auth-reset-token-error-message"
        >
          {tokenError ?? "Link wygasł lub jest nieprawidłowy."}
        </div>
        <div className="text-sm">
          Kontynuuj do{" "}
          <a className="text-primary hover:underline" href="/auth/forgot-password">
            ponownego resetu hasła
          </a>
          .
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit, (errs) => {
        if (errs.password) {
          setFocus("password");
          return;
        }
        if (errs.confirmPassword) {
          setFocus("confirmPassword");
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
          data-test-id="auth-reset-error-message"
        >
          {submitError}
        </div>
      ) : (
        <div id={alertId} className="sr-only" aria-live="polite" />
      )}

      {submitSuccess ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-md border border-emerald-300/50 bg-emerald-50 dark:bg-emerald-900/20 p-3 text-sm text-emerald-700 dark:text-emerald-300"
          ref={successRef}
          tabIndex={-1}
          data-test-id="auth-reset-success-message"
        >
          {submitSuccess}
        </div>
      ) : null}

      <PasswordField
        id="new-password"
        label="Nowe hasło"
        autoComplete="new-password"
        register={register("password")}
        error={errors.password?.message}
        disabled={loading}
        additionalDescribedByIds={[strengthId]}
      />

      <PasswordStrengthIndicator id={strengthId} password={passwordValue} />

      <PasswordField
        id="confirm-password"
        label="Powtórz hasło"
        autoComplete="new-password"
        register={register("confirmPassword")}
        error={errors.confirmPassword?.message}
        disabled={loading}
        showToggle={false}
      />

      <Button
        type="submit"
        disabled={!isValid || loading}
        aria-disabled={!isValid || loading}
        data-test-id="auth-reset-submit-button"
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="animate-spin" />
            Zmienianie hasła...
          </span>
        ) : (
          "Ustaw nowe hasło"
        )}
      </Button>
    </form>
  );
}
