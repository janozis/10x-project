import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

interface ResetPasswordCardProps {
  redirectAfterMs?: number;
}

export default function ResetPasswordCard(_props: ResetPasswordCardProps) {
  return (
    <div className="w-full max-w-md rounded-lg border bg-white dark:bg-neutral-950 p-6 shadow-sm md:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Ustaw nowe hasło</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Ustal nowe hasło dla swojego konta. Po pomyślnej zmianie przekierujemy Cię do logowania.
        </p>
      </header>
      <div className="grid gap-6">
        <ResetPasswordForm />
        <nav aria-label="Pomocnicze linki" className="flex items-center justify-between text-sm">
          <a className="text-primary hover:underline" href="/auth/login">
            Wróć do logowania
          </a>
          <a className="text-primary hover:underline" href="/auth/forgot-password">
            Nie masz linku? Wyślij ponownie
          </a>
        </nav>
      </div>
    </div>
  );
}


