import RegisterForm from "@/components/auth/RegisterForm";

export default function RegisterCard() {
  return (
    <div className="w-full max-w-md rounded-lg border bg-white dark:bg-neutral-950 p-6 shadow-sm md:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Rejestracja</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Utwórz nowe konto, aby rozpocząć planowanie programu HAL.
        </p>
      </header>
      <div className="grid gap-6">
        <RegisterForm />
        <nav aria-label="Pomocnicze linki" className="flex items-center justify-center text-sm">
          <span className="text-neutral-600 dark:text-neutral-400">
            Masz już konto?{" "}
            <a className="text-primary hover:underline" href="/auth/login" data-test-id="auth-register-login-link">
              Zaloguj się
            </a>
          </span>
        </nav>
      </div>
    </div>
  );
}
