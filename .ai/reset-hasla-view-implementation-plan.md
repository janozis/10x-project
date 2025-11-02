# Plan implementacji widoku Reset hasła – zapomniane

## 1. Przegląd
Widok służy do rozpoczęcia procesu resetu hasła w Supabase. Użytkownik wpisuje adres email, a aplikacja uruchamia wysyłkę maila resetującego z linkiem kierującym na stronę ustawienia nowego hasła. Interfejs wyświetla neutralny komunikat po wysłaniu formularza, bez ujawniania czy konto istnieje. Zapewniamy poprawną walidację, dostępność i obsługę błędów sieciowych oraz limitów.

## 2. Routing widoku
- Ścieżka: `/forgot-password`
- Plik strony: `src/pages/forgot-password.astro`
- SSR: `export const prerender = false;`
- Strona docelowa z linku w mailu resetującym (już istniejąca): `src/pages/reset-password.astro` (`/reset-password`)

## 3. Struktura komponentów
- `src/pages/forgot-password.astro`
  - Używa layoutu `src/layouts/Layout.astro`
  - Montuje wyspę React: `ForgotPasswordCard` (client:load)
- `src/components/auth/ForgotPasswordCard.tsx`
  - Kontener karty z nagłówkiem, opisem i formularzem
  - Dodatkowe linki nawigacyjne (powrót do logowania, rejestracja)
- `src/components/auth/ForgotPasswordForm.tsx`
  - Formularz z polem email i przyciskiem submit
  - Walidacja z Zod, integracja z Supabase Auth
- Reużyte komponenty
  - `src/components/auth/EmailField.tsx` – pole email (z błędami a11y)
  - `src/components/ui/button.tsx` – przyciski
- Komponent informacji/komunikatów
  - Prosty inline alert/sukces (Tailwind) lub opcjonalnie `Toast` (jeśli dodamy shadcn/ui toast później)

## 4. Szczegóły komponentów
### ForgotPasswordPage (`src/pages/forgot-password.astro`)
- Opis: Strona Astro renderująca layout i wyspę React z kartą resetu.
- Główne elementy: Layout, `<main>` z centrowaniem, `<ForgotPasswordCard client:load />`.
- Zdarzenia: Brak (interakcje w komponencie React).
- Walidacja: Brak (delegowana do formularza).
- Typy: Brak dodatkowych.
- Propsy: Brak.

### ForgotPasswordCard (`src/components/auth/ForgotPasswordCard.tsx`)
- Opis: Wizualna karta z nagłówkiem, krótkim opisem i formularzem resetu.
- Główne elementy: tytuł „Reset hasła”, opis procesu, `<ForgotPasswordForm />`, nawigacja: link do logowania (`/login`), rejestracji (`/register`).
- Zdarzenia: Brak bezpośrednich; renderuje formularz i linki.
- Walidacja: Brak (delegowana do formularza).
- Typy: Brak specjalnych.
- Propsy: Opcjonalnie `className?: string` (jeśli potrzebne).

### ForgotPasswordForm (`src/components/auth/ForgotPasswordForm.tsx`)
- Opis: Interaktywny formularz do uruchomienia resetu hasła.
- Główne elementy:
  - `EmailField` z błędami (aria-invalid, aria-describedby)
  - `Button` submit (z disabled podczas ładowania lub nieważnego formularza)
  - Inline neutralny komunikat po wysłaniu (aria-live="polite")
- Obsługiwane interakcje:
  - `onSubmit(values)` → wywołuje Supabase `auth.resetPasswordForEmail`
  - Blokuje przycisk podczas `loading`
  - Po sukcesie: pokazuje neutralny komunikat i opcjonalnie resetuje formularz; może zablokować kolejne wysyłki przez krótki czas (throttle)
- Obsługiwana walidacja (Zod):
  - `email`: wymagany, `z.string().email("Nieprawidłowy email")`
  - Walidacja uruchamiana onBlur i onSubmit; komunikaty inline nad/po polu
- Typy:
  - `ForgotPasswordFormValues` – `{ email: string }`
  - `ForgotPasswordResult` – `{ ok: true } | { ok: false; code: "too_many_requests" | "network_error" | "unknown_error"; message: string }`
- Propsy (interfejs):
  - `onSuccess?: () => void` (opcjonalne, np. do analityki)
  - `initialEmail?: string` (opcjonalny prefill)

## 5. Typy
- `ForgotPasswordFormValues`
  - `email: string` – adres email użytkownika
- `ForgotPasswordResult`
  - `ok: true` – sukces (niezależnie, czy konto istnieje)
  - lub `ok: false` z polami:
    - `code`: "too_many_requests" | "network_error" | "unknown_error"
    - `message`: przyjazny komunikat dla użytkownika (bez ujawniania istnienia konta)
- Reużycie istniejących typów:
  - `SupabaseClient` z `src/db/supabase.client.ts`
  - Ewentualne wspólne kody błędów z `AuthErrorCode` (jeśli planujemy zunifikować)

## 6. Zarządzanie stanem
- Lokalny stan w komponencie + dedykowany hook `useForgotPassword` w `src/lib/auth`:
  - `loading: boolean` – status wysyłki
  - `sent: boolean` – czy pokazujemy neutralny komunikat po wysłaniu
  - `submit(values): Promise<ForgotPasswordResult>` – procedura wysyłki
  - Opcjonalnie `cooldownUntil?: number` – znacznik czasu do ponownej próby (throttle 30–60s)
- Uzasadnienie: prosty formularz, brak potrzeby globalnego store.

## 7. Integracja API
- Wywołanie: `supabaseClient.auth.resetPasswordForEmail(email, { redirectTo })`
  - `redirectTo`: `${window.location.origin}/reset-password` (kieruje do istniejącej strony ustawiania nowego hasła)
- Wejście (request): `{ email: string }`
- Wyjście (response): brak danych; tylko `error` w razie niepowodzenia
- Mapowanie błędów:
  - `status === 429` → `too_many_requests` (komunikat: „Zbyt wiele prób. Spróbuj za chwilę.”)
  - Brak łączności/wyjątek → `network_error` (komunikat: „Problem z połączeniem. Spróbuj ponownie.”)
  - Inne → `unknown_error` (komunikat neutralny)
- Zasada bezpieczeństwa: niezależnie od istnienia konta po sukcesie/niektórych błędach pokazujemy neutralny komunikat „Jeśli konto istnieje, wysłaliśmy instrukcje resetu”.

## 8. Interakcje użytkownika
- Wpisanie emaila → walidacja onBlur (format), komunikat błędu pod polem
- Kliknięcie „Wyślij instrukcje” → `loading=true`, przycisk disabled
- Sukces lub neutralna odpowiedź → komunikat: „Jeśli konto istnieje, wysłaliśmy instrukcje resetu na podany adres.”
- Błąd sieci/limitów → uprzejmy komunikat błędu (bez ujawniania istnienia konta), możliwość ponowienia po czasie
- Linki pomocnicze: powrót do logowania, rejestracja

## 9. Warunki i walidacja
- `email` wymagany, poprawny RFC (Zod `.email()`)
- Przycisk submit disabled, gdy formularz nieważny lub `loading`
- Po wysyłce można włączyć prosty throttle (np. 60s) przeciw błędom 429
- A11y: `aria-invalid`, `aria-describedby` dla błędów, `aria-live="polite"` dla komunikatów

## 10. Obsługa błędów
- Nie ujawniamy istnienia konta – komunikaty formułujemy neutralnie
- `429 too_many_requests`: pokaż informację o ograniczeniu tempa i proponuj ponowienie później
- `network_error`: zachęć do ponowienia; nie zmieniaj neutralnego przekazu o istnieniu konta
- Logowanie błędów tylko w DEV (bez wrażliwych danych)

## 11. Kroki implementacji
1. Dodaj typy:
   - `ForgotPasswordFormValues`, `ForgotPasswordResult` (np. w `src/lib/auth/client.ts` lub nowym pliku `src/lib/auth/forgot.ts`)
2. Dodaj funkcję klienta auth:
   - `requestPasswordReset(email: string): Promise<ForgotPasswordResult>`
   - Implementacja: `supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/reset-password" })`, mapowanie błędów jak w sekcji 7
3. Dodaj hook `useForgotPassword` (`src/lib/auth/useForgotPassword.ts`):
   - Stan `loading`, `sent`, metoda `submit(values)`; obsługa throttle (opcjonalnie)
4. Zaimplementuj `ForgotPasswordForm.tsx`:
   - Integracja z `react-hook-form` + Zod
   - Użyj `EmailField`, `Button`, inline komunikaty (sukces/erro)
   - A11y: label, opisy błędów, aria-live dla komunikatów
5. Zaimplementuj `ForgotPasswordCard.tsx`:
   - Nagłówek, opis, montaż `ForgotPasswordForm`, linki do `/login` i `/register`
6. Dodaj stronę `src/pages/forgot-password.astro`:
   - Layout, centrowanie w `<main>`, `export const prerender = false`, montaż `ForgotPasswordCard client:load`
7. Zaktualizuj link w `LoginCard.tsx`:
   - Z `/reset-password` na `/forgot-password` przy linku „Zapomniałeś hasła?”
8. (Opcjonalnie) Dodać prosty komponent `InlineAlert` lub shadcn/ui Toast w `src/components/ui` i użyć go w formularzu
9. Ręczne testy E2E:
   - Poprawny email → neutralny komunikat
   - Nieprawidłowy email → walidacja
   - Brak sieci → błąd sieci
   - Szybkie wielokrotne próby → throttle/komunikat o ograniczeniu
10. QA a11y:
   - Sprawdź focus, role, aria-live, kontrasty, nawigację klawiaturą


