# Global Teardown - Czyszczenie bazy danych Supabase

## Opis

Global teardown to mechanizm Playwright, który automatycznie czyści bazę danych Supabase po zakończeniu wszystkich testów E2E. Zapewnia to izolację testów i zapobiega gromadzeniu się danych testowych.

## Jak to działa

### 1. Konfiguracja Playwright

W pliku `playwright.config.ts` zdefiniowano projekt teardown:

```typescript
projects: [
  {
    name: "setup",
    testMatch: /.*\.setup\.ts/,
  },
  {
    name: "chromium",
    use: { 
      ...devices["Desktop Chrome"],
      storageState: './e2e/.auth/user.json'
    },
    dependencies: ["setup"],
    teardown: "cleanup",  // ← Uruchamia cleanup po testach
  },
  {
    name: "cleanup",
    testMatch: /.*\.teardown\.ts/,  // ← Dopasowuje global.teardown.ts
  },
]
```

### 2. Plik teardown

Plik `e2e/global.teardown.ts` zawiera logikę czyszczenia:

1. **Tworzy klienta Supabase** z uprawnieniami administratora
2. **Znajduje wszystkie grupy** utworzone przez testowych użytkowników
3. **Usuwa dane w odpowiedniej kolejności** respektując foreign keys

### 3. Kolejność usuwania

Dane są usuwane w kolejności zapewniającej spełnienie ograniczeń foreign key:

```
1. ai_evaluations        → referencje do activities
2. activity_editors      → referencje do activities + users
3. activity_schedules    → referencje do activities + camp_days
4. group_tasks           → referencje do groups + activities
5. activities            → referencje do groups
6. camp_days             → referencje do groups
7. group_memberships     → referencje do groups + users
8. groups                → root hierarchii
```

### 4. Co jest usuwane

✅ **Usuwane:**
- Wszystkie grupy utworzone przez testowych użytkowników
- Wszystkie aktywności w tych grupach
- Wszystkie dni obozu w tych grupach
- Wszystkie harmonogramy aktywności
- Wszystkie zadania grupowe
- Wszystkie oceny AI
- Wszystkie przypisania editorów
- Wszystkie członkostwa w grupach

❌ **NIE usuwane:**
- Testowi użytkownicy (`auth.users`) - są wielokrotnego użytku

## Zmienne środowiskowe

Teardown wymaga następujących zmiennych w `.env.test`:

```bash
# ID testowych użytkowników (do identyfikacji danych do usunięcia)
E2E_USERNAME_ID=uuid-testowego-uzytkownika-1
E2E_2_USERNAME_ID=uuid-testowego-uzytkownika-2

# Supabase credentials (testowa instancja!)
SUPABASE_URL=https://your-test-project.supabase.co
SUPABASE_ANON_KEY=your-test-anon-key
```

## Testowanie teardown

### Uruchom wszystkie testy

```bash
npm run test:e2e
```

Po zakończeniu testów zobaczysz w konsoli:

```
🧹 Starting database cleanup...
   Test user IDs to clean: uuid-1, uuid-2
   Found 5 groups to clean
   Found 12 activities to clean
   Found 7 camp days to clean
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

### Uruchom tylko teardown

```bash
npx playwright test --project=cleanup
```

## Debugging

### Problem: Teardown nie usuwa danych

1. **Sprawdź zmienne środowiskowe:**
   ```bash
   echo $E2E_USERNAME_ID
   echo $SUPABASE_URL
   ```

2. **Sprawdź czy użytkownicy testowi istnieją w bazie:**
   ```sql
   SELECT id, email FROM auth.users 
   WHERE id IN ('uuid-1', 'uuid-2');
   ```

3. **Sprawdź RLS policies** - upewnij się, że anon key ma dostęp do usuwania:
   ```sql
   SELECT tablename, policyname, cmd 
   FROM pg_policies 
   WHERE schemaname = 'public';
   ```

### Problem: Foreign key violation

Jeśli widzisz błąd typu "violates foreign key constraint":

1. **Sprawdź kolejność usuwania** w `global.teardown.ts`
2. **Dodaj brakującą tabelę** do sekwencji czyszczenia
3. **Sprawdź cascade rules** w migracjach

### Problem: Timeout during cleanup

Jeśli czyszczenie trwa zbyt długo:

1. **Zwiększ timeout** w `playwright.config.ts`:
   ```typescript
   use: {
     actionTimeout: 30000,
   }
   ```

2. **Optymalizuj zapytania** - użyj batch operations zamiast pojedynczych DELETE

## Best Practices

### 1. Używaj unikalnych identyfikatorów w testach

```typescript
import { generateUniqueGroupName } from "./test-helpers";

const groupName = generateUniqueGroupName("My Test Group");
```

### 2. Nie polegaj na stanie między testami

Każdy test powinien być niezależny i tworzyć własne dane:

```typescript
test("should create activity", async ({ page }) => {
  // ✅ Dobry - tworzy własną grupę
  await createTestGroup(page);
  await createActivity(page);
  
  // ❌ Zły - zakłada istnienie grupy z poprzedniego testu
  await page.goto("/groups/existing-group");
});
```

### 3. Używaj testowych użytkowników

Nie twórz nowych użytkowników w testach - użyj istniejących:

```typescript
// ✅ Dobry - używa istniejącego użytkownika
const username = process.env.E2E_USERNAME;

// ❌ Zły - tworzy nowego (nie zostanie usunięty przez teardown)
await supabase.auth.signUp({ email: "new@test.com", password: "..." });
```

### 4. Ostrożnie z workers

Przy `workers: 1` teardown działa raz na końcu. Przy `workers > 1` może działać wielokrotnie lub wymagać dodatkowej synchronizacji.

## Integracja z CI/CD

### GitHub Actions

```yaml
- name: Run E2E tests
  env:
    E2E_USERNAME_ID: ${{ secrets.E2E_USERNAME_ID }}
    E2E_2_USERNAME_ID: ${{ secrets.E2E_2_USERNAME_ID }}
    SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
    SUPABASE_ANON_KEY: ${{ secrets.TEST_SUPABASE_ANON_KEY }}
  run: npm run test:e2e
```

### GitLab CI

```yaml
e2e-tests:
  script:
    - npm run test:e2e
  variables:
    E2E_USERNAME_ID: $E2E_USERNAME_ID
    E2E_2_USERNAME_ID: $E2E_2_USERNAME_ID
    SUPABASE_URL: $TEST_SUPABASE_URL
    SUPABASE_ANON_KEY: $TEST_SUPABASE_ANON_KEY
```

## Rozszerzanie teardown

### Dodawanie nowej tabeli do czyszczenia

1. **Określ zależności** - czy tabela ma foreign keys?
2. **Znajdź właściwe miejsce** w kolejności usuwania
3. **Dodaj operację DELETE:**

```typescript
// Przykład: dodanie nowej tabeli "comments" (zależy od activities)
if (testActivityIds.length > 0) {
  const { error: commentsError } = await supabase
    .from("comments")
    .delete()
    .in("activity_id", testActivityIds);
  
  if (commentsError) console.error("❌ Error deleting comments:", commentsError);
  else console.log("   ✓ Cleaned comments");
}
```

### Selektywne czyszczenie

Jeśli chcesz zachować niektóre dane testowe:

```typescript
// Usuń tylko grupy starsze niż 1 dzień
const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

const { data: testGroups } = await supabase
  .from("groups")
  .select("id")
  .in("created_by", testUserIds)
  .lt("created_at", oneDayAgo);
```

## Monitorowanie

### Logowanie statystyk

Dodaj więcej szczegółów do logów:

```typescript
console.log(`   Deleted ${deletedCount} records from activities`);
console.log(`   Total cleanup time: ${cleanupTime}ms`);
```

### Metryki w CI

```typescript
const startTime = Date.now();
await cleanupTestData(supabase);
const duration = Date.now() - startTime;

// Zapisz metrykę do pliku dla CI
fs.writeFileSync("cleanup-metrics.json", JSON.stringify({ duration }));
```

## Troubleshooting

| Problem | Możliwa przyczyna | Rozwiązanie |
|---------|-------------------|-------------|
| "Missing SUPABASE_URL" | Brak zmiennych środowiskowych | Sprawdź `.env.test` |
| "No test user IDs found" | Brak E2E_USERNAME_ID | Dodaj ID w `.env.test` |
| Foreign key violation | Zła kolejność usuwania | Popraw kolejność w teardown |
| Timeout | Zbyt dużo danych | Zwiększ timeout lub optymalizuj |
| Permission denied | RLS blokuje usuwanie | Sprawdź polityki RLS |

## Zobacz też

- [E2E Testing Setup](./SETUP.md)
- [Test Helpers](./test-helpers.ts)
- [Playwright Configuration](../playwright.config.ts)
- [Supabase RLS Policies](../supabase/RLS_POLICIES.md)

