# Podsumowanie naprawy błędu RLS - Błąd 500 dla zalogowanych użytkowników

## Problem

Zalogowani użytkownicy otrzymywali błąd **500** przy próbie wyświetlenia listy grup (`GET /api/groups`). 
Gdy RLS był wyłączony w bazie danych, błąd znikał - co potwierdzało, że problem leżał w politykach Row Level Security.

## Główne przyczyny

### 1. Błędne koło w polityce RLS dla `group_memberships`

Oryginalna polityka:
```sql
CREATE POLICY group_memberships_select_authenticated 
  ON public.group_memberships
  FOR SELECT TO authenticated 
  USING (
    EXISTS (
      SELECT 1 
      FROM public.group_memberships gm2 
      WHERE gm2.group_id = group_memberships.group_id 
        AND gm2.user_id = auth.uid()
    )
  );
```

**Problem**: Użytkownik mógł zobaczyć członkostwa tylko w grupach, do których już należał. Dla nowych użytkowników bez żadnych grup, zapytanie było blokowane przez RLS.

### 2. Konflikt między WHERE clause a RLS

Kod aplikacji w `listGroups()`:
```typescript
const effectiveUserId = options?.userId || DEFAULT_USER_ID;
const { data: memberships } = await supabase
  .from("group_memberships")
  .select("group_id")
  .eq("user_id", effectiveUserId);  // ❌ KONFLIKT!
```

**Problem**: 
- Kod używał `.eq("user_id", effectiveUserId)`, gdzie `effectiveUserId` mógł być fallback `DEFAULT_USER_ID`
- RLS sprawdzało `auth.uid()` (rzeczywisty zalogowany użytkownik z tokena JWT)
- Te dwie wartości się nie zgadzały → RLS blokowało zapytanie → błąd 500

## Rozwiązanie

### 1. Naprawa polityki RLS (Migracja `20251105120000_fix_group_memberships_rls.sql`)

**KLUCZOWA ZMIANA**: Użycie wzorca `(SELECT auth.uid())` zamiast bezpośrednio `auth.uid()`

```sql
CREATE POLICY group_memberships_select_authenticated 
  ON public.group_memberships
  FOR SELECT TO authenticated 
  USING (
    -- Użytkownik ZAWSZE widzi swoje własne członkostwa
    -- WAŻNE: (SELECT auth.uid()) działa niezawodnie w kontekście Supabase SSR
    ((SELECT auth.uid()) = user_id)
    OR
    -- Użytkownik widzi innych członków w swoich grupach
    EXISTS (
      SELECT 1 
      FROM public.group_memberships gm2 
      WHERE gm2.group_id = group_memberships.group_id 
        AND gm2.user_id = (SELECT auth.uid())
    )
  );
```

**Dlaczego `(SELECT auth.uid())` zamiast `auth.uid()`?**

W kontekście Supabase SSR (Server-Side Rendering), bezpośrednie użycie `auth.uid()` może nie działać poprawnie. 
Opakowując w subquery `(SELECT auth.uid())`, zapewniamy, że funkcja jest wywoływana w odpowiednim kontekście wykonania.

**Wszystkie polityki zaktualizowane**:
- ✅ SELECT - użytkownik widzi swoje członkostwa + członków swoich grup
- ✅ INSERT - użytkownik może dodać siebie do grupy
- ✅ UPDATE - tylko admin może zmieniać role
- ✅ DELETE - użytkownik może usunąć siebie, admin może usunąć innych

### 2. Usunięcie konfliktu w kodzie

**Przed**:
```typescript
const effectiveUserId = options?.userId || DEFAULT_USER_ID;
const { data: memberships } = await supabase
  .from("group_memberships")
  .select("group_id")
  .eq("user_id", effectiveUserId);  // ❌ Konflikt z RLS
```

**Po**:
```typescript
// RLS automatycznie filtruje po auth.uid()
const { data: memberships } = await supabase
  .from("group_memberships")
  .select("group_id");  // ✅ Bez dodatkowych warunków
```

## Kluczowe zasady przy pracy z RLS

1. ✅ **Pozwól RLS robić swoją robotę** - nie duplikuj warunków RLS w WHERE clause
2. ✅ **RLS używa `auth.uid()`** - token JWT z sesji użytkownika, nie zmienne z kodu
3. ❌ **Nie mieszaj** logiki RLS (auth.uid()) z parametrami aplikacji (effectiveUserId)
4. ✅ **Dodawaj własne filtry** (np. deleted_at, status) - ale nie dotyczące user_id, jeśli RLS to robi
5. ✅ **Testuj z włączonym RLS** - zawsze!

## Zmienione pliki

### Migracje RLS (kompletna naprawa)
- ✅ `supabase/migrations/20251105120000_fix_group_memberships_rls.sql` - group_memberships
- ✅ `supabase/migrations/20251105130000_fix_all_rls_policies.sql` - wszystkie główne tabele
- ✅ `supabase/migrations/20251105140000_fix_ai_evaluation_requests_rls.sql` - ai_evaluation_requests

### Kod aplikacji
- ✅ `src/lib/services/groups.service.ts` - usunięto `.eq("user_id", ...)` z listGroups
- ✅ `src/pages/api/groups.ts` - uproszczono wywołanie listGroups

### Dokumentacja
- ✅ `supabase/RLS_POLICIES.md` - zaktualizowana dokumentacja z wzorcem
- ✅ `RLS_FIX_SUMMARY.md` - kompleksowe podsumowanie
- ✅ `e2e/groups-empty-list.spec.ts` - test E2E dla nowych użytkowników

### Kompletny zakres naprawy
Wszystkie tabele z RLS zostały zaktualizowane:
- groups, group_memberships, activities, camp_days
- activity_schedules, activity_editors, ai_evaluations
- group_tasks, ai_evaluation_requests

## Weryfikacja

```bash
# Test API endpoint bez błędów
curl http://localhost:4321/api/groups
# Oczekiwany wynik: {"data":[],"count":0}  (bez błędu 500)
```

## Status

✅ **ROZWIĄZANE** - Zalogowani użytkownicy mogą teraz przeglądać listę grup bez błędów 500.

