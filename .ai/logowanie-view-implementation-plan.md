# Plan implementacji widoku Logowanie

## 1. Przegląd
Widok służy do uwierzytelnienia użytkownika za pomocą adresu email i hasła. Implementacja jest w pełni po stronie klienta z wykorzystaniem Supabase Auth SDK. Po pomyślnym zalogowaniu użytkownik jest przekierowywany do ostatnio odwiedzanej strony (jeśli znana) lub na stronę domyślną. Widok respektuje minimalizację danych osobowych (tylko email i hasło), zapewnia dostępność (fokus, komunikaty błędów, role ARIA) oraz bezpieczeństwo (maskowanie hasła, zapobieganie open-redirect).

## 2. Routing widoku
- Ścieżka: `/login`
- Plik strony: `src/pages/login.astro`
- Reguły:
  - Jeżeli użytkownik jest już zalogowany (sesja Supabase istnieje), natychmiastowe przekierowanie na `redirect` z query string lub `/`.
  - Obsługa parametru `?redirect=/sciezka` (tylko ścieżki wewnętrzne). Walidacja, aby uniknąć open-redirect (zaczyna się od `/`, nie zaczyna się od `//`, brak protokołu).

## 3. Struktura komponentów
```
LoginPage (Astro) [src/pages/login.astro]
  └─ LoginCard (React) [src/components/auth/LoginCard.tsx]
      ├─ LoginForm [src/components/auth/LoginForm.tsx]
      │   ├─ EmailField
      │   ├─ PasswordField (z opcjonalnym pokaż/ukryj)
      │   ├─ SubmitButton (Shadcn/ui `Button`)
      │   └─ ErrorAlert
      └─ LinksBar ("Zapomniałeś hasła?", "Zarejestruj")
```

## 4. Szczegóły komponentów
### LoginPage (Astro)
- Opis: Strona routowana pod `/login`. Odpowiada za pobranie parametru `redirect` z URL oraz przekazanie go do Reactowego kontenera.
- Główne elementy: Layout (`src/layouts/Layout.astro`), osadzony komponent React `LoginCard` z `client:load`.
- Obsługiwane interakcje: Brak bezpośrednich (delegowane do dzieci).
- Walidacja: Sanitizacja `redirect` po stronie serwera (Astro) przed przekazaniem do klienta.
- Typy: `redirectTo?: string` (prop do React).
- Propsy: `{ redirectTo?: string }` przekazywane do `LoginCard`.

### LoginCard (React)
- Opis: Kontener z tytułem, opisem i opakowaniem wizualnym karty logowania.
- Główne elementy: Nagłówek, opis, `LoginForm`, `LinksBar`.
- Interakcje: Brak (pośrednio poprzez `LoginForm`).
- Walidacja: Brak (delegacja do `LoginForm`).
- Typy: `LoginCardProps` z `redirectTo?: string`.
- Propsy: `{ redirectTo?: string }` (przekazywane dalej do `LoginForm`).

### LoginForm (React)
- Opis: Formlarz logowania z walidacją, obsługą stanu i integracją z Supabase Auth.
- Główne elementy: `form`, `EmailField`, `PasswordField`, `Button`, `ErrorAlert`.
- Obsługiwane interakcje:
  - submit: wywołanie logowania Supabase `signInWithPassword`.
  - input: aktualizacja wartości pól, walidacja w locie.
  - Enter na polach: submit.
  - opcjonalnie: toggle pokaż/ukryj hasło.
- Obsługiwana walidacja:
  - `email`: wymagany, poprawny format email.
  - `password`: wymagane (bez wymuszania długości po stronie UI, aby nie kolidować z backendem; minimalna długość może być egzekwowana przez Supabase podczas rejestracji, nie logowania).
  - Blokada wielokrotnego submitu podczas `loading`.
- Typy: `LoginFormValues`, `LoginViewState`, `AuthErrorCode`, `LoginResult`.
- Propsy: `{ redirectTo?: string }`.

### EmailField
- Opis: Pole tekstowe email z automatycznym focusem.
- Główne elementy: `label`, `input type="email"`.
- Interakcje: `onChange`, `onBlur` (walidacja), `Enter` -> submit.
- Walidacja: wymagane, format email.
- Typy: `value: string`, `error?: string`, `onChange: (val: string) => void`.
- Propsy: `{ value, error, onChange, autoFocus?: boolean }`.

### PasswordField
- Opis: Pole hasła z maskowaniem i opcjonalnym przełącznikiem pokaż/ukryj.
- Główne elementy: `label`, `input type="password"`, opcjonalny przycisk toggle.
- Interakcje: `onChange`, `onBlur`, toggle widoczności.
- Walidacja: wymagane.
- Typy: `value: string`, `error?: string`, `onChange: (val: string) => void`.
- Propsy: `{ value, error, onChange }` (+ opcjonalny `showToggle?: boolean`).

### SubmitButton
- Opis: Przycisk submit z loaderem.
- Główne elementy: `Button` z `src/components/ui/button.tsx`.
- Interakcje: klik -> submit, disabled gdy `loading` lub formularz niepoprawny.
- Walidacja: brak (kontroluje stan `disabled`).
- Typy: `{ loading: boolean, disabled?: boolean }`.
- Propsy: `{ loading: boolean }`.

### ErrorAlert
- Opis: Blok komunikatu o błędzie.
- Główne elementy: `div role="alert"` z `aria-live="polite"`.
- Interakcje: brak.
- Walidacja: brak.
- Typy: `{ message?: string }`.
- Propsy: `{ message?: string }`.

### LinksBar
- Opis: Linki pomocnicze.
- Główne elementy: link do resetu hasła (np. `/reset-password`) i rejestracji (np. `/register`).
- Interakcje: kliknięcia linków.
- Walidacja: brak.
- Typy: brak.
- Propsy: `{ registerHref?: string; resetHref?: string }` (opcjonalne, z domyślnymi ścieżkami).

## 5. Typy
Nowe typy dla widoku, umieszczone lokalnie w module komponentu lub w `src/lib/auth/` jeśli współdzielone:

```ts
// Wspólny model formularza
export interface LoginFormValues {
  email: string;
  password: string;
}

// Stan UI formularza
export interface LoginViewState {
  loading: boolean;
  error?: string;
  redirectTo?: string;
}

// Mapowane kody błędów
export type AuthErrorCode =
  | "invalid_credentials"
  | "too_many_requests"
  | "network_error"
  | "unknown_error";

export type LoginResult =
  | { ok: true }
  | { ok: false; code: AuthErrorCode; message: string };
```

Zod schema (w komponencie lub `src/lib/validation/auth.ts`):
```ts
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Podaj poprawny adres email"),
  password: z.string().min(1, "Hasło jest wymagane"),
});

export type LoginSchema = z.infer<typeof loginSchema>;
```

## 6. Zarządzanie stanem
- Podejście: `react-hook-form` + `@hookform/resolvers/zod` (walidacja synchroniczna, kontrola błędów per pole, lepsza dostępność) lub minimalnie `useState` + Zod `safeParse`. Rekomendowane `react-hook-form`.
- Custom hook: `useLogin` w `src/lib/auth/useLogin.ts` – kapsułkuje logikę wywołania SDK, mapowanie błędów, zarządzanie `loading` oraz bezpieczny redirect.
- Źródła prawdy:
  - Walidacja: Zod schema.
  - Sesja: Supabase SDK (po stronie klienta przechowuje token i odświeżanie).
- Blokady: Debounce/lock na przycisku w trakcie trwającego żądania.

## 7. Integracja API
- Brak dedykowanego REST; używamy Supabase Auth SDK z `src/db/supabase.client.ts`.
- Wywołania:
  - `supabaseClient.auth.signInWithPassword({ email, password })`
  - `supabaseClient.auth.getSession()` – sprawdzenie istniejącej sesji.
  - (opcjonalnie) `supabaseClient.auth.onAuthStateChange` – nasłuch po zalogowaniu.
- Typy żądań i odpowiedzi: korzystamy z typów dostarczanych przez SDK; opakowujemy w `LoginResult` dla UI.
- Bezpieczny redirect po sukcesie:
  - Jeżeli dostarczono `redirectTo` i jest wewnętrzne (walidacja), przekieruj tam; inaczej `/`.
  - Walidacja redirectu: `redirectTo.startsWith('/') && !redirectTo.startsWith('//')`.

Funkcja pomocnicza (w `src/lib/auth/client.ts`):
```ts
import { supabaseClient } from "../../db/supabase.client";

export async function loginWithEmailPassword(values: LoginFormValues): Promise<LoginResult> {
  try {
    const { error } = await supabaseClient.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    if (error) {
      const mapped = mapSupabaseError(error);
      return { ok: false, ...mapped };
    }
    return { ok: true };
  } catch {
    return { ok: false, code: "network_error", message: "Problem z połączeniem. Spróbuj ponownie." };
  }
}

function mapSupabaseError(error: { message: string; status?: number }): { code: AuthErrorCode; message: string } {
  if (error.status === 400 || /Invalid login credentials/i.test(error.message)) {
    return { code: "invalid_credentials", message: "Nieprawidłowy email lub hasło." };
  }
  if (error.status === 429) {
    return { code: "too_many_requests", message: "Zbyt wiele prób. Spróbuj za chwilę." };
  }
  return { code: "unknown_error", message: "Nieoczekiwany błąd. Spróbuj ponownie." };
}
```

Uwaga: w routach API/middleware używać `context.locals.supabase`, ale na widoku logowania (klient) używamy `supabaseClient`.

## 8. Interakcje użytkownika
- Wpisanie email/hasła i naciśnięcie Enter/kliknięcie „Zaloguj” -> próba logowania ->
  - sukces: przekierowanie na `redirect` lub `/`;
  - błąd: wyświetlenie `ErrorAlert`, fokus na pierwsze niepoprawne pole lub na alert (dla screen readerów).
- Klik „Zapomniałeś hasła?” -> przejście do `/reset-password`.
- Klik „Zarejestruj” -> przejście do `/register` (docelowo, jeśli dostępne w MVP).
- Toggle „pokaż/ukryj hasło” (opcjonalny) – nie wpływa na walidację.

## 9. Warunki i walidacja
- Email: wymagany, `z.string().email()`.
- Hasło: wymagane (min. 1 znak). Dalsze zasady egzekwowane przez Supabase w procesie rejestracji, nie logowania.
- Redirect: dozwolone wyłącznie ścieżki wewnętrzne – walidacja jak wyżej; w razie niepoprawności ignorujemy i używamy `/`.
- UI: przycisk `Zaloguj` nieaktywny, gdy formularz niepoprawny lub `loading`.
- A11y: `aria-invalid` na polach z błędami, `role="alert"` + `aria-live="polite"` dla komunikatów.

## 10. Obsługa błędów
- Mapowanie błędów Supabase do przyjaznych komunikatów (invalid credentials, rate limit, sieć, nieznany błąd).
- Globalny fallback komunikatu błędu.
- Zabezpieczenie przed wielokrotnym submit (stan `loading`).
- Logowanie techniczne do konsoli w trybie dev (bez wrażliwych danych).

## 11. Kroki implementacji
1. (Opcjonalnie) Dodać zależności: `react-hook-form`, `@hookform/resolvers` (Zod jest już używany w projekcie).
2. Utworzyć stronę `src/pages/login.astro`:
   - Pobierz `redirect` z `Astro.url.searchParams`, przefiltruj i przekaż do `LoginCard` jako `redirectTo`.
   - Jeżeli (opcjonalnie) chcesz wykrywać zalogowanie SSR, w MVP wystarczy sprawdzenie sesji po stronie klienta.
3. Utworzyć `src/components/auth/LoginCard.tsx` – kontener UI (tytuł, opis, wrapper, children).
4. Utworzyć `src/components/auth/LoginForm.tsx`:
   - Zaimplementować formularz w oparciu o `react-hook-form` + Zod lub `useState` + Zod.
   - Walidacja pól, blokada `loading`, obsługa submit.
   - Integracja z `loginWithEmailPassword`.
   - Po sukcesie: bezpieczny redirect.
5. Utworzyć `src/lib/auth/client.ts` z funkcją `loginWithEmailPassword` oraz mapowaniem błędów.
6. (Opcjonalnie) Utworzyć `src/lib/auth/useLogin.ts` – hook scalający submit, loading, error i redirect.
7. Dodać `LinksBar` w `LoginCard` z linkami do `/reset-password` i `/register` (lub placeholdery jeśli brak stron).
8. Stylowanie Tailwind 4 zgodne z resztą aplikacji; przycisk z `src/components/ui/button.tsx`.
9. Testy ręczne:
   - Scenariusz sukcesu + redirect.
   - Błędne hasło (invalid credentials).
   - Pusty formularz (walidacja klienta).
   - Parametr `redirect` niepoprawny -> ignorowanie i `/`.
10. Uwaga integracyjna:
    - Middleware `src/middleware/index.ts` jest obecnie stubem (stałe `DEFAULT_USER_ID`). Włączenie realnego auth w API wymaga późniejszej aktualizacji middleware do walidacji JWT Supabase i wstrzykiwania `locals.user` zgodnie z PRD. Widok logowania działa jednak niezależnie (sesja klienta przechowywana przez SDK).


