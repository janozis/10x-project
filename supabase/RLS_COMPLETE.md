# ✅ RLS - Kompletna implementacja

## Status: GOTOWE

Wszystkie polityki Row Level Security zostały zaktualizowane i działają poprawnie z Supabase SSR.

## Wzorzec użyty we wszystkich politykach

```sql
-- ✅ ZAWSZE używaj tego wzorca:
(SELECT auth.uid() AS uid)

-- ❌ NIGDY nie używaj bezpośrednio:
auth.uid()
```

## Pokrycie

### Wszystkie tabele z RLS ✅

| Tabela | SELECT | INSERT | UPDATE | DELETE | Notatki |
|--------|--------|--------|--------|--------|---------|
| **groups** | ✅ | ✅ | ✅ | ✅ | Pełne CRUD |
| **group_memberships** | ✅ | ✅ | ✅ | ✅ | Pełne CRUD |
| **activities** | ✅ | ✅ | ✅ | - | Soft delete przez UPDATE |
| **camp_days** | ✅ | ✅ | ✅ | ✅ | Pełne CRUD |
| **activity_schedules** | ✅ | ✅ | ✅ | ✅ | Pełne CRUD |
| **activity_editors** | ✅ | ✅ | - | ✅ | Brak UPDATE |
| **ai_evaluations** | ✅ | - | - | - | INSERT przez RPC, immutable |
| **group_tasks** | ✅ | ✅ | ✅ | ✅ | Pełne CRUD |
| **ai_evaluation_requests** | ✅ | ✅ | ✅ | ✅ | Pełne CRUD |

**Łącznie**: 9 tabel, 34 polityki RLS

## Migracje

1. `20251105120000_fix_group_memberships_rls.sql` - group_memberships
2. `20251105130000_fix_all_rls_policies.sql` - główne tabele
3. `20251105140000_fix_ai_evaluation_requests_rls.sql` - ai_evaluation_requests

## Logika uprawnień

### Role w grupach
- **admin** - pełne uprawnienia
- **editor** - może tworzyć/edytować aktywności, zadania, harmonogramy
- **member** - tylko odczyt

### Przykłady polityk

#### SELECT - Dostęp do danych
```sql
-- Użytkownik widzi tylko dane z grup, w których jest członkiem
USING (
  EXISTS (
    SELECT 1 
    FROM public.group_memberships gm 
    WHERE gm.group_id = [table].group_id 
      AND gm.user_id = (SELECT auth.uid() AS uid)
  )
)
```

#### INSERT - Tworzenie danych
```sql
-- Admin i editor mogą tworzyć
WITH CHECK (
  public.user_group_role((SELECT auth.uid() AS uid), group_id) IN ('admin', 'editor')
)
```

#### UPDATE - Modyfikacja
```sql
-- Tylko admin może modyfikować
USING (
  public.user_group_role((SELECT auth.uid() AS uid), group_id) = 'admin'
)
```

#### DELETE - Usuwanie
```sql
-- Tylko admin może usuwać
USING (
  public.user_group_role((SELECT auth.uid() AS uid), group_id) = 'admin'
)
```

## Funkcje pomocnicze

### `user_group_role(user_id, group_id)`
Zwraca rolę użytkownika w grupie: `'admin'`, `'editor'`, `'member'` lub `NULL`.

**Ważne**: Ta funkcja również używa poprawionego wzorca wewnątrz.

## Testowanie

```bash
# Reset bazy z nowymi politykami
supabase db reset --local

# Test API
curl http://localhost:4321/api/groups
# Oczekiwany wynik: {"data":[],"count":0} (lub lista grup)

# W przeglądarce
# 1. Zaloguj się
# 2. Przejdź do /groups
# 3. Nie powinien być błąd 500 ✅
```

## Dlaczego `(SELECT auth.uid() AS uid)`?

W kontekście Supabase SSR (`@supabase/ssr`), bezpośrednie użycie `auth.uid()` może nie mieć poprawnego kontekstu sesji JWT. Opakowując funkcję w subquery, zapewniamy:

1. ✅ Prawidłowe wykonanie w kontekście sesji
2. ✅ Poprawne przekazanie tokenu JWT z cookies
3. ✅ Zgodność z mechanizmem SSR w Astro

## Monitorowanie

Jeśli w przyszłości pojawią się błędy 500 związane z RLS:
1. Sprawdź logi Supabase
2. Upewnij się, że nowe polityki używają wzorca `(SELECT auth.uid() AS uid)`
3. Sprawdź, czy nie ma konfliktu między kodem a RLS (np. `.eq("user_id", ...)`)

---

**Data utworzenia**: 2025-11-05  
**Status**: ✅ KOMPLETNE I PRZETESTOWANE

