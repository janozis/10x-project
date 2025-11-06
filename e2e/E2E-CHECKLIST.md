# E2E Testing Checklist ✅

## ✅ Co zostało skonfigurowane:

### 1. Zmienne środowiskowe
- ✅ Utworzono `.env.test.example` z przykładowymi zmiennymi
- ✅ Dodano obsługę dotenv w `playwright.config.ts`
- ✅ Dodano `.env.test` do `.gitignore`
- ✅ Dodano katalog `e2e/.auth/` do `.gitignore`

**Zmienne dostępne w testach:**
- `E2E_USERNAME_ID` - UUID użytkownika testowego
- `E2E_USERNAME` - Email użytkownika testowego
- `E2E_PASSWORD` - Hasło użytkownika testowego
- `BASE_URL` - URL aplikacji (domyślnie: http://localhost:4321)
- `STORAGE_STATE` - Ścieżka do zapisanego stanu autentykacji

### 2. Konfiguracja Playwright
- ✅ Załadowanie zmiennych z `.env.test`
- ✅ Setup project dla autentykacji (`auth.setup.ts`)
- ✅ Automatyczne używanie zapisanego stanu autentykacji
- ✅ Chromium jako jedyna przeglądarka (zgodnie z wytycznymi)
- ✅ Port 4321 w `astro.config.mjs`

### 3. Page Object Model
- ✅ Utworzono katalog `e2e/page-objects/`
- ✅ `LoginPage` - obsługa logowania
- ✅ `DashboardPage` - nawigacja po dashboardzie
- ✅ Centralna eksportacja z `index.ts`

### 4. Pliki testowe
- ✅ `auth.setup.ts` - autentykacja przed testami
- ✅ `auth-pom.spec.ts` - testy autentykacji z POM
- ✅ `authenticated.spec.ts` - testy dla zalogowanego użytkownika
- ✅ `auth.spec.ts` - oryginalne testy (bez POM)
- ✅ `example.spec.ts` - podstawowe przykłady

### 5. Dokumentacja
- ✅ `e2e/SETUP.md` - szczegółowa instrukcja konfiguracji
- ✅ `e2e/README.md` - szybki start i troubleshooting
- ✅ `TESTING.md` - zaktualizowany główny przewodnik
- ✅ `e2e/E2E-CHECKLIST.md` - ten plik

## 📋 Co musisz zrobić (jednorazowo):

### 1. Utwórz plik .env.test

```bash
cp .env.test.example .env.test
```

### 2. Wypełnij dane testowe

⚠️ **WAŻNE:** `.env.test` musi zawierać **WSZYSTKIE** zmienne z `.env`, ale wskazujące na **testowe środowisko**!

Edytuj `.env.test`:

```env
# Test user credentials
E2E_USERNAME_ID=twój-uuid-użytkownika
E2E_USERNAME=test@twoja-domena.com
E2E_PASSWORD=twoje-bezpieczne-hasło

# Testowa baza danych (NIE produkcyjna!)
SUPABASE_URL=https://twój-test-project.supabase.co
SUPABASE_ANON_KEY=twój-test-anon-key

# Inne zmienne z .env (dostosowane do testów)
# ...
```

**Dlaczego to ważne?**
- Playwright uruchamia serwer z `npm run dev:test`
- Serwer używa **wszystkich** zmiennych z `.env.test`
- Aplikacja łączy się z **testową** bazą danych
- Unikamy zanieczyszczania danych deweloperskich/produkcyjnych

### 3. Utwórz użytkownika testowego

**Opcja A - Przez UI:**
```bash
npm run dev
# Otwórz http://localhost:4321/auth/register
# Zarejestruj użytkownika testowego
```

**Opcja B - Przez Supabase Dashboard:**
- Wejdź do Authentication > Users
- Kliknij "Add user"
- Wprowadź email i hasło

### 4. Zainstaluj przeglądarkę

```bash
npx playwright install chromium
```

### 5. Przetestuj setup

```bash
# Test autentykacji
npx playwright test auth.setup.ts

# Powinno pokazać: ✓ Authentication successful
```

## 🚀 Uruchamianie testów

```bash
# Wszystkie testy E2E
npm run test:e2e

# Tryb UI (polecany do development)
npm run test:e2e:ui

# Debug mode
npm run test:e2e:debug

# Konkretny plik
npx playwright test auth-pom.spec.ts

# Tylko setup
npx playwright test auth.setup.ts
```

## 📝 Pisanie nowych testów

### Szablon z Page Object Model:

```typescript
import { test, expect } from '@playwright/test';
import { YourPage } from './page-objects';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    // Arrange - przygotowanie
    const yourPage = new YourPage(page);
    await yourPage.goto();

    // Act - akcja
    await yourPage.doSomething();

    // Assert - weryfikacja
    await expect(page).toHaveURL(/\/expected-url/);
  });
});
```

### Testy bez autentykacji:

```typescript
test.use({ storageState: { cookies: [], origins: [] } });

test('should work without auth', async ({ page }) => {
  // Test dla niezalogowanego użytkownika
});
```

### Testy z autentykacją (domyślne):

```typescript
// Automatycznie używa zapisanego stanu z auth.setup.ts
test('should work when logged in', async ({ page }) => {
  await page.goto('/dashboard');
  // Użytkownik już jest zalogowany
});
```

## 🎯 Best Practices

### ✅ DO:
- Używaj Page Object Model dla złożonych interakcji
- Stosuj wzorzec AAA (Arrange, Act, Assert)
- Używaj semantycznych selektorów (`getByRole`, `getByLabel`)
- Używaj `data-testid` gdy semantyczne selektory nie wystarczają
- Reużywaj stanu autentykacji (szybsze testy)
- Izoluj testy używając browser contexts
- Dodawaj komentarze opisujące kroki testu

### ❌ DON'T:
- Nie commituj `.env.test` do repozytorium
- Nie używaj produkcyjnych danych w testach
- Nie hardcoduj credentials w testach
- Nie używaj CSS selektorów gdy dostępne są semantyczne
- Nie duplikuj logiki - używaj Page Objects

## 🔧 Troubleshooting

### Problem: "E2E_USERNAME and E2E_PASSWORD must be set"
**Rozwiązanie:** Upewnij się że `.env.test` istnieje w root projektu

### Problem: "Timed out waiting from config.webServer"
**Rozwiązanie:** 
```bash
lsof -ti:4321 | xargs kill -9
```

### Problem: "Authentication failed"
**Rozwiązanie:** Sprawdź czy użytkownik testowy istnieje i credentials są poprawne

### Problem: "EACCES: permission denied"
**Rozwiązanie:**
```bash
sudo rm -rf test-results playwright-report e2e/.auth
npm run test:e2e
```

## 📚 Dodatkowe zasoby

- [e2e/SETUP.md](./SETUP.md) - Szczegółowa instrukcja setup
- [e2e/README.md](./README.md) - Quick start guide
- [TESTING.md](../TESTING.md) - Główny przewodnik testowania
- [Playwright Docs](https://playwright.dev/) - Oficjalna dokumentacja

## 🔐 Bezpieczeństwo

⚠️ **WAŻNE:**
- `.env.test` jest w `.gitignore` - **NIE commituj go**
- Używaj dedykowanych użytkowników testowych
- Nie używaj prawdziwych danych produkcyjnych
- W CI/CD używaj secrets dla credentials
- Regularnie zmieniaj hasła użytkowników testowych

## ✨ Podsumowanie

Środowisko E2E jest w pełni skonfigurowane zgodnie z wytycznymi:
- ✅ Zmienne środowiskowe z `.env.test`
- ✅ Page Object Model w `e2e/page-objects/`
- ✅ Autentykacja z reużywaniem stanu
- ✅ Chromium jako jedyna przeglądarka
- ✅ Wzorzec AAA w testach
- ✅ data-testid convention
- ✅ Pełna dokumentacja

**Wszystko gotowe do pisania testów E2E! 🎉**

