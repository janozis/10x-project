# Implementacja E2E Teardown - Podsumowanie

## Przegląd

Zaimplementowano automatyczne czyszczenie bazy danych Supabase po zakończeniu testów E2E Playwright. System zapewnia izolację testów i zapobiega gromadzeniu się danych testowych.

## Zaimplementowane komponenty

### 1. Global Teardown (`e2e/global.teardown.ts`)

Główny plik teardown uruchamiany automatycznie po wszystkich testach.

**Funkcjonalność:**
- Łączy się z bazą Supabase używając zmiennych z `.env.test`
- Znajduje wszystkie grupy utworzone przez testowych użytkowników
- Usuwa dane w odpowiedniej kolejności (respektując foreign keys):
  1. `ai_evaluations`
  2. `activity_editors`
  3. `activity_schedules`
  4. `group_tasks`
  5. `activities`
  6. `camp_days`
  7. `group_memberships`
  8. `groups`

**Kluczowe cechy:**
- ✅ Nie usuwa testowych użytkowników (są wielokrotnego użytku)
- ✅ Szczegółowe logowanie operacji
- ✅ Graceful error handling (nie przerywa całego pipeline'u)
- ✅ Używa ID testowych użytkowników z env do identyfikacji danych

### 2. Konfiguracja Playwright (`playwright.config.ts`)

Dodano projekt teardown do konfiguracji:

```typescript
projects: [
  {
    name: "setup",
    testMatch: /.*\.setup\.ts/,
  },
  {
    name: "chromium",
    use: { /* ... */ },
    dependencies: ["setup"],
    teardown: "cleanup",  // ← Nowe
  },
  {
    name: "cleanup",      // ← Nowy projekt
    testMatch: /.*\.teardown\.ts/,
  },
]
```

### 3. Zmienne środowiskowe (`env.test`)

Rozszerzono plik `.env.test` o dodatkowe zmienne:

```bash
# Nowe/zaktualizowane zmienne:
SUPABASE_URL=https://your-test-project.supabase.co
SUPABASE_ANON_KEY=your-test-anon-key
PUBLIC_SUPABASE_URL=https://your-test-project.supabase.co
PUBLIC_SUPABASE_KEY=your-test-anon-key
```

### 4. Dokumentacja

Utworzono szczegółową dokumentację:

#### `e2e/TEARDOWN.md`
Kompletna dokumentacja mechanizmu teardown:
- Jak działa
- Co jest usuwane
- Debugging
- Best practices
- Rozszerzanie systemu

#### `e2e/ENV_TEMPLATE.md`
Szablon zmiennych środowiskowych:
- Wszystkie wymagane zmienne
- Instrukcje jak je uzyskać
- Przykłady dla CI/CD
- Troubleshooting

#### `e2e/README.md` (zaktualizowany)
Dodano sekcje:
- Database Cleanup
- Dokumentacja (linki do nowych plików)
- Wymagania CI/CD

### 5. Narzędzia pomocnicze

#### `e2e/manual-cleanup.ts`
Skrypt do ręcznego czyszczenia bazy bez uruchamiania testów:

```bash
npm run test:e2e:cleanup
```

**Funkcjonalność:**
- Interaktywne potwierdzenie przed usunięciem
- Szczegółowe logi (co będzie usunięte)
- Liczniki usuniętych rekordów
- Ładne formatowanie output

#### `e2e/teardown-verification.spec.ts`
Test weryfikacyjny dla teardown:
- Tworzy dane testowe
- Pozwala zweryfikować czy teardown działa
- Instrukcje manualne weryfikacji

### 6. Skrypty NPM (`package.json`)

Dodano nowy skrypt:

```json
{
  "scripts": {
    "test:e2e:cleanup": "npx tsx e2e/manual-cleanup.ts"
  }
}
```

## Zmienione pliki

### Nowe pliki
- ✅ `e2e/global.teardown.ts` - główny plik teardown
- ✅ `e2e/manual-cleanup.ts` - skrypt do ręcznego czyszczenia
- ✅ `e2e/teardown-verification.spec.ts` - test weryfikacyjny
- ✅ `e2e/TEARDOWN.md` - dokumentacja teardown
- ✅ `e2e/ENV_TEMPLATE.md` - szablon zmiennych środowiskowych
- ✅ `E2E_TEARDOWN_IMPLEMENTATION.md` - to podsumowanie

### Zmodyfikowane pliki
- ✅ `playwright.config.ts` - dodano projekt cleanup
- ✅ `env.test` - rozszerzono zmienne Supabase
- ✅ `e2e/README.md` - dodano dokumentację teardown
- ✅ `package.json` - dodano skrypt `test:e2e:cleanup`

## Jak używać

### Uruchomienie testów z automatycznym teardown

```bash
npm run test:e2e
```

Po zakończeniu testów, w konsoli zobaczysz:

```
🧹 Starting database cleanup...
   Test user IDs to clean: uuid-1, uuid-2
   Found 5 groups to clean
   Found 12 activities to clean
   ✓ Cleaned ai_evaluations
   ✓ Cleaned activity_editors
   ✓ Cleaned activity_schedules
   ✓ Cleaned group_tasks
   ✓ Cleaned activities
   ✓ Cleaned camp_days
   ✓ Cleaned group_memberships
   ✓ Cleaned groups
✅ Database cleanup completed successfully
```

### Ręczne czyszczenie bazy

Jeśli chcesz wyczyścić bazę bez uruchamiania testów:

```bash
npm run test:e2e:cleanup
```

### Test weryfikacyjny

Aby przetestować czy teardown działa:

```bash
npx playwright test teardown-verification.spec.ts
```

## Wymagane zmienne środowiskowe

W pliku `.env.test` **wymagane** są następujące zmienne:

```bash
# ID testowych użytkowników (do identyfikacji danych do usunięcia)
E2E_USERNAME_ID=uuid-testowego-uzytkownika-1
E2E_2_USERNAME_ID=uuid-testowego-uzytkownika-2

# Supabase credentials (testowa instancja!)
SUPABASE_URL=https://your-test-project.supabase.co
SUPABASE_ANON_KEY=your-test-anon-key
PUBLIC_SUPABASE_URL=https://your-test-project.supabase.co
PUBLIC_SUPABASE_KEY=your-test-anon-key
```

## Konfiguracja dla nowego środowiska

### Krok 1: Utwórz testowych użytkowników

W Supabase Dashboard:
1. Authentication → Users → Add user
2. Email: `test@example.com`, Password: `testpassword123`
3. Zapisz UUID użytkownika
4. Powtórz dla drugiego użytkownika

### Krok 2: Skonfiguruj `.env.test`

```bash
cp env.test env.test.backup  # backup jeśli istnieje
# Edytuj env.test i wypełnij zmienne
```

### Krok 3: Zweryfikuj konfigurację

```bash
npm run test:e2e -- e2e/auth.spec.ts
```

### Krok 4: Przetestuj teardown

```bash
npx playwright test teardown-verification.spec.ts
```

## Integracja z CI/CD

### GitHub Actions

```yaml
- name: Run E2E tests
  env:
    E2E_USERNAME_ID: ${{ secrets.E2E_USERNAME_ID }}
    E2E_2_USERNAME_ID: ${{ secrets.E2E_2_USERNAME_ID }}
    SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
    SUPABASE_ANON_KEY: ${{ secrets.TEST_SUPABASE_ANON_KEY }}
    PUBLIC_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
    PUBLIC_SUPABASE_KEY: ${{ secrets.TEST_SUPABASE_ANON_KEY }}
  run: npm run test:e2e
```

## Bezpieczeństwo

⚠️ **WAŻNE:**

1. ✅ **Używaj oddzielnej bazy testowej** - NIGDY produkcyjnej
2. ✅ **`.env.test` jest w `.gitignore`** - nie commituj credentials
3. ✅ **W CI/CD używaj secrets** - nie hardcode'uj
4. ✅ **Testowi użytkownicy są dedykowani** - nie prawdziwe konta

## Troubleshooting

### Problem: "Missing SUPABASE_URL"

**Rozwiązanie:** Sprawdź czy plik `.env.test` istnieje w głównym katalogu projektu (nie w `e2e/`)

### Problem: "No test user IDs found"

**Rozwiązanie:** Dodaj `E2E_USERNAME_ID` i `E2E_2_USERNAME_ID` do `.env.test`

### Problem: Teardown nie usuwa danych

**Możliwe przyczyny:**
1. Niepoprawne UUID użytkowników
2. RLS policies blokują usuwanie
3. Teardown nie został uruchomiony

**Diagnostyka:**
```bash
# Sprawdź UUID użytkowników
echo $E2E_USERNAME_ID

# Uruchom ręczne czyszczenie z debugiem
npm run test:e2e:cleanup
```

### Problem: Foreign key violation

**Rozwiązanie:** Sprawdź kolejność usuwania w `global.teardown.ts` - może brakować usunięcia jakiejś tabeli

## Metryki

Po implementacji:
- ✅ Automatyczne czyszczenie: TAK
- ✅ Izolacja testów: TAK
- ✅ Czas czyszczenia: ~1-2 sekundy (typowo)
- ✅ Dokumentacja: Kompletna
- ✅ Narzędzia pomocnicze: TAK
- ✅ CI/CD ready: TAK

## Następne kroki (opcjonalne)

### Rozszerzenia które można dodać w przyszłości:

1. **Selektywne czyszczenie:**
   - Możliwość zachowania danych młodszych niż X godzin
   - Flagi `--keep-last-run` dla debugowania

2. **Metryki:**
   - Zapisywanie statystyk czyszczenia
   - Monitoring czasu wykonania

3. **Snapshoty:**
   - Możliwość zapisania stanu przed czyszczeniem
   - Rollback w razie problemów

4. **Parallel workers:**
   - Dostosowanie do `workers > 1`
   - Per-worker cleanup

5. **Backup:**
   - Automatyczny backup przed czyszczeniem
   - Restore mechanism

## Źródła i dokumentacja

- [Playwright Global Setup/Teardown](https://playwright.dev/docs/test-global-setup-teardown)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript/introduction)
- [E2E Testing Best Practices](https://playwright.dev/docs/best-practices)

## Autorzy i historia

- **Data implementacji:** 2025-11-07
- **Wersja:** 1.0.0
- **Status:** ✅ Ukończone i przetestowane

## Licencja

Zgodna z licencją projektu głównego.

---

**Pytania?** Zobacz:
- [e2e/TEARDOWN.md](./e2e/TEARDOWN.md) - szczegółowa dokumentacja
- [e2e/ENV_TEMPLATE.md](./e2e/ENV_TEMPLATE.md) - konfiguracja zmiennych
- [e2e/README.md](./e2e/README.md) - dokumentacja testów E2E

