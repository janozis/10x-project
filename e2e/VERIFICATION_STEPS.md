# Weryfikacja działania Teardown - Instrukcja krok po kroku

## Krok 1: Sprawdź konfigurację

### A. Upewnij się, że masz skonfigurowane `.env.test`

```bash
# Sprawdź czy plik istnieje
ls -la .env.test

# Sprawdź czy zawiera wymagane zmienne
grep -E "E2E_USERNAME_ID|SUPABASE_URL" .env.test
```

**Wymagane zmienne:**
- `E2E_USERNAME_ID` - UUID pierwszego testowego użytkownika
- `E2E_2_USERNAME_ID` - UUID drugiego testowego użytkownika (opcjonalny)
- `SUPABASE_URL` - URL testowej bazy Supabase
- `SUPABASE_ANON_KEY` - Anon key testowej bazy

### B. Sprawdź czy testowi użytkownicy istnieją w bazie

Opcja 1: Supabase Dashboard
1. Otwórz Supabase Dashboard
2. Authentication → Users
3. Sprawdź czy istnieją użytkownicy z emailami z `.env.test`

Opcja 2: SQL Editor
```sql
-- W Supabase Dashboard → SQL Editor
SELECT id, email, created_at 
FROM auth.users 
WHERE id IN (
  '00000000-0000-0000-0000-000000000000',  -- Zamień na swój E2E_USERNAME_ID
  '00000000-0000-0000-0000-000000000001'   -- Zamień na swój E2E_2_USERNAME_ID
);
```

## Krok 2: Sprawdź stan bazy PRZED testem

```sql
-- Policz istniejące grupy testowych użytkowników
SELECT COUNT(*) as group_count
FROM public.groups 
WHERE created_by IN (
  '00000000-0000-0000-0000-000000000000',  -- Zamień na E2E_USERNAME_ID
  '00000000-0000-0000-0000-000000000001'   -- Zamień na E2E_2_USERNAME_ID
);
```

Zapisz tę liczbę - porównasz ją po teardown.

## Krok 3: Uruchom test weryfikacyjny

```bash
# Test który tworzy dane testowe
npx playwright test teardown-verification.spec.ts
```

**Co się dzieje:**
- Test tworzy kilka grup testowych
- Grupy mają nazwy zaczynające się od `[TEARDOWN-TEST]`
- Po zakończeniu testów, teardown automatycznie usuwa te grupy

**Oczekiwany output:**
```
Running 2 tests using 1 worker

  ✓ Teardown Verification > creates test data that should be cleaned by teardown
    ✓ Test group created: [TEARDOWN-TEST] 2025-11-07T20:53:12.345Z

  ✓ Teardown Verification > creates multiple groups to verify bulk cleanup
    ✓ Created bulk test group 1/3: [TEARDOWN-BULK-0] ...
    ✓ Created bulk test group 2/3: [TEARDOWN-BULK-1] ...
    ✓ Created bulk test group 3/3: [TEARDOWN-BULK-2] ...

2 passed

🧹 Starting database cleanup...
   Test user IDs to clean: uuid-1, uuid-2
   Found 4 groups to clean
   Found 0 activities to clean
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

## Krok 4: Sprawdź stan bazy PO teardown

```sql
-- Ta sama komenda co w Kroku 2
SELECT COUNT(*) as group_count
FROM public.groups 
WHERE created_by IN (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000001'
);
```

**Oczekiwany rezultat:** `0` (wszystkie grupy testowe zostały usunięte)

## Krok 5: Sprawdź szczegółowo co zostało usunięte

```sql
-- Sprawdź czy grupy z nazwami testowymi zostały usunięte
SELECT * FROM public.groups 
WHERE name LIKE '[TEARDOWN%' 
  OR name LIKE 'Test Group%';
-- Powinno zwrócić: 0 wyników

-- Sprawdź czy użytkownicy testowi nadal istnieją (powinni!)
SELECT id, email FROM auth.users 
WHERE id IN (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000001'
);
-- Powinno zwrócić: 2 wyniki (użytkownicy NIE są usuwani)
```

## 🎯 Sposób 2: Pełny test z debugowaniem

### Krok A: Włącz szczegółowe logi

```bash
# Uruchom testy z pełnym outputem
DEBUG=pw:api npx playwright test teardown-verification.spec.ts
```

### Krok B: Obserwuj bazę w czasie rzeczywistym

Otwórz dwa terminale:

**Terminal 1 - Testy:**
```bash
npm run test:e2e -- teardown-verification.spec.ts
```

**Terminal 2 - Monitoring bazy:**
```bash
# Co 2 sekundy sprawdzaj liczbę grup
watch -n 2 'echo "SELECT COUNT(*) FROM groups;" | psql YOUR_DB_CONNECTION_STRING'
```

Zobaczysz jak liczba grup:
1. Rośnie podczas testów (grupy są tworzone)
2. Spada do 0 po teardown (grupy są usuwane)

## 🧹 Sposób 3: Test ręcznego czyszczenia

Jeśli masz już dane testowe w bazie:

```bash
# Uruchom ręczne czyszczenie
npm run test:e2e:cleanup
```

**Oczekiwany output:**
```
╔════════════════════════════════════════════╗
║  Manual Database Cleanup for E2E Tests   ║
╚════════════════════════════════════════════╝

📋 Configuration:
   Supabase URL: https://your-project.supabase.co
   Test Users: 2
     1. uuid-1
     2. uuid-2

🔍 Scanning for test data...
   Found 5 groups to clean

📦 Groups to be deleted:
   1. Test Group 1699876543210 (created: 11/7/2025, 8:53:12 PM)
   2. Test Group 1699876544321 (created: 11/7/2025, 8:54:15 PM)
   ...

📊 Related data to be deleted:
   Activities: 12
   Camp Days: 7

⚠️  WARNING: This will permanently delete all test data!
   Press Ctrl+C to cancel, or wait 3 seconds to continue...

🗑️  Starting cleanup...

   ✓ Deleted 3 ai_evaluations
   ✓ Deleted 5 activity_editors
   ✓ Deleted 8 activity_schedules
   ✓ Deleted 4 group_tasks
   ✓ Deleted 12 activities
   ✓ Deleted 7 camp_days
   ✓ Deleted 8 group_memberships
   ✓ Deleted 5 groups

╔════════════════════════════════════════════╗
║  ✅ Cleanup completed successfully!       ║
║     Total records deleted: 52             ║
╚════════════════════════════════════════════╝
```

## 🐛 Troubleshooting

### Problem: "Missing SUPABASE_URL"

```bash
# Sprawdź czy zmienne są załadowane
cat .env.test | grep SUPABASE

# Upewnij się że plik jest w głównym katalogu projektu
pwd  # Powinno pokazać ścieżkę do projektu
ls .env.test  # Powinno znaleźć plik
```

### Problem: "No test user IDs found"

```bash
# Sprawdź ID użytkowników
grep E2E_USERNAME_ID .env.test

# Powinno zwrócić:
# E2E_USERNAME_ID=jakis-uuid
# E2E_2_USERNAME_ID=inny-uuid
```

### Problem: "Found 0 groups to clean"

**Możliwe przyczyny:**
1. UUID użytkowników w `.env.test` są niepoprawne
2. Nie uruchomiłeś jeszcze żadnych testów (baza jest pusta)
3. Poprzedni teardown już wyczyścił dane

**Rozwiązanie:**
```bash
# 1. Najpierw utwórz dane testowe
npx playwright test teardown-verification.spec.ts --grep "creates test data"

# 2. Sprawdź bazę - grupy powinny istnieć
# (użyj SQL z Kroku 4)

# 3. Uruchom teardown
npx playwright test --project=cleanup
```

### Problem: Teardown nie uruchamia się automatycznie

```bash
# Sprawdź konfigurację Playwright
grep -A 5 "teardown" playwright.config.ts

# Powinno pokazać:
#   teardown: "cleanup",
# oraz:
#   name: "cleanup",
#   testMatch: /.*\.teardown\.ts/,
```

## ✅ Checklist weryfikacji

- [ ] Plik `.env.test` istnieje i zawiera wszystkie wymagane zmienne
- [ ] Testowi użytkownicy istnieją w bazie Supabase
- [ ] Test `teardown-verification.spec.ts` przechodzi pomyślnie
- [ ] W logach widać komunikat "🧹 Starting database cleanup..."
- [ ] W logach widać "✅ Database cleanup completed successfully"
- [ ] Po testach liczba grup testowych = 0
- [ ] Testowi użytkownicy nadal istnieją w `auth.users`
- [ ] Ręczne czyszczenie działa: `npm run test:e2e:cleanup`

## 📊 Oczekiwane metryki

Po poprawnym działaniu teardown:

| Metryka | Wartość |
|---------|---------|
| Czas czyszczenia | 1-3 sekundy |
| Sukces rate | 100% |
| Grupy pozostałe | 0 |
| Użytkownicy usunięci | 0 |
| Błędy | 0 |

## 🎓 Dodatkowe testy

### Test 1: Duża ilość danych

```bash
# Utwórz wiele grup
npx playwright test groups-management.spec.ts activities-crud.spec.ts

# Sprawdź teardown z większą ilością danych
npm run test:e2e:cleanup
```

### Test 2: Równoległe uruchomienia

```bash
# Uruchom testy kilka razy pod rząd
npm run test:e2e && npm run test:e2e && npm run test:e2e

# Każde uruchomienie powinno zaczynać od czystej bazy
```

### Test 3: CI/CD simulation

```bash
# Symuluj środowisko CI
CI=true npm run test:e2e

# W CI teardown musi działać niezawodnie
```

## 📝 Notatki

- Teardown uruchamia się **po wszystkich testach**, nie po każdym teście
- Jeśli przerwiesz testy (Ctrl+C), teardown może się nie uruchomić
- W takim przypadku użyj: `npm run test:e2e:cleanup`
- Teardown używa `anon key`, nie `service role key` - uprawnienia są ograniczone przez RLS

