import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterSchema } from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import EmailField from "@/components/auth/EmailField";
import PasswordField from "@/components/auth/PasswordField";
import PasswordStrengthIndicator from "@/components/auth/PasswordStrengthIndicator";
import { useRegister } from "@/lib/auth/useRegister";

export default function RegisterForm() {
  const [submitError, setSubmitError] = useState<string | undefined>(undefined);
  const [successAnnounce, setSuccessAnnounce] = useState<string | undefined>(undefined);
  const alertId = useId();
  const alertRef = useRef<HTMLDivElement>(null);
  const { loading, submit } = useRegister();

  const {
    register,
    handleSubmit,
    setFocus,
    watch,
    formState: { errors, isValid },
  } = useForm<RegisterSchema>({
    mode: "onChange",
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  const passwordValue = watch("password");
  const strengthId = useId();

  const onSubmit = useCallback(
    async (values: RegisterSchema) => {
      setSubmitError(undefined);
      setSuccessAnnounce(undefined);
      const result = await submit(values);
      if (result.ok) {
        setSuccessAnnounce(
          "Konto zostało utworzone! Sprawdź swoją skrzynkę email i potwierdź adres, aby się zalogować."
        );
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
          return;
        }
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
          data-test-id="auth-register-error-message"
        >
          {submitError}
        </div>
      ) : (
        <div id={alertId} className="sr-only" aria-live="polite" />
      )}

      {successAnnounce ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-md border border-emerald-300/50 bg-emerald-50 dark:bg-emerald-900/20 p-3 text-sm text-emerald-700 dark:text-emerald-300"
          data-test-id="auth-register-success-message"
        >
          {successAnnounce}
        </div>
      ) : null}

      <EmailField register={register("email")} error={errors.email?.message} disabled={loading} />

      <PasswordField
        id="password"
        label="Hasło"
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
        data-test-id="auth-register-submit-button"
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="animate-spin" />
            Tworzenie konta...
          </span>
        ) : (
          "Zarejestruj się"
        )}
      </Button>
    </form>
  );
}
