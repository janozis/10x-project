# ✅ Integracja Supabase Auth - Kompletna

## 📝 Podsumowanie zmian

Pomyślnie zintegrowano system uwierzytelniania Supabase Auth z aplikacją Astro zgodnie z wymaganiami z `auth-spec.md` i `prd.md`.

### ✅ Zrealizowane zadania

1. **Zainstalowano `@supabase/ssr`** - pakiet niezbędny do obsługi sesji w SSR
2. **Utworzono klientów Supabase:**
   - `createSupabaseBrowserInstance()` - dla React komponentów po stronie przeglądarki
   - `createSupabaseServerInstance()` - dla Astro middleware i API routes z obsługą httpOnly cookies
3. **Zaktualizowano middleware** (`src/middleware/index.ts`):
   - Pełna obsługa sesji użytkownika przez `auth.getUser()`
   - Ochrona tras - przekierowanie do `/auth/login` dla niezalogowanych
   - Lista ścieżek publicznych: `/`, `/auth/*`
4. **Zaktualizowano typy** (`src/env.d.ts`):
   - Dodano `email` do `Astro.locals.user`
5. **Zaktualizowano funkcje auth** (`src/lib/auth/client.ts`):
   - `loginWithEmailPassword()` - używa `createSupabaseBrowserInstance()`
   - `requestPasswordReset()` - używa `createSupabaseBrowserInstance()`
   - `updatePassword()` - używa `createSupabaseBrowserInstance()`
6. **Zachowano kompatybilność wsteczną:**
   - `DEFAULT_USER_ID` pozostaje jako fallback dla serwisów nie zmigrowanych
   - Po zalogowaniu `ctx.locals.user.id` zawiera prawdziwy ID użytkownika

## 🔧 Zmienione pliki

1. `src/db/supabase.client.ts` - nowe funkcje do tworzenia klientów SSR
2. `src/middleware/index.ts` - pełna obsługa sesji i ochrona tras
3. `src/env.d.ts` - zaktualizowane typy dla `Astro.locals`
4. `src/lib/auth/client.ts` - wszystkie funkcje auth używają browser client
5. `package.json` - dodano `@supabase/ssr`

## 🧪 Instrukcje testowania

### Przygotowanie

Przed testowaniem upewnij się, że:

1. **Zmienne środowiskowe są ustawione** w `.env`:
```env
PUBLIC_SUPABASE_URL=https://twoj-projekt.supabase.co
PUBLIC_SUPABASE_KEY=twoj_anon_key
```

2. **W Supabase Auth są włączone Email/Password:**
   - Panel Supabase → Authentication → Providers
   - Email provider musi być aktywny
   - Ustaw URL confirmation redirect (opcjonalnie)

3. **Masz dostęp do testowego użytkownika lub możesz utworzyć nowego**

### Test 1: Ochrona tras

**Cel:** Sprawdzić, czy middleware przekierowuje niezalogowanych użytkowników

```bash
# Uruchom serwer dev
npm run dev
```

**Kroki:**
1. Otwórz przeglądarkę w trybie incognito
2. Spróbuj wejść na chronioną stronę: `http://localhost:4321/groups`
3. ✅ **Oczekiwany rezultat:** Przekierowanie do `/auth/login?redirect=/groups`

### Test 2: Logowanie

**Cel:** Sprawdzić pełny flow logowania

**Kroki:**
1. Otwórz `http://localhost:4321/auth/login`
2. Wypełnij formularz:
   - Email: użytkownik testowy
   - Hasło: hasło testowe
3. Kliknij "Zaloguj"
4. ✅ **Oczekiwany rezultat:**
   - Komunikat "Zalogowano. Przekierowuję..."
   - Przekierowanie na stronę główną (`/`)
   - W localStorage powinien pojawić się klucz Supabase (`sb-*-auth-token`)

### Test 3: Przekierowanie po logowaniu

**Cel:** Sprawdzić, czy parametr `redirect` działa poprawnie

**Kroki:**
1. Wyloguj się (jeśli jest taka możliwość)
2. Spróbuj wejść na: `http://localhost:4321/groups/123`
3. Zostaniesz przekierowany do: `/auth/login?redirect=/groups/123`
4. Zaloguj się
5. ✅ **Oczekiwany rezultat:** Przekierowanie z powrotem na `/groups/123`

### Test 4: Dostęp do chronionych zasobów

**Cel:** Sprawdzić, czy zalogowany użytkownik ma dostęp do API

**Kroki:**
1. Zaloguj się (Test 2)
2. Otwórz DevTools → Network
3. Wejdź na stronę wymagającą danych z API (np. `/groups`)
4. ✅ **Oczekiwany rezultat:**
   - API zwraca dane (status 200)
   - `ctx.locals.user.id` zawiera prawdziwy UUID użytkownika (nie DEFAULT_USER_ID)

### Test 5: Sesja po odświeżeniu strony

**Cel:** Sprawdzić, czy sesja jest zachowana w ciasteczkach

**Kroki:**
1. Zaloguj się (Test 2)
2. Odśwież stronę (F5)
3. ✅ **Oczekiwany rezultat:**
   - Użytkownik pozostaje zalogowany
   - Brak przekierowania do `/auth/login`

### Test 6: Niepoprawne dane logowania

**Cel:** Sprawdzić obsługę błędów

**Kroki:**
1. Otwórz `/auth/login`
2. Wprowadź niepoprawny email/hasło
3. Kliknij "Zaloguj"
4. ✅ **Oczekiwany rezultat:**
   - Komunikat błędu: "Nieprawidłowy email lub hasło."
   - Brak przekierowania
   - Focus na polu z błędem (accessibility)

### Test 7: Strony publiczne

**Cel:** Sprawdzić, czy strony publiczne są dostępne bez logowania

**Kroki:**
1. Wyloguj się
2. Spróbuj wejść na:
   - `/` - strona główna
   - `/auth/login` - logowanie
   - `/auth/register` - rejestracja
   - `/auth/forgot-password` - przypomnienie hasła
   - `/auth/reset-password` - reset hasła
3. ✅ **Oczekiwany rezultat:**
   - Wszystkie strony są dostępne
   - Brak przekierowania do logowania

## 🐛 Znane problemy i rozwiązania

### Problem: `secure: true` w ciasteczkach może nie działać w dev

**Rozwiązanie:** W production używaj HTTPS. W dev, jeśli są problemy, tymczasowo zmień w `src/db/supabase.client.ts`:
```typescript
export const cookieOptions: CookieOptionsWithName = {
  path: "/",
  secure: import.meta.env.PROD, // tylko w production
  httpOnly: true,
  sameSite: "lax",
};
```

### Problem: Redirect loop

**Objawy:** Ciągłe przekierowania między `/auth/login` a `/`

**Rozwiązanie:** Sprawdź:
1. Czy middleware nie blokuje `/auth/login` (powinno być w `PUBLIC_PATHS`)
2. Czy `supabase.auth.getUser()` zwraca prawidłową sesję
3. Czy w localStorage jest klucz Supabase auth

### Problem: 401 na API routes

**Objawy:** API zwraca błąd autoryzacji mimo zalogowania

**Rozwiązanie:**
1. Sprawdź czy w middleware `locals.user` jest ustawione
2. Upewnij się, że API route używa `ctx.locals.user?.id`
3. Sprawdź czy RLS (Row Level Security) w Supabase nie blokuje zapytań

## 📚 Następne kroki

### Dodatkowe funkcjonalności do zaimplementowania (opcjonalnie):

1. **Wylogowywanie:**
   - Dodaj button "Wyloguj" w topbarze
   - Stwórz API endpoint `/api/auth/logout` (POST)
   - Wywołaj `supabase.auth.signOut()` i wyczyść ciasteczka

2. **Rejestracja:**
   - Zaktualizuj `src/pages/auth/register.astro`
   - Dodaj funkcję `registerWithEmailPassword` w `client.ts`

3. **Reset hasła:**
   - Sprawdź czy `src/pages/auth/forgot-password.astro` działa z `requestPasswordReset()`
   - Sprawdź czy `src/pages/auth/reset-password.astro` działa z `updatePassword()`

4. **Refresh token:**
   - Middleware automatycznie odświeża tokeny dzięki `@supabase/ssr`
   - Sprawdź czy działa poprawnie po wygaśnięciu sesji (domyślnie 1 godzina)

5. **Email verification:**
   - Skonfiguruj w Supabase Auth → Email Templates
   - Dodaj stronę `/auth/verify-email` (opcjonalnie)

## 🔐 Bezpieczeństwo

✅ **Zaimplementowane:**
- HttpOnly cookies - token nie jest dostępny z JavaScript
- SameSite: lax - ochrona przed CSRF
- Secure flag - tylko HTTPS w production
- Server-side session validation w middleware
- Sanityzacja redirect URL (ochrona przed open redirect)

⚠️ **Do rozważenia w przyszłości:**
- Rate limiting dla endpointów auth
- CAPTCHA dla rejestracji/logowania
- 2FA (dwuskładnikowa autentykacja)
- Audit log dla operacji na użytkownikach

## 💡 Wskazówki deweloperskie

### Jak sprawdzić czy użytkownik jest zalogowany w komponencie Astro?

```astro
---
const { user } = Astro.locals;
---

{user ? (
  <p>Zalogowany jako: {user.email}</p>
) : (
  <a href="/auth/login">Zaloguj się</a>
)}
```

### Jak użyć Supabase client w komponencie React?

```tsx
import { createSupabaseBrowserInstance } from "@/db/supabase.client";

const supabase = createSupabaseBrowserInstance();
const { data: { user } } = await supabase.auth.getUser();
```

### Jak użyć Supabase client w API route?

```typescript
export const GET: APIRoute = async ({ locals }) => {
  const supabase = locals.supabase; // już utworzone w middleware
  const userId = locals.user?.id; // ID zalogowanego użytkownika
  
  // ... twoja logika
};
```

## 📞 Pytania?

W razie problemów:
1. Sprawdź logi w DevTools → Console i Network
2. Sprawdź logi Supabase w Dashboard → Logs → Auth
3. Upewnij się, że zmienne środowiskowe są poprawne

