import { useEffect } from "react";
import LoginForm from "@/components/auth/LoginForm";
import { isSafeInternalRedirect } from "@/lib/auth/client";
import { supabaseClient } from "@/db/supabase.client";

interface LoginCardProps {
  redirectTo?: string;
}

export default function LoginCard(props: LoginCardProps) {
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const { data } = await supabaseClient.auth.getSession();
      if (!isMounted) return;
      if (data.session) {
        const target = isSafeInternalRedirect(props.redirectTo) ? props.redirectTo : "/";
        window.location.replace(target);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [props.redirectTo]);

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
          <a className="text-primary hover:underline" href="/forgot-password">
            Zapomniałeś hasła?
          </a>
          <a className="text-primary hover:underline" href="/register">
            Zarejestruj się
          </a>
        </nav>
      </div>
    </div>
  );
}
