import { useId } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";

interface EmailFieldProps {
  register: UseFormRegisterReturn;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

export default function EmailField({ register, error, disabled, autoFocus }: EmailFieldProps) {
  const errorId = useId();
  return (
    <div className="grid gap-2">
      <label htmlFor="email" className="text-sm font-medium">
        Email
      </label>
      <input
        id="email"
        type="email"
        autoComplete="email"
        autoFocus={autoFocus}
        className="h-9 rounded-md border px-3 py-2 text-sm outline-none focus-visible:border-ring"
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? errorId : undefined}
        disabled={disabled}
        data-test-id="auth-email-input"
        {...register}
      />
      {error ? (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}


