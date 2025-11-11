# DEBUG: UUID Mismatch - Teardown nie znajduje grup

## Problem

Teardown mówi "Found 0 groups to clean" mimo że baza jest pełna danych testowych.

## Przyczyna

UUID w zmiennych środowiskowych **NIE PASUJĄ** do UUID użytkownika który tworzy grupy w testach.

## Diagnoza

### Krok 1: Sprawdź UUID użytkownika testowego w bazie

W Supabase Dashboard → SQL Editor uruchom:

```sql
-- Znajdź UUID użytkownika testowego
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'testowy@jankosmala.pl';
```

Wynik pokaże coś takiego:
```
id: 12345678-1234-1234-1234-123456789012
email: testowy@jankosmala.pl
```

### Krok 2: Sprawdź kto stworzył grupy testowe

```sql
-- Sprawdź kto tworzył grupy testowe
SELECT 
  g.id,
  g.name,
  g.created_by,
  u.email
FROM public.groups g
LEFT JOIN auth.users u ON g.created_by = u.id
WHERE g.name LIKE '%TEARDOWN%' 
   OR g.name LIKE '%Test Group%'
ORDER BY g.created_at DESC
LIMIT 10;
```

To pokaże:
- Które grupy są testowe
- Kto je utworzył (UUID + email)

### Krok 3: Porównaj UUID

**UUID w `.env.test`:**
```
E2E_USERNAME_ID=a04ccb88-15f1-49a8-b3c0-f07b7bb226e5
E2E_2_USERNAME_ID=ea8413b5-1491-48b1-8e53-baadde8366f2
```

**UUID użytkownika w bazie:** `?????`

**UUID twórcy grup testowych:** `?????`

Jeśli się **NIE ZGADZAJĄ** - to jest problem!

## Rozwiązanie

### Opcja A: Popraw UUID w .env.test (ZALECANE)

1. Znajdź prawdziwy UUID użytkownika `testowy@jankosmala.pl` (SQL z Kroku 1)
2. Otwórz `.env.test`
3. Zamień:
   ```bash
   E2E_USERNAME_ID=a04ccb88-15f1-49a8-b3c0-f07b7bb226e5
   ```
   na:
   ```bash
   E2E_USERNAME_ID=PRAWDZIWY-UUID-Z-BAZY
   ```
4. Zapisz i uruchom test ponownie

### Opcja B: Ręcznie wyczyść bazę używając prawdziwego UUID

W Supabase Dashboard → SQL Editor:

```sql
-- UWAGA: To usunie WSZYSTKIE grupy utworzone przez tego użytkownika!
-- Zamień UUID na prawdziwy UUID z auth.users

-- 1. Znajdź grupy do usunięcia
SELECT id, name, created_by 
FROM public.groups 
WHERE created_by = 'PRAWDZIWY-UUID-Z-BAZY';

-- 2. Usuń dane w odpowiedniej kolejności (respektując foreign keys)

-- Znajdź IDs grup
WITH test_groups AS (
  SELECT id FROM public.groups 
  WHERE created_by = 'PRAWDZIWY-UUID-Z-BAZY'
),
test_activities AS (
  SELECT id FROM public.activities 
  WHERE group_id IN (SELECT id FROM test_groups)
),
test_camp_days AS (
  SELECT id FROM public.camp_days 
  WHERE group_id IN (SELECT id FROM test_groups)
)

-- Usuń ai_evaluations
DELETE FROM public.ai_evaluations 
WHERE activity_id IN (SELECT id FROM test_activities);

-- Usuń activity_editors
DELETE FROM public.activity_editors 
WHERE activity_id IN (SELECT id FROM test_activities);

-- Usuń activity_schedules
DELETE FROM public.activity_schedules 
WHERE activity_id IN (SELECT id FROM test_activities)
   OR camp_day_id IN (SELECT id FROM test_camp_days);

-- Usuń group_tasks
DELETE FROM public.group_tasks 
WHERE group_id IN (SELECT id FROM test_groups);

-- Usuń activities
DELETE FROM public.activities 
WHERE id IN (SELECT id FROM test_activities);

-- Usuń camp_days
DELETE FROM public.camp_days 
WHERE id IN (SELECT id FROM test_camp_days);

-- Usuń group_memberships
DELETE FROM public.group_memberships 
WHERE group_id IN (SELECT id FROM test_groups);

-- Usuń groups
DELETE FROM public.groups 
WHERE id IN (SELECT id FROM test_groups);
```

### Opcja C: Użyj skryptu manual-cleanup z poprawionymi UUID

```bash
# 1. Najpierw popraw UUID w .env.test
# 2. Potem uruchom:
npm run test:e2e:cleanup
```

## Weryfikacja po poprawce

Po poprawieniu UUID w `.env.test`, uruchom test:

```bash
npx playwright test teardown-verification.spec.ts
```

**Oczekiwany output:**
```
🧹 Starting database cleanup...
   Test user IDs to clean: PRAWDZIWY-UUID, ...
   Found 4 groups to clean       ← TERAZ POWINNO BYĆ > 0
   Found 12 activities to clean
   ✓ Cleaned ai_evaluations
   ✓ Cleaned activities
   ✓ Cleaned groups
✅ Database cleanup completed successfully
```

## Dodatkowe narzędzie diagnostyczne

Stworzyłem pomocniczy skrypt do sprawdzenia UUID:

```bash
# Uruchom to w terminalu (w katalogu projektu)
cat > e2e/check-uuid.sql << 'EOF'
-- Diagnostyka UUID dla teardown

SELECT 
  'auth.users' as table_name,
  id as uuid,
  email,
  created_at
FROM auth.users
WHERE email LIKE '%test%'

UNION ALL

SELECT 
  'groups.created_by' as table_name,
  DISTINCT created_by as uuid,
  'N/A' as email,
  MIN(created_at) as created_at
FROM public.groups
GROUP BY created_by
ORDER BY created_at DESC;
EOF

echo "SQL query created in e2e/check-uuid.sql"
echo "Copy and run it in Supabase Dashboard → SQL Editor"
```

To pokaże wszystkie UUID użytkowników testowych i kto tworzył grupy.

