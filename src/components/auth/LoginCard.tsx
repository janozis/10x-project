import LoginForm from "@/components/auth/LoginForm";

interface LoginCardProps {
  redirectTo?: string;
}

export default function LoginCard(props: LoginCardProps) {
  // Remove automatic redirect on mount - only redirect after successful login
  // The LoginForm component will handle the redirect after authentication
  
  return (
    <div
      data-redirect-to={props.redirectTo ?? undefined}
      className="w-full max-w-md rounded-lg border bg-white dark:bg-neutral-950 p-6 shadow-sm md:p-8"
    >
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Zaloguj się</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Wpisz email i hasło, aby kontynuować.</p>
      </header>
      <div className="grid gap-6">
        <LoginForm redirectTo={props.redirectTo} />
        <nav aria-label="Pomocnicze linki" className="flex items-center justify-between text-sm">
          <a className="text-primary hover:underline" href="/auth/forgot-password">
            Zapomniałeś hasła?
          </a>
          <a className="text-primary hover:underline" href="/auth/register">
            Zarejestruj się
          </a>
        </nav>
      </div>
    </div>
  );
}
