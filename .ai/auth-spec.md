
# Specyfikacja techniczna modułu uwierzytelniania

## 1. Architektura interfejsu użytkownika

### Strony (Astro)

- `src/pages/login.astro`: Strona logowania. Będzie zawierać komponent React `LoginForm` osadzony w `LoginCard`. Odpowiedzialna za renderowanie layoutu i przekazywanie danych do komponentu.
- `src/pages/register.astro`: Strona rejestracji. Będzie zawierać komponent React `RegisterForm` wewnątrz `RegisterCard`.
- `src/pages/forgot-password.astro`: Strona do wysyłania prośby o zresetowanie hasła. Będzie zawierać `ForgotPasswordForm` wewnątrz `ForgotPasswordCard`.
- `src/pages/reset-password.astro`: Strona do ustawiania nowego hasła po przejściu z linku w mailu. Będzie zawierać `ResetPasswordForm` w `ResetPasswordCard`.

### Komponenty (React)

- `src/components/auth/LoginForm.tsx`: Formularz logowania z polami na email i hasło. Będzie zarządzał stanem formularza, walidacją po stronie klienta i komunikacją z API Supabase.
- `src/components/auth/RegisterForm.tsx`: Formularz rejestracji. Zgodnie z historyjką użytkownika US-001, będzie zawierał pola na email, hasło i powtórzenie hasła. W celu minimalizacji zbieranych danych (US-011), formularz nie będzie wymagał podawania dodatkowych informacji, takich jak nazwa użytkownika czy imię i nazwisko. Będzie zawierał wskaźnik siły hasła `PasswordStrengthIndicator`.
- `src/components/auth/ForgotPasswordForm.tsx`: Formularz z polem na email, do którego zostanie wysłany link do resetowania hasła.
- `src/components/auth/ResetPasswordForm.tsx`: Formularz do wprowadzenia i potwierdzenia nowego hasła.
- `src/components/auth/EmailField.tsx`: reużywalny komponent dla pola email z walidacją.
- `src/components/auth/PasswordField.tsx`: reużywalny komponent dla pola hasła z opcją pokazywania/ukrywania hasła.
- `src/components/auth/PasswordStrengthIndicator.tsx`: Komponent wizualizujący siłę hasła.
- `src/components/auth/LoginCard.tsx`, `RegisterCard.tsx`, `ForgotPasswordCard.tsx`, `ResetPasswordCard.tsx`: Komponenty-kontenery dla formularzy, zapewniające spójny wygląd.
- `src/layouts/Layout.astro`: Główny layout aplikacji. Zostanie zaktualizowany, aby warunkowo renderować linki "Zaloguj się"/"Wyloguj się" oraz adres email użytkownika na podstawie statusu sesji pobranego z Supabase.

### Scenariusze i walidacja

- **Walidacja po stronie klienta**: Formularze będą używać biblioteki `zod` do walidacji (zgodnie z istniejącą w projekcie w `src/lib/validation/auth.ts`), wyświetlając komunikaty o błędach w czasie rzeczywistym.
- **Komunikaty o błędach**: Błędy serwera (np. "Nieprawidłowy email lub hasło") będą wyświetlane w formularzu po otrzymaniu odpowiedzi z API. Użyjemy `sonner` do globalnych powiadomień.
- **Logowanie**: Po pomyślnym zalogowaniu, użytkownik zostanie przekierowany na stronę główną (`/`).
- **Rejestracja**: Po udanej rejestracji, Supabase wyśle email weryfikacyjny. Użytkownik zostanie poinformowany o konieczności potwierdzenia adresu email.
- **Resetowanie hasła**: Po wysłaniu prośby, użytkownik zobaczy komunikat o wysłaniu linku. Po pomyślnym zresetowaniu hasła, zostanie przekierowany na stronę logowania.

## 2. Logika backendowa

### Endpointy API

Nie będziemy tworzyć dedykowanych endpointów API w `src/pages/api` dla logowania, rejestracji i resetowania hasła. Cała logika uwierzytelniania będzie obsługiwana po stronie klienta przez bibliotekę `supabase-js`, która komunikuje się bezpośrednio z API Supabase.

Endpointy po stronie serwera będą potrzebne do:

- `src/pages/api/auth/callback.ts`: Endpoint obsługujący callback od Supabase po pomyślnym zalogowaniu lub potwierdzeniu emaila. Wymieniany jest w nim kod autoryzacyjny na sesję i zapisywany w ciasteczkach.
- `src/pages/api/auth/user.ts`: Endpoint zwracający dane zalogowanego użytkownika. Będzie używany przez komponenty po stronie serwera.

### Middleware

- `src/middleware/index.ts`: Middleware Astro będzie przechwytywać każde żądanie. Sprawdzi obecność i ważność sesji w ciasteczkach, korzystając z `supabase.auth.getSessionFromCookie()`. W przypadku braku sesji na chronionych stronach (np. dashboard), przekieruje użytkownika na stronę logowania. Zaktualizuje również sesję, jeśli wygasła.

### Renderowanie po stronie serwera

- `astro.config.mjs`: Konfiguracja pozostaje bez zmian (`output: 'hybrid'`). Strony wymagające danych o sesji po stronie serwera (np. `Layout.astro` do wyświetlenia przycisku "Wyloguj") będą musiały pobrać te dane z `Astro.locals`.

## 3. System autentykacji (Supabase Auth)

### Konfiguracja

- **Klient Supabase**: Będziemy używać jednego, współdzielonego klienta Supabase (`src/db/supabase.client.ts`) zarówno po stronie klienta, jak i serwera (w middleware i endpointach API). Klient będzie skonfigurowany przy użyciu zmiennych środowiskowych `SUPABASE_URL` i `SUPABASE_ANON_KEY`.

### Procesy uwierzytelniania

- **Rejestracja**: Użycie `supabase.auth.signUp()` z emailem i hasłem. Supabase automatycznie obsłuży wysyłkę emaila weryfikacyjnego.
- **Logowanie**: Użycie `supabase.auth.signInWithPassword()` z emailem i hasłem. Po pomyślnym zalogowaniu, `supabase-js` automatycznie przechowa sesję.
- **Wylogowywanie**: Użycie `supabase.auth.signOut()`. To unieważni sesję po stronie Supabase i usunie ją z pamięci przeglądarki.
- **Odzyskiwanie hasła**:
    1.  `supabase.auth.resetPasswordForEmail()`: Wyśle email z linkiem do resetowania hasła.
    2.  Na stronie `reset-password.astro`, po przejściu z linku, użyjemy `supabase.auth.updateUser()` do ustawienia nowego hasła.
- **Zarządzanie sesją**: `supabase-js` domyślnie używa `localStorage` do przechowywania sesji. Aby umożliwić renderowanie po stronie serwera i działanie middleware, sesja będzie również przechowywana w bezpiecznych ciasteczkach `httpOnly`. Middleware będzie odpowiedzialne za synchronizację sesji między ciasteczkami a Supabase.

### Ochrona stron

Dostęp do stron wymagających uwierzytelnienia (np. `/groups`, `/activities`) będzie chroniony przez middleware (`src/middleware/index.ts`). Jeśli użytkownik nie jest zalogowany, zostanie przekierowany do `/login`. Publiczne strony (`/login`, `/register`, `/`, `/forgot-password`, `/reset-password`) będą dostępne dla wszystkich.

## 4. Migracja z istniejącego systemu uwierzytelniania

Obecny system testowy oparty na stałym identyfikatorze użytkownika (`DEFAULT_USER_ID`) zostanie całkowicie zastąpiony przez standardowy przepływ uwierzytelniania oparty na Supabase Auth.

- **Usunięcie `DEFAULT_USER_ID`**: Zmienna `DEFAULT_USER_ID` zdefiniowana w `src/db/supabase.client.ts` zostanie usunięta. Wszystkie części aplikacji, które opierały swoją logikę na tej stałej, zostaną zrefaktoryzowane, aby pobierać identyfikator użytkownika z aktywnej sesji.
- **Usunięcie testowego logowania**: Wszelkie mechanizmy służące do testowego logowania, w tym potencjalne endpointy takie jak `src/pages/api/dev/test-login.ts`, zostaną usunięte z aplikacji.
- **Weryfikacja logiki autoryzacji**: Należy przeprowadzić przegląd istniejącej logiki biznesowej, aby upewnić się, że wszystkie operacje wymagające kontekstu użytkownika (np. sprawdzanie uprawnień, tworzenie zasobów) opierają się wyłącznie na danych zalogowanego użytkownika pochodzących z sesji Supabase.
