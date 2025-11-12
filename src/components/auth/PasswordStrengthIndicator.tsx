import { useMemo } from "react";
import { Check, X } from "lucide-react";

interface PasswordStrengthIndicatorProps {
  password: string;
  id?: string; // bind to aria-describedby on the input
}

function evaluate(password: string) {
  const lengthOk = password.length >= 8;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const noSpaces = /^\S+$/.test(password) || password.length === 0;
  const checks = [lengthOk, hasLower, hasUpper, hasDigit, noSpaces];
  const score = checks.reduce((s, ok) => s + (ok ? 1 : 0), 0);
  const level = score <= 2 ? "weak" : score === 3 || score === 4 ? "medium" : "strong";
  return { lengthOk, hasLower, hasUpper, hasDigit, noSpaces, score, level } as const;
}

export default function PasswordStrengthIndicator({ password, id }: PasswordStrengthIndicatorProps) {
  const details = useMemo(() => evaluate(password), [password]);

  const levelText = details.level === "weak" ? "Słabe" : details.level === "medium" ? "Średnie" : "Silne";
  const levelColor =
    details.level === "weak"
      ? "text-red-600 dark:text-red-400"
      : details.level === "medium"
        ? "text-amber-600 dark:text-amber-400"
        : "text-emerald-700 dark:text-emerald-300";

  return (
    <div id={id} className="text-xs text-neutral-500 dark:text-neutral-400">
      <div className={`mb-2 font-medium ${levelColor}`}>Siła hasła: {levelText}</div>
      <ul className="space-y-1">
        <Rule ok={details.lengthOk} label="Min. 8 znaków" />
        <Rule ok={details.hasLower} label="Przynajmniej jedna mała litera" />
        <Rule ok={details.hasUpper} label="Przynajmniej jedna wielka litera" />
        <Rule ok={details.hasDigit} label="Przynajmniej jedna cyfra" />
        <Rule ok={details.noSpaces} label="Bez spacji" />
      </ul>
    </div>
  );
}

function Rule({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      {ok ? (
        <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
      ) : (
        <X className="h-3.5 w-3.5 text-neutral-400" />
      )}
      <span className={ok ? "text-neutral-700 dark:text-neutral-300" : ""}>{label}</span>
    </li>
  );
}
