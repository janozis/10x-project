# Environment Variables Template for E2E Tests

Skopiuj poniższe zmienne do pliku `.env.test` w głównym katalogu projektu.

## Wymagane zmienne

```bash
# ============================================
# TESTOWI UŻYTKOWNICY
# ============================================
# ID użytkowników testowych w Supabase auth.users
# Ci użytkownicy muszą już istnieć w bazie danych
E2E_USERNAME_ID=00000000-0000-0000-0000-000000000000
E2E_USERNAME=test@example.com
E2E_PASSWORD=testpassword123

E2E_2_USERNAME_ID=00000000-0000-0000-0000-000000000001
E2E_2_USERNAME=test2@example.com
E2E_2_PASSWORD=testpassword123

# ============================================
# KONFIGURACJA TESTÓW
# ============================================
# URL aplikacji dla testów
BASE_URL=http://localhost:4321

# Ścieżka do pliku ze stanem sesji
STORAGE_STATE=e2e/.auth/user.json

# ============================================
# SUPABASE - TESTOWA BAZA DANYCH
# ============================================
# ⚠️ WAŻNE: Użyj TESTOWEJ instancji Supabase!
# NIE używaj produkcyjnej bazy danych dla testów E2E!

# URL testowego projektu Supabase
SUPABASE_URL=https://your-test-project.supabase.co

# Anon Key testowego projektu
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Warianty PUBLIC dla Astro (powinny być identyczne jak powyżej)
PUBLIC_SUPABASE_URL=https://your-test-project.supabase.co
PUBLIC_SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ============================================
# OPCJONALNE
# ============================================
# Debug logs
ENABLE_DEBUG_LOGS=true
```

## Jak uzyskać wartości

### 1. E2E_USERNAME_ID i E2E_2_USERNAME_ID

Musisz utworzyć dwóch testowych użytkowników w Supabase:

#### Opcja A: Supabase Dashboard
1. Otwórz Supabase Dashboard
2. Przejdź do: Authentication → Users
3. Kliknij "Add user" (lub "Invite user")
4. Wypełnij formularz:
   - Email: `test@example.com`
   - Password: `testpassword123`
   - Auto-confirm: ✅
5. Zapisz UUID użytkownika (będzie widoczny po utworzeniu)
6. Powtórz dla drugiego użytkownika (`test2@example.com`)

#### Opcja B: SQL
```sql
-- Utwórz użytkowników testowych
-- Uwaga: To wymaga bezpośredniego dostępu do bazy przez SQL Editor

-- Użytkownik 1
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'test@example.com',
  crypt('testpassword123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now()
);

-- Użytkownik 2
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'test2@example.com',
  crypt('testpassword123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now()
);
```

#### Opcja C: API (Node.js script)
```javascript
// create-test-users.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://your-test-project.supabase.co',
  'your-service-role-key' // Service role key ma uprawnienia admin
);

// Utwórz użytkownika 1
const { data: user1, error: error1 } = await supabase.auth.admin.createUser({
  email: 'test@example.com',
  password: 'testpassword123',
  email_confirm: true,
});
console.log('User 1 ID:', user1?.user?.id);

// Utwórz użytkownika 2
const { data: user2, error: error2 } = await supabase.auth.admin.createUser({
  email: 'test2@example.com',
  password: 'testpassword123',
  email_confirm: true,
});
console.log('User 2 ID:', user2?.user?.id);
```

### 2. SUPABASE_URL i SUPABASE_ANON_KEY

1. Otwórz Supabase Dashboard
2. Wybierz swój **testowy** projekt
3. Przejdź do: Settings → API
4. Skopiuj:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`

### 3. PUBLIC_SUPABASE_URL i PUBLIC_SUPABASE_KEY

Te powinny być **identyczne** jak `SUPABASE_URL` i `SUPABASE_ANON_KEY`.

Astro wymaga prefixu `PUBLIC_` dla zmiennych dostępnych w kodzie klienta.

## Weryfikacja konfiguracji

Po skonfigurowaniu `.env.test`, uruchom testy aby sprawdzić czy wszystko działa:

```bash
# Test połączenia i autentykacji
npm run test:e2e -- e2e/auth.spec.ts

# Test teardown
npm run test:e2e -- e2e/teardown-verification.spec.ts

# Wszystkie testy
npm run test:e2e
```

## Troubleshooting

### Błąd: "Missing SUPABASE_URL or SUPABASE_ANON_KEY"

**Przyczyna:** Plik `.env.test` nie istnieje lub nie zawiera wymaganych zmiennych.

**Rozwiązanie:**
1. Upewnij się, że plik `.env.test` znajduje się w **głównym katalogu projektu** (nie w `e2e/`)
2. Sprawdź nazwy zmiennych - muszą być dokładnie jak w szablonie
3. Zrestartuj terminal aby załadować nowe zmienne

### Błąd: "E2E_USERNAME and E2E_PASSWORD must be set"

**Przyczyna:** Brak danych logowania testowego użytkownika.

**Rozwiązanie:** Dodaj `E2E_USERNAME` i `E2E_PASSWORD` do `.env.test`

### Błąd: "No test user IDs found" w teardown

**Przyczyna:** Brak `E2E_USERNAME_ID` lub `E2E_2_USERNAME_ID`.

**Rozwiązanie:**
1. Znajdź UUID użytkowników testowych w Supabase Dashboard
2. Dodaj je do `.env.test`

### Błąd: "Invalid login credentials"

**Przyczyna:** Nieprawidłowy email lub hasło, lub użytkownik nie istnieje w bazie.

**Rozwiązanie:**
1. Sprawdź czy użytkownik istnieje: Supabase Dashboard → Authentication → Users
2. Zresetuj hasło jeśli potrzeba
3. Upewnij się, że email jest potwierdzony (`email_confirmed_at` nie jest NULL)

### Teardown nie usuwa danych

**Przyczyna:** Brak uprawnień lub niepoprawne ID użytkowników.

**Rozwiązanie:**
1. Sprawdź czy `E2E_USERNAME_ID` i `E2E_2_USERNAME_ID` są poprawne
2. Sprawdź RLS policies - czy anon key ma prawo do usuwania?
3. Sprawdź logi teardown - czy widnieją błędy?

## Bezpieczeństwo

⚠️ **WAŻNE:**

1. **Nigdy nie commituj pliku `.env.test`** (jest w `.gitignore`)
2. **Używaj oddzielnej bazy testowej** - nie produkcyjnej!
3. **Używaj dedykowanych użytkowników testowych** - nie prawdziwych kont
4. **W CI/CD używaj secrets** - nie hardcode'uj credentials

## Przykład CI/CD

### GitHub Actions

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install chromium
      
      - name: Run E2E tests
        env:
          E2E_USERNAME_ID: ${{ secrets.E2E_USERNAME_ID }}
          E2E_2_USERNAME_ID: ${{ secrets.E2E_2_USERNAME_ID }}
          E2E_USERNAME: ${{ secrets.E2E_USERNAME }}
          E2E_PASSWORD: ${{ secrets.E2E_PASSWORD }}
          E2E_2_USERNAME: ${{ secrets.E2E_2_USERNAME }}
          E2E_2_PASSWORD: ${{ secrets.E2E_2_PASSWORD }}
          SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.TEST_SUPABASE_ANON_KEY }}
          PUBLIC_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
          PUBLIC_SUPABASE_KEY: ${{ secrets.TEST_SUPABASE_ANON_KEY }}
        run: npm run test:e2e
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

## Zobacz też

- [README.md](./README.md) - Główna dokumentacja testów
- [SETUP.md](./SETUP.md) - Szczegółowa instrukcja konfiguracji
- [TEARDOWN.md](./TEARDOWN.md) - Dokumentacja czyszczenia bazy

