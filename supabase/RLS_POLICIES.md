# Polityki Row Level Security (RLS) - Podsumowanie

Dokument opisuje wszystkie polityki RLS w projekcie. Główna zasada: **użytkownik widzi wszystko, co jest przypisane do grup, w których jest członkiem**.

## ⚠️ WAŻNE: Wzorzec `(SELECT auth.uid())` w Supabase SSR

**Dla wszystkich polityk RLS używaj `(SELECT auth.uid())` zamiast bezpośrednio `auth.uid()`!**

```sql
-- ❌ Może NIE działać poprawnie w Supabase SSR:
USING (user_id = auth.uid())

-- ✅ Działa NIEZAWODNIE:
USING (user_id = (SELECT auth.uid()))
```

**Dlaczego?** W kontekście Server-Side Rendering z `@supabase/ssr`, bezpośrednie wywołanie `auth.uid()` może nie mieć poprawnego kontekstu sesji. Opakowując w subquery, zapewniamy prawidłowe wykonanie funkcji.

---

## Role użytkowników w grupach

Każdy użytkownik w grupie ma jedną z ról:
- **admin** - pełne uprawnienia do zarządzania grupą
- **editor** - może tworzyć i edytować aktywności (przypisane lub wszystkie, zależnie od konfiguracji)
- **member** - może tylko przeglądać zawartość grupy

## Tabele i ich polityki RLS

### 1. `groups` (Grupy/Obozy)

| Operacja | Uprawnienia |
|----------|-------------|
| **SELECT** | Członkowie grupy mogą przeglądać grupę |
| **INSERT** | Każdy zalogowany użytkownik może stworzyć grupę |
| **UPDATE** | Tylko admini grupy |
| **DELETE** | Tylko admini grupy |

**Zasada**: Użytkownik widzi tylko grupy, w których jest członkiem.

---

### 2. `group_memberships` (Członkostwo w grupach)

| Operacja | Uprawnienia |
|----------|-------------|
| **SELECT** | Użytkownik widzi swoje własne członkostwa + członków grup, do których należy |
| **INSERT** | Użytkownik może dodać siebie do grupy (np. przez kod zaproszenia) |
| **UPDATE** | Tylko admini grupy mogą zmieniać role |
| **DELETE** | Użytkownik może usunąć siebie LUB admin może usunąć innych |

**Zasada**: Użytkownik zawsze widzi swoje własne członkostwa oraz członków wszystkich swoich grup.

---

### 3. `activities` (Aktywności)

| Operacja | Uprawnienia |
|----------|-------------|
| **SELECT** | Członkowie grupy widzą wszystkie aktywności w grupie |
| **INSERT** | Admini i edytorzy mogą tworzyć aktywności |
| **UPDATE** | Admin grupy LUB przypisany edytor aktywności |
| **DELETE** | Brak polityki (soft delete przez UPDATE) |

**Zasada**: Użytkownik widzi wszystkie aktywności w swoich grupach. Edytować może tylko admin lub przypisany edytor.

---

### 4. `camp_days` (Dni obozu)

| Operacja | Uprawnienia |
|----------|-------------|
| **SELECT** | Członkowie grupy |
| **INSERT** | Tylko admini grupy |
| **UPDATE** | Tylko admini grupy |
| **DELETE** | Tylko admini grupy |

**Zasada**: Wszyscy w grupie widzą dni obozu, ale tylko admini mogą nimi zarządzać.

---

### 5. `activity_schedules` (Harmonogram aktywności)

| Operacja | Uprawnienia |
|----------|-------------|
| **SELECT** | Członkowie grupy (przez `camp_days`) |
| **INSERT** | Admini i edytorzy grupy |
| **UPDATE** | Admini i edytorzy grupy |
| **DELETE** | Admini i edytorzy grupy |

**Zasada**: Użytkownik widzi harmonogramy w swoich grupach. Admini i edytorzy mogą je modyfikować.

---

### 6. `activity_editors` (Przypisani edytorzy aktywności)

| Operacja | Uprawnienia |
|----------|-------------|
| **SELECT** | Członkowie grupy (przez `activities`) |
| **INSERT** | Tylko admini grupy |
| **UPDATE** | Brak polityki |
| **DELETE** | Tylko admini grupy |

**Zasada**: Wszyscy w grupie widzą, kto jest edytorem aktywności. Tylko admini mogą przypisywać edytorów.

---

### 7. `ai_evaluations` (Ewaluacje AI)

| Operacja | Uprawnienia |
|----------|-------------|
| **SELECT** | Członkowie grupy (przez `activities`) |
| **INSERT** | Admin grupy LUB przypisany edytor aktywności |
| **UPDATE** | Brak polityki (ewaluacje są immutable) |
| **DELETE** | Brak polityki |

**Zasada**: Użytkownik widzi ewaluacje wszystkich aktywności w swoich grupach. Tworzyć może tylko uprawniony użytkownik.

---

### 8. `group_tasks` (Zadania grupowe)

| Operacja | Uprawnienia |
|----------|-------------|
| **SELECT** | Członkowie grupy |
| **INSERT** | Admini i edytorzy grupy |
| **UPDATE** | Admini i edytorzy grupy |
| **DELETE** | Admini i edytorzy grupy |

**Zasada**: Wszyscy w grupie widzą zadania. Admini i edytorzy mogą nimi zarządzać.

---

### 9. `ai_evaluation_requests` (Żądania ewaluacji AI)

| Operacja | Uprawnienia |
|----------|-------------|
| **SELECT** | Członkowie grupy (przez `activities`) |
| **INSERT** | Admin grupy LUB przypisany edytor aktywności |
| **UPDATE** | Tylko admini grupy (zwykle obsługiwane przez backend) |
| **DELETE** | Tylko admini grupy |

**Zasada**: Użytkownik widzi requesty dla aktywności w swoich grupach. Tworzyć może tylko uprawniony użytkownik.

---

## Funkcje pomocnicze

### `user_group_role(p_user uuid, p_group uuid)`

Zwraca rolę użytkownika w danej grupie (`'admin'`, `'editor'`, `'member'` lub `NULL`).

**Użycie**: Wykorzystywana w politykach RLS do sprawdzania uprawnień.

---

## Widoki (Views)

### `user_group_permissions`

Płaski widok uprawnień użytkowników z dodatkowymi flagami.

**Brak dedykowanej polityki RLS** - widok bazuje na `group_memberships`, które już mają RLS.

---

### `group_dashboard_stats`

Zagregowane statystyki grup (liczba aktywności, ewaluacji, zadań itp.).

**RLS**: Ustawione z `security_invoker = true`, co oznacza, że stosuje polityki RLS tabel bazowych.

**Zasada**: Użytkownik widzi tylko statystyki dla swoich grup.

---

## Funkcje RPC z SECURITY DEFINER

### `request_ai_evaluation(p_activity uuid, p_user uuid)`

Tworzy żądanie ewaluacji AI z walidacją cooldown.

**Bezpieczeństwo**: Wymaga uprawnień do aktywności (sprawdzane przez RLS na `ai_evaluation_requests`).

---

### `insert_ai_evaluation_from_worker(...)`

Wstawia ewaluację AI z poziomu workera (omija cooldown).

**Bezpieczeństwo**: `SECURITY DEFINER` - działa z uprawnieniami właściciela funkcji, ale jest przeznaczona tylko dla service role.

---

### `get_latest_ai_evaluations(p_activity_ids uuid[])`

Zwraca najnowsze ewaluacje dla podanych aktywności.

**Bezpieczeństwo**: `SECURITY DEFINER`, ale zwraca tylko dane dostępne przez RLS na `ai_evaluations`.

---

### `get_group_members_with_emails(p_group_id uuid)`

Zwraca członków grupy z adresami email (dostęp do `auth.users`).

**Bezpieczeństwo**: `SECURITY DEFINER` umożliwia odczyt emaili, ale dostęp ograniczony przez RLS na `group_memberships`.

---

## Triggery i walidacje

### `enforce_ai_evaluation_version()`

- Automatycznie inkrementuje wersję ewaluacji
- Sprawdza cooldown (5 minut)
- Może być pominięty przez workera (przez session variable)

### `ensure_group_has_admin()`

Zapewnia, że grupa zawsze ma co najmniej jednego admina.

### `validate_camp_day_date()`

Sprawdza, czy data dnia obozu mieści się w zakresie dat grupy.

---

## Podsumowanie zasad bezpieczeństwa

1. ✅ **Izolacja grup**: Użytkownik widzi tylko dane z grup, w których jest członkiem
2. ✅ **Hierarchia uprawnień**: Admin > Editor > Member
3. ✅ **Soft delete**: Aktywności używają `deleted_at` zamiast fizycznego usuwania
4. ✅ **Immutability**: Ewaluacje AI są niemutowalne (brak UPDATE/DELETE)
5. ✅ **Rate limiting**: Cooldown 5 minut na żądania ewaluacji
6. ✅ **Walidacje**: Triggery zapewniają spójność danych

---

## Testowanie polityk RLS

Aby przetestować polityki RLS:

```sql
-- Ustaw kontekst użytkownika
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "user-uuid-here"}';

-- Wykonaj zapytania testowe
SELECT * FROM groups;
SELECT * FROM activities;
-- itd.
```

Lub użyj Supabase JS Client, który automatycznie stosuje RLS na podstawie zalogowanego użytkownika.

---

**Data utworzenia**: 2025-11-05  
**Ostatnia aktualizacja**: 2025-11-05 (migracje 20251105120000, 20251105130000, 20251105140000)  
**Status**: Aktualne - wszystkie polityki RLS używają wzorca `(SELECT auth.uid() AS uid)`

## Historia zmian

### 2025-11-05 - Kompleksowa naprawa WSZYSTKICH polityk RLS
**Migracje**:
- `20251105120000_fix_group_memberships_rls.sql` - group_memberships (SELECT, INSERT, UPDATE, DELETE)
- `20251105130000_fix_all_rls_policies.sql` - wszystkie pozostałe tabele główne
- `20251105140000_fix_ai_evaluation_requests_rls.sql` - ai_evaluation_requests

**Zakres**: Wszystkie polityki RLS dla wszystkich tabel zostały zaktualizowane do wzorca `(SELECT auth.uid() AS uid)`

**Tabele objęte naprawą**:
- ✅ groups (4 polityki: SELECT, INSERT, UPDATE, DELETE)
- ✅ group_memberships (4 polityki: SELECT, INSERT, UPDATE, DELETE)
- ✅ activities (3 polityki: SELECT, INSERT, UPDATE)
- ✅ camp_days (4 polityki: SELECT, INSERT, UPDATE, DELETE)
- ✅ activity_schedules (4 polityki: SELECT, INSERT, UPDATE, DELETE)
- ✅ activity_editors (3 polityki: SELECT, INSERT, DELETE)
- ✅ ai_evaluations (1 polityka: SELECT - INSERT przez RPC)
- ✅ group_tasks (4 polityki: SELECT, INSERT, UPDATE, DELETE)
- ✅ ai_evaluation_requests (4 polityki: SELECT, INSERT, UPDATE, DELETE)

### 2025-11-05 - Oryginalny problem: Naprawa polityk RLS dla `group_memberships`
**Migracja**: `20251105120000_fix_group_memberships_rls.sql` (pierwsza wersja)

**Problem 1 - Błędne koło w polityce RLS**: 
Poprzednia polityka SELECT dla `group_memberships` wymagała, aby użytkownik był już członkiem grupy, aby zobaczyć swoje członkostwa. To tworzyło błędne koło dla nowych użytkowników.

**Problem 2 - Konflikt między WHERE clause a RLS**:
Kod aplikacji używał `.eq("user_id", effectiveUserId)` w zapytaniu, co kolidowało z `auth.uid()` sprawdzanym przez RLS.

**Problem 3 - Kontekst `auth.uid()` w RLS** (KLUCZOWY!):
Bezpośrednie użycie `auth.uid()` w polityce RLS czasami nie działa poprawnie w kontekście Supabase SSR:
```sql
-- ❌ Może nie działać poprawnie:
user_id = auth.uid()

-- ✅ Działa niezawodnie:
user_id = (SELECT auth.uid())
```

**Rozwiązanie**:
1. **Wzorzec subquery dla `auth.uid()`**: Wszystkie polityki używają `(SELECT auth.uid())` zamiast bezpośrednio `auth.uid()`
2. **Naprawiona polityka SELECT**: Użytkownik może zawsze zobaczyć swoje członkostwa + członków swoich grup
3. **Wszystkie operacje**: INSERT, UPDATE, DELETE również zaktualizowane do wzorca subquery
4. **Kod aplikacji**: Usunięto `.eq("user_id", ...)` - RLS robi całą robotę

**Przykład naprawionej polityki**:
```sql
CREATE POLICY group_memberships_select_authenticated 
  ON public.group_memberships
  FOR SELECT TO authenticated 
  USING (
    -- Użytkownik widzi swoje członkostwa
    ((SELECT auth.uid()) = user_id)
    OR
    -- Użytkownik widzi członków swoich grup
    EXISTS (
      SELECT 1 FROM public.group_memberships gm2 
      WHERE gm2.group_id = group_memberships.group_id 
        AND gm2.user_id = (SELECT auth.uid())
    )
  );
```

**Kluczowe zasady przy pracy z RLS**:
- ✅ **Używaj `(SELECT auth.uid())` zamiast `auth.uid()`** w politykach RLS dla Supabase SSR
- ✅ Pozwól RLS automatycznie filtrować wyniki - nie duplikuj logiki w WHERE clause
- ❌ Nie dodawaj `.eq("user_id", someVariable)` jeśli RLS już to robi
- ✅ Wszystkie polityki (SELECT, INSERT, UPDATE, DELETE) powinny używać tego samego wzorca


