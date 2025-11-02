# Plan implementacji widoku Reset hasła

## 1. Przegląd
Widok pozwala użytkownikowi ustawić nowe hasło po kliknięciu linku z maila resetującego (Supabase Auth). Po wejściu na stronę aplikacja sprawdza ważność sesji resetu (z tokenu w URL), wyświetla formularz z polami „hasło” i „powtórz hasło”, waliduje siłę hasła oraz zgodność pól. Po pomyślnej zmianie hasła wyświetla komunikat sukcesu i automatycznie przekierowuje na `/login`.

Cele:
- Bezpieczna zmiana hasła zgodnie z regułami walidacji.
- Czytelne komunikaty o stanie (sukces/błąd), a11y (aria-live, focus management).
- Integracja z Supabase Auth SDK bez własnego endpointu REST.

## 2. Routing widoku
- Ścieżka: `/reset-password`
- Plik: `src/pages/reset-password.astro`
- SSR: statyczny layout w Astro, interaktywny formularz w React (Client only: `client:load`).

## 3. Struktura komponentów
- `src/pages/reset-password.astro`
  - renderuje kartę resetu hasła (komponent React), spójny wygląd z innymi widokami auth
- `src/components/auth/ResetPasswordCard.tsx`
  - nagłówek, opis, zawiera formularz oraz linki nawigacyjne
  - osadza `ResetPasswordForm`
- `src/components/auth/ResetPasswordForm.tsx`
  - formularz z polami: hasło, potwierdzenie hasła
  - walidacja Zod + react-hook-form, kontrola stanu i komunikatów
  - siła hasła: wskaźnik i/lub lista wymagań
- (reuse) `src/components/auth/PasswordField.tsx`
  - do użycia 2x (hasło i powtórz hasło) po drobnej rozbudowie propsów (ID/etykieta)
- (opcjonalnie) `src/components/auth/PasswordStrengthIndicator.tsx`
  - prosty wskaźnik siły hasła (wyświetla poziom/kolor oraz listę spełnionych warunków)

## 4. Szczegóły komponentów
### ResetPasswordCard
- Opis: Karta widoku resetu hasła z nagłówkiem i opisem. Wewnątrz renderuje formularz oraz linki pomocnicze.
- Główne elementy:
  - `<header>` z tytułem, krótką instrukcją
  - `<ResetPasswordForm />`
  - nawigacja: link do `/login` i do `/forgot-password`
- Obsługiwane interakcje: brak własnych; wszystkie akcje w formularzu
- Obsługiwana walidacja: brak (delegowana do formularza)
- Typy: `ResetPasswordCardProps` (opcjonalnie `redirectAfterMs?: number`)
- Propsy:
  - `redirectAfterMs?: number` — domyślnie 1500–2500 ms na auto-przekierowanie po sukcesie

### ResetPasswordForm
- Opis: Formularz zmiany hasła z walidacją siły i zgodności. Obsługuje scenariusze brzegowe (brak sesji resetu, wygasły link).
- Główne elementy:
  - `PasswordField` (hasło) + `PasswordField` (powtórz hasło)
  - przycisk „Ustaw nowe hasło” (`<Button />` z Shadcn/UI)
  - komunikaty: błędy walidacji, błąd sesji, sukces (aria-live)
  - (opcjon.) `PasswordStrengthIndicator`
- Obsługiwane interakcje:
  - wpisywanie pól, toggle show/hide hasła (wbudowane w `PasswordField`)
  - submit: wywołanie Supabase `updateUser({ password })`
  - po sukcesie: komunikat + auto-redirect do `/login`
- Obsługiwana walidacja (Zod, szczegóły w sekcji 9):
  - długość min. 8
  - ≥ 1 mała litera, ≥ 1 wielka litera, ≥ 1 cyfra, bez spacji
  - „powtórz hasło” zgodne z „hasło”
- Typy: `ResetPasswordSchema`, `ResetPasswordResult`, `PasswordStrength`, `ResetPasswordViewState`
- Propsy:
  - brak wymaganych; opcjonalnie `onSuccess?: () => void`, `redirectTo?: string` (domyślnie `/login`)

### PasswordStrengthIndicator (opcjonalnie)
- Opis: Prezentuje bieżącą siłę hasła oraz które reguły są już spełnione.
- Główne elementy:
  - pasek/etykieta poziomu (np. Słabe/Średnie/Silne)
  - lista reguł z ikonami spełnienia
- Obsługiwane interakcje: brak (tylko wizualizacja na podstawie `password`)
- Obsługiwana walidacja: brak (wyłącznie podgląd)
- Typy: `PasswordStrength`, `PasswordStrengthDetails`
- Propsy:
  - `password: string`
  - `details: PasswordStrengthDetails` (jeśli liczymy poza komponentem)

## 5. Typy
Nowe/uzupełniane typy oraz schematy (TypeScript + Zod):

```ts
// src/lib/validation/auth.ts
export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Hasło musi mieć co najmniej 8 znaków")
      .regex(/[a-z]/, "Przynajmniej jedna mała litera")
      .regex(/[A-Z]/, "Przynajmniej jedna wielka litera")
      .regex(/[0-9]/, "Przynajmniej jedna cyfra")
      .regex(/^\S+$/, "Hasło nie może zawierać spacji"),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Hasła muszą się zgadzać",
  });

export type ResetPasswordSchema = z.infer<typeof resetPasswordSchema>;
```

```ts
// src/lib/auth/client.ts
export type ResetPasswordErrorCode =
  | "session_missing"
  | "weak_password"
  | "too_many_requests"
  | "network_error"
  | "unknown_error";

export type ResetPasswordResult =
  | { ok: true }
  | { ok: false; code: ResetPasswordErrorCode; message: string };
```

```ts
// src/components/auth/types.ts (opcjonalnie) lub lokalnie w komponencie
export type PasswordStrength = "weak" | "medium" | "strong";

export interface PasswordStrengthDetails {
  lengthOk: boolean;
  hasLower: boolean;
  hasUpper: boolean;
  hasDigit: boolean;
  noSpaces: boolean;
  score: number; // 0..5
}

export interface ResetPasswordViewState {
  loading: boolean;
  sessionReady: boolean; // sesja resetu aktywna (token poprawny)
  submitError?: string;
  submitSuccess?: string;
}
```

## 6. Zarządzanie stanem
- Formularz: `react-hook-form` + `zodResolver(resetPasswordSchema)` dla walidacji w czasie rzeczywistym.
- Widok: custom hook `useResetPassword` w `src/lib/auth/useResetPassword.ts` do obsługi:
  - `loading`: stan wysyłania
  - `sessionReady`: wykrycie sesji resetu; na `mount`:
    - `supabaseClient.auth.getSession()` — jeśli brak, spróbować:
      - jeśli w adresie jest `code`, wywołać `supabaseClient.auth.exchangeCodeForSession(code)`
      - jeśli Supabase sam zainicjalizuje sesję z `access_token` w hash, odczyt po chwili przez `getSession()`
    - jeśli nadal brak — komunikat o nieważnym/wygasłym linku + CTA do `/forgot-password`
  - `submit(values)`: wywołuje klienta auth do ustawienia hasła
  - po sukcesie: ustawia komunikat sukcesu, opcjonalnie `signOut()`, schedule redirect do `/login`

## 7. Integracja API
- Klient: `src/db/supabase.client.ts` (już istnieje); używamy bezpośrednio w helperze auth.
- Operacje:
  - Sprawdzenie sesji: `supabaseClient.auth.getSession()`
  - Wymiana kodu (jeśli potrzeba): `supabaseClient.auth.exchangeCodeForSession(code)`
  - Zmiana hasła: `await supabaseClient.auth.updateUser({ password })`
  - Po sukcesie (opcjonalnie wymuszamy logowanie od nowa): `await supabaseClient.auth.signOut()`
- Typy żądania/odpowiedzi: Supabase SDK (brak własnych DTO). Na froncie opakowujemy wynik w `ResetPasswordResult` dla spójności z istniejącymi helperami (`LoginResult`, `ForgotPasswordResult`).

## 8. Interakcje użytkownika
- Użytkownik otwiera link z maila → strona sprawdza sesję resetu.
- Jeśli sesja prawidłowa: użytkownik wpisuje hasło i jego potwierdzenie.
- W trakcie wpisywania widać wskaźnik siły hasła oraz błędy walidacji.
- Kliknięcie „Ustaw nowe hasło”:
  - przy poprawnych danych — wywołanie `updateUser({ password })`
  - na sukces — komunikat „Hasło zostało zmienione” + auto-redirect na `/login`
  - na błąd — szczegółowy komunikat, fokus na alert (a11y)
- Jeśli link/stan resetu nieważny — komunikat błędu i link do `/forgot-password`.

## 9. Warunki i walidacja
- Warunki wejściowe formularza:
  - `password`: min. 8 znaków, ≥1 [a-z], ≥1 [A-Z], ≥1 [0-9], brak spacji
  - `confirmPassword`: identyczne jak `password`
- Warunki dot. API:
  - sesja resetu musi być aktywna (token ważny)
  - przy braku sesji wyświetlamy błąd „Link wygasł lub jest nieprawidłowy” i CTA do ponownego resetu
- Wpływ na UI:
  - nieaktywna sesja → ukryj formularz, pokaż blok komunikatu z linkiem do `/forgot-password`
  - aktywna sesja → formularz aktywny; `Button` z `disabled` przy niepoprawnych danych lub `loading`

## 10. Obsługa błędów
- Mapowanie błędów Supabase w helperze:
  - `401/403` → `session_missing`: „Link wygasł lub jest nieprawidłowy.”
  - `422/400` (walidacja hasła) → `weak_password`: „Hasło nie spełnia wymagań.”
  - `429` → `too_many_requests`: „Zbyt wiele prób. Spróbuj za chwilę.”
  - brak sieci/exception → `network_error`: „Problem z połączeniem. Spróbuj ponownie.”
  - inne → `unknown_error`
- A11y:
  - `role="alert"` + `aria-live="polite"` dla komunikatów
  - focus przenoszony na alert po błędzie

## 11. Kroki implementacji
1. Walidacja
   - Dodaj `resetPasswordSchema` i `ResetPasswordSchema` do `src/lib/validation/auth.ts` (obok istniejących schematów).
2. Klient Auth
   - W `src/lib/auth/client.ts` dodaj:
     - `updatePassword(newPassword: string): Promise<ResetPasswordResult>` — użyj `supabaseClient.auth.updateUser({ password: newPassword })` i mapuj błędy jak wyżej.
3. Hook
   - Utwórz `src/lib/auth/useResetPassword.ts`:
     - stan: `loading`, `sessionReady`, `submit`, `tokenError?`
     - `onMount`: `getSession()` → jeśli brak: wykryj `code` w query i wywołaj `exchangeCodeForSession`; jeśli dalej brak — `sessionReady=false` i komunikat o błędzie.
     - `submit`: woła `updatePassword`, po sukcesie ustawia success + `signOut()` + `setTimeout` redirect do `/login`.
4. Komponenty UI
   - Rozszerz `src/components/auth/PasswordField.tsx` o opcjonalne propsy `id?: string`, `label?: string`, `autoComplete?: string` (domyślnie jak dziś). Pozwoli to użyć pola 2x bez konfliktu `id` i etykiety.
   - Utwórz `src/components/auth/ResetPasswordForm.tsx`:
     - `react-hook-form` + `zodResolver(resetPasswordSchema)`
     - 2x `PasswordField` (`id="new-password"`, label „Nowe hasło”, `autoComplete="new-password"`; oraz `id="confirm-password"`, label „Powtórz hasło”)
     - wskaźnik siły hasła (opcjonalny komponent lub inline)
     - komunikaty błędów/sukcesu (alert + aria-live), blokowanie przycisku podczas `loading`
   - Utwórz `src/components/auth/ResetPasswordCard.tsx` w stylu `LoginCard`/`ForgotPasswordCard` (spójny layout i typografia).
5. Strona Astro
   - Zmień `src/pages/reset-password.astro` tak, aby renderowała `ResetPasswordCard` (jak inne widoki auth):
     - zachowaj istniejący layout i styl karty
     - osadź komponent React z dyrektywą klienta (`client:load`)
6. Treści i UX
   - Komunikaty PL (krótkie, zrozumiałe), CTA do `/forgot-password` dla linków nieważnych
   - Auto-redirect do `/login` po sukcesie (np. 2000 ms)
7. Testy ręczne (happy path + edge cases)
   - ważny link → zmiana hasła → redirect do `/login`
   - wygasły/niepoprawny link → błąd i link do „Wyślij ponownie”
   - słabe hasło → błędy walidacji po stronie UI i (jeśli dotyczy) z API
   - brak sieci → komunikat o problemie z połączeniem
8. Dostępność
   - `role="alert"`, `aria-live` (polite) dla komunikatów; przeniesienie focusu
   - etykiety i `aria-describedby` z błędami pól
9. Perf i bezpieczeństwo
   - nie loguj haseł; debuguj wyłącznie status/message
   - nie renderuj formularza przy braku sesji resetu
   - minimalny JS: tylko niezbędne komponenty auth

## Mapowanie na US-001 (Rejestracja i uwierzytelnianie)
- Widok resetu hasła wspiera scenariusz bezpiecznego logowania, umożliwiając użytkownikom samodzielną zmianę hasła i powrót do logowania, zgodnie z wymaganiami bezpieczeństwa.


