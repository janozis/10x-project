import { useId, useState } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";

interface PasswordFieldProps {
  register: UseFormRegisterReturn;
  error?: string;
  disabled?: boolean;
  showToggle?: boolean;
  id?: string;
  label?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  additionalDescribedByIds?: string[];
}

export default function PasswordField({ register, error, disabled, showToggle = true, id = "password", label = "Hasło", autoComplete = "current-password", autoFocus, additionalDescribedByIds = [] }: PasswordFieldProps) {
  const errorId = useId();
  const [showPassword, setShowPassword] = useState(false);
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type={showPassword ? "text" : "password"}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          className="h-9 rounded-md border px-3 py-2 text-sm outline-none focus-visible:border-ring flex-1"
          aria-invalid={error ? "true" : undefined}
          aria-describedby={[error ? errorId : undefined, ...additionalDescribedByIds].filter(Boolean).join(" ") || undefined}
          disabled={disabled}
          {...register}
        />
        {showToggle ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowPassword((v) => !v)}
            aria-pressed={showPassword}
            aria-label={showPassword ? "Ukryj hasło" : "Pokaż hasło"}
            disabled={disabled}
          >
            {showPassword ? "Ukryj" : "Pokaż"}
          </Button>
        ) : null}
      </div>
      {error ? (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}


