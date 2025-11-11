# RLS Policies dla E2E Test Cleanup

## Problem

Teardown używa `anon` key (SUPABASE_ANON_KEY) do czyszczenia bazy danych po testach.
Domyślnie wszystkie polityki RLS są ustawione tylko dla roli `authenticated`, więc `anon` nie ma uprawnień do usuwania danych.

## Rozwiązanie

Stworzyłem **dwie wersje** migracji dodającej polityki dla `anon`:

### 📄 Wersja 1: PROSTA (20251109000000_add_test_cleanup_policies.sql)

**Zalety:**
- ✅ Prosta implementacja
- ✅ Działa od razu bez konfiguracji
- ✅ Brak problemów z UUID

**Wady:**
- ⚠️ **Anon może usunąć WSZYSTKIE dane** (nie tylko testowe)
- ⚠️ Mniejsze bezpieczeństwo
- ⚠️ **Nie zalecana dla baz produkcyjnych**

**Użyj jeśli:**
- To jest **DEDYKOWANA BAZA TESTOWA** (nie produkcja)
- Anon key jest dobrze zabezpieczony
- Nie ma innych danych niż testowe

### 📄 Wersja 2: BEZPIECZNA (20251109000000_add_test_cleanup_policies_SECURE.sql)

**Zalety:**
- ✅ **Anon może usunąć TYLKO dane testowe** (według UUID)
- ✅ Lepsza security
- ✅ Bezpieczniejsza dla baz mieszanych (test + dev)

**Wady:**
- ⚠️ Wymaga konfiguracji UUID testowych użytkowników
- ⚠️ Trzeba aktualizować UUID przy zmianie użytkowników

**Użyj jeśli:**
- Baza zawiera również inne dane
- Chcesz lepszą kontrolę nad tym co może być usunięte
- Możesz utrzymać listę UUID testowych użytkowników

## 🚀 Jak zastosować (WYBIERZ JEDNĄ WERSJĘ)

### Opcja A: Prosta wersja (dla dedykowanych baz testowych)

```bash
# 1. Upewnij się że to jest TESTOWA baza danych
echo "⚠️  Czy to jest DEDYKOWANA baza testowa? (nie dev/prod)"
read -p "Kontynuować? (tak/nie): " answer

# 2. Zastosuj migrację
npx supabase db push

# Lub bezpośrednio przez SQL:
# W Supabase Dashboard → SQL Editor
# Skopiuj i uruchom zawartość: 20251109000000_add_test_cleanup_policies.sql
```

### Opcja B: Bezpieczna wersja (zalecana)

```bash
# 1. Znajdź UUID testowych użytkowników
# W Supabase Dashboard → SQL Editor:
SELECT id, email FROM auth.users WHERE email LIKE '%test%';

# 2. Edytuj migrację 20251109000000_add_test_cleanup_policies_SECURE.sql
# Znajdź funkcję is_test_user i zamień UUID:

CREATE OR REPLACE FUNCTION public.is_test_user(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN user_uuid IN (
    'TWOJ-E2E-USERNAME-ID-TUTAJ'::uuid,      -- ← ZMIEŃ
    'TWOJ-E2E-2-USERNAME-ID-TUTAJ'::uuid     -- ← ZMIEŃ
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

# 3. Usuń prostą wersję (jeśli istnieje)
# W Supabase Dashboard → SQL Editor:
DROP POLICY IF EXISTS groups_select_anon ON public.groups;
DROP POLICY IF EXISTS groups_delete_anon ON public.groups;
# ... (wszystkie polityki *_anon)

# 4. Zastosuj bezpieczną migrację
npx supabase db push

# Lub bezpośrednio przez SQL:
# Skopiuj i uruchom: 20251109000000_add_test_cleanup_policies_SECURE.sql
```

## ✅ Weryfikacja

Po zastosowaniu migracji, sprawdź czy polityki działają:

```sql
-- 1. Zobacz wszystkie polityki dla roli anon
SELECT 
  tablename, 
  policyname, 
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
  AND roles @> '{anon}'
ORDER BY tablename, cmd;

-- Powinno pokazać polityki SELECT i DELETE dla anon

-- 2. Test funkcji is_test_user (tylko dla bezpiecznej wersji)
SELECT public.is_test_user('TWOJ-E2E-USERNAME-ID'::uuid);  
-- Powinno zwrócić: true

SELECT public.is_test_user('00000000-0000-0000-0000-000000000000'::uuid);
-- Powinno zwrócić: false
```

## 🧪 Test działania

```bash
# 1. Uruchom test connection
npm run test:e2e:connection

# Powinno pokazać:
# ✓ Found N groups total
# ✓ Found M groups by test users

# 2. Uruchom test weryfikacyjny
npx playwright test teardown-verification.spec.ts

# Powinno pokazać:
# ✓ Test group created
# 🧹 Starting database cleanup...
#    Found 4 groups to clean  ← TERAZ POWINNO ZNALEŹĆ!
# ✅ Database cleanup completed successfully

# 3. Uruchom ręczne czyszczenie
npm run test:e2e:cleanup

# Powinno pokazać ile grup zostało usuniętych
```

## 🔄 Zmiana między wersjami

### Przełącz z PROSTEJ na BEZPIECZNĄ:

```sql
-- 1. Usuń proste polityki
DROP POLICY IF EXISTS groups_select_anon ON public.groups;
DROP POLICY IF EXISTS groups_delete_anon ON public.groups;
DROP POLICY IF EXISTS group_memberships_select_anon ON public.group_memberships;
DROP POLICY IF EXISTS group_memberships_delete_anon ON public.group_memberships;
DROP POLICY IF EXISTS activities_select_anon ON public.activities;
DROP POLICY IF EXISTS activities_delete_anon ON public.activities;
DROP POLICY IF EXISTS camp_days_select_anon ON public.camp_days;
DROP POLICY IF EXISTS camp_days_delete_anon ON public.camp_days;
DROP POLICY IF EXISTS activity_schedules_select_anon ON public.activity_schedules;
DROP POLICY IF EXISTS activity_schedules_delete_anon ON public.activity_schedules;
DROP POLICY IF EXISTS group_tasks_select_anon ON public.group_tasks;
DROP POLICY IF EXISTS group_tasks_delete_anon ON public.group_tasks;
DROP POLICY IF EXISTS ai_evaluations_select_anon ON public.ai_evaluations;
DROP POLICY IF EXISTS ai_evaluations_delete_anon ON public.ai_evaluations;
DROP POLICY IF EXISTS activity_editors_select_anon ON public.activity_editors;
DROP POLICY IF EXISTS activity_editors_delete_anon ON public.activity_editors;

-- 2. Zastosuj bezpieczną migrację
-- (skopiuj zawartość 20251109000000_add_test_cleanup_policies_SECURE.sql)
```

### Przełącz z BEZPIECZNEJ na PROSTĄ:

```sql
-- 1. Usuń bezpieczne polityki
DROP POLICY IF EXISTS groups_select_anon_test ON public.groups;
DROP POLICY IF EXISTS groups_delete_anon_test ON public.groups;
-- ... (wszystkie polityki *_anon_test)

DROP FUNCTION IF EXISTS public.is_test_user;

-- 2. Zastosuj prostą migrację
-- (skopiuj zawartość 20251109000000_add_test_cleanup_policies.sql)
```

## 🛡️ Bezpieczeństwo

### ⚠️ WAŻNE OSTRZEŻENIA:

1. **NIE stosuj prostej wersji na produkcji!**
   - Anon będzie mógł usunąć wszystkie dane
   - To jest TYLKO dla dedykowanych baz testowych

2. **Chroń swój anon key!**
   - Nie commituj do repo
   - Nie udostępniaj publicznie
   - Przechowuj w `.env.test` (który jest w `.gitignore`)

3. **Regularnie aktualizuj UUID w bezpiecznej wersji**
   - Gdy tworzysz nowych użytkowników testowych
   - Gdy usuwasz starych użytkowników testowych

4. **Rozważ użycie service_role key dla teardown**
   - Bardziej bezpieczna alternatywa
   - Nie wymaga zmian w RLS
   - Wymaga innej konfiguracji (SUPABASE_SERVICE_ROLE_KEY)

## 📊 Porównanie

| Feature | Prosta | Bezpieczna |
|---------|--------|------------|
| Łatwość konfiguracji | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Bezpieczeństwo | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| Maintenance | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Dla baz testowych | ✅ | ✅ |
| Dla baz dev/staging | ⚠️ | ✅ |
| Dla baz produkcyjnych | ❌ | ⚠️ |

## 🔗 Dodatkowe zasoby

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [E2E Teardown Documentation](../../e2e/TEARDOWN.md)

