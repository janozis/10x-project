import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginSchema } from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useLogin } from "@/lib/auth/useLogin";
import EmailField from "@/components/auth/EmailField";
import PasswordField from "@/components/auth/PasswordField";

interface LoginFormProps {
  redirectTo?: string;
}

export default function LoginForm(props: LoginFormProps) {
  const [submitError, setSubmitError] = useState<string | undefined>(undefined);
  const [successAnnounce, setSuccessAnnounce] = useState<string | undefined>(undefined);
  const alertId = useId();
  const alertRef = useRef<HTMLDivElement>(null);
  const { submit } = useLogin();

  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors, isSubmitting, isValid },
  } = useForm<LoginSchema>({
    mode: "onChange",
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = useCallback(
    async (values: LoginSchema) => {
      setSubmitError(undefined);
      setSuccessAnnounce(undefined);
      const result = await submit(values, props.redirectTo, () => {
        setSuccessAnnounce("Zalogowano. Przekierowuję...");
      });
      if (!result.ok) {
        setSubmitError(result.message);
      }
    },
    [submit, props.redirectTo]
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
          data-test-id="auth-login-error-message"
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
          data-test-id="auth-login-success-message"
        >
          {successAnnounce}
        </div>
      ) : null}

      {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
      <EmailField register={register("email")} error={errors.email?.message} disabled={isSubmitting} autoFocus />

      <PasswordField register={register("password")} error={errors.password?.message} disabled={isSubmitting} />

      <Button
        type="submit"
        disabled={!isValid || isSubmitting}
        aria-disabled={!isValid || isSubmitting}
        data-test-id="auth-login-submit-button"
      >
        {isSubmitting ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="animate-spin" />
            Logowanie...
          </span>
        ) : (
          "Zaloguj"
        )}
      </Button>
    </form>
  );
}
