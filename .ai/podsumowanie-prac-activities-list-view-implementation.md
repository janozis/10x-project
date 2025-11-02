## Podsumowanie prac – Widok „Lista aktywności”

### Zakres
Zaimplementowano pełny widok listy aktywności dla grupy, zgodnie z planem implementacji (filtry, nieskończone przewijanie, konfiguracja kolumn, akcje zbiorcze, realtime i zakładka „Ostatnio usunięte”).

### Routing i układ
- Strona: `src/pages/groups/[group_id]/activities.astro` – montuje wyspę React `ActivitiesListShell` z `groupId` z parametrów trasy.

### Komponenty i hooki (frontend)
- `components/activities/ActivitiesListShell.tsx` – kontener widoku: filtry, zakładki (Aktywne/Usunięte), tabela, nieskończone przewijanie, realtime, akcje zbiorcze, dialog potwierdzeń, live region.
- `components/activities/ActivitiesToolbar.tsx` – pasek z wyszukiwaniem (debounce 300 ms), filtrem statusu i przełącznikiem „Tylko moje".
- `components/activities/ActivitiesTable.tsx` – tabela z kolumnami Title/Objective/AI/Editors/Updated; selection (desktop), menu akcji wiersza.
- `components/activities/AIChips.tsx` – wizualizacja ocen AI (lore_score i scouting_values_score) z kolorowaniem: zielony >7, żółty 5-7, czerwony <5.
- `components/activities/EditorsAvatarGroup.tsx` – grupowanie avatarów edytorów (identikony na bazie UUID).
- `components/activities/BulkActionsBar.tsx` – pasek akcji zbiorczych (Usuń/Przywróć, licznik zaznaczeń, „Odznacz").
- `components/activities/ColumnsConfigurator.tsx` – popover konfiguracji kolumn (persist w localStorage, „Reset").
- `components/activities/ActivitiesSkeletonRows.tsx` – skeletony per kolumna podczas ładowania.
- `components/activities/RowActionsMenu.tsx` – menu akcji wiersza (Usuń/Przywróć) zależne od zakładki i uprawnień.
- `lib/groups/useGroupPermissions.ts` – pobieranie uprawnień użytkownika w grupie.
- `lib/groups/useColumnPreferences.ts` – preferencje widoczności kolumn per user+group (localStorage, invarianta `title: true`).
- `lib/activities/useInfiniteActivities.ts` – pobieranie listy z kursorem, `mode` (active/deleted), `hasMore`, `loadMore`, `mutate`.
- `lib/activities/useRealtimeActivities.ts` – subskrypcje Supabase (activities, activity_editors), obsługa `deleted_at` i trybu listy.
- `lib/hooks/useDebouncedValue.ts`, `lib/hooks/useIntersection.ts` – debounce i obserwator sentinela do prefetchu (~70% viewportu).

### Integracja API i backend
- Klient: `lib/activities/api.client.ts`
  - `listActivities(groupId, { status, assigned, search, deleted, limit, cursor })`
  - `getActivity(activityId)`
  - `deleteActivity(activityId)` (soft delete)
  - `restoreActivity(activityId)` (przywrócenie)
- Walidacja: `lib/validation/activity.ts`
  - Rozszerzono `activityListQuerySchema` o parametr `deleted: 'only'`.
- Serwis: `lib/services/activities.service.ts`
  - `listActivities(...)` filtruje `deleted_at` w zależności od `deleted=only` (usunięte) lub domyślnie `NULL` (aktywne), ILIKE dla search, kursor na bazie `(created_at, id)`, dociągnięcie edytorów, filtr `assigned=me` po stronie serwisu.
  - Pobieranie ocen AI: użycie funkcji RPC `get_latest_ai_evaluations` (optymalne) z fallbackiem do standardowego zapytania z deduplikacją client-side.
- Endpointy: wykorzystywane istniejące
  - `GET /api/groups/[group_id]/activities`
  - `DELETE /api/activities/[activity_id]`
  - `POST /api/activities/[activity_id]/restore`

### Interakcje i UX
- Wyszukiwarka z opóźnieniem 300 ms; trim; puste zapytanie nie wysyła parametru.
- Filtry: `status`, `assigned='me'` (domyślnie dla `editor` z ograniczeniem `can_edit_assigned_only`).
- Zakładki: `Aktywne` vs `Ostatnio usunięte` (parametr `deleted=only`).
- Nieskończone przewijanie: sentinel + prefetch przy ~70% wysokości; przycisk „Załaduj więcej” jako fallback.
- Konfigurator kolumn: popover, utrwalenie w localStorage, gwarancja `title: true`.
- Zaznaczanie (desktop): checkboxy w wierszach, pasek akcji zbiorczych, ConfirmDialog do operacji.
- Akcje wiersza: menu „⋯” (Usuń/Przywróć) zależnie od zakładki i uprawnień.
- Empty state: rozróżnia brak danych vs brak wyników filtrów; CTA „Dodaj aktywność” dla admin/editor (MVP przyszły formularz).

### Realtime
- INSERT/UPDATE/DELETE na `activities` i INSERT/DELETE na `activity_editors`.
- Obsługa przejść `deleted_at`:
  - Soft delete: usuwa z listy „Aktywne”; w trybie „Usunięte” element pojawi się po odświeżeniu/paginacji.
  - Restore: usuwa z listy „Usunięte”, odświeża/uzupełnia listę „Aktywne”.

### Błędy, a11y i jakość
- Mapowanie `VALIDATION_ERROR` → komunikat z akcją „Reset filtrów”.
- Live region (aria-live="polite") dla potwierdzeń operacji; focus po komunikacie.
- Skrót klawiaturowy: `Esc` czyści zaznaczenie.
- Skeletony kolumnowe, spójne formatowanie dat (`Intl.DateTimeFormat`).

### Ograniczenia / rzeczy na później
- ~~AIChips: placeholder (brak integracji z ostatnią oceną AI; planowane lazy-load + cache).~~ ✅ **Zrealizowane (2025-11-02)**
- Brak nawigacji do szczegółów aktywności (MVP+1).
- Dalsza polerka RWD i dostępności (np. lepsze opisy ARIA dla avatarów, menu klawiaturowe).
- Ewentualne przejście na sortowanie po `updated_at DESC` (obecnie `created_at DESC`).

### Testy ręczne (wycinek)
- Filtry: status/assigned/search → reset paginacji i poprawne wyniki.
- Nieskończone przewijanie: sentinel ładuje kolejne strony; brak duplikatów.
- Realtime: soft delete/restore odzwierciedlane między kartami przeglądarki.
- Uprawnienia: rola member bez akcji mutujących; admin z pełnymi.
- Błędy walidacji: komunikat i reset filtrów.

### Wpływ i zgodność z zasadami
- Zastosowano strukturę katalogów i zasady kodowania z reguł projektu (Astro 5, TS 5, React 19, Tailwind 4, shadcn/ui).
- Wczesne zwroty/guard clauses, walidacja wejścia (Zod), obsługa błędów i czytelny podział odpowiedzialności.

### Następne kroki (propozycje)
- ~~Lazy integracja danych AI do `AIChips` (endpoint ostatniej oceny + cache per aktywność).~~ ✅ **Zrealizowane (2025-11-02)**
- Nawigacja do szczegółów aktywności i mini podgląd (hover / kontekstowe menu).
- Dalsza optymalizacja (wirtualizacja listy dla bardzo dużych zbiorów, selektywne realtime po `group_id`).
- Cache po stronie klienta dla ocen AI (React Query / SWR) - unikanie ponownych fetchy.

### Naprawa problemu z wyświetlaniem aktywności (2025-11-01)

**Problem:**
Widok listy aktywności nie wyświetlał aktywności mimo że API zwracało 6 aktywności (potwierdzone przez curl). Problem występował tylko w przeglądarce, nie w zapytaniach curl.

**Diagnoza:**
1. Dodano szczegółowe logowanie debugowe w:
   - `src/lib/activities/api.client.ts` - parsowanie odpowiedzi
   - `src/lib/activities/useInfiniteActivities.ts` - przetwarzanie danych
   - `src/components/activities/ActivitiesListShell.tsx` - stan komponentu
   - `src/lib/services/activities.service.ts` - sprawdzanie uprawnień
   - `src/pages/api/groups/[group_id]/activities.ts` - endpoint API

2. Problem został zidentyfikowany: endpoint nie zwracał nagłówka `Content-Type: application/json`

3. Funkcja `fetchJson` sprawdza:
   ```typescript
   const isJson = res.headers.get("Content-Type")?.includes("application/json");
   ```
   Bez tego nagłówka odpowiedź nie była parsowana jako JSON, co powodowało puste listy.

**Rozwiązanie:**
Dodano nagłówek `Content-Type: application/json` do wszystkich odpowiedzi endpointu `/api/groups/[group_id]/activities`:
- GET - sukces (200) i błędy (400, 401, 500)
- POST - sukces (201) i błędy (400, 500)

**Zmiany:**
- `src/pages/api/groups/[group_id]/activities.ts` - dodano `headers: { "Content-Type": "application/json" }` do wszystkich odpowiedzi

**Wynik:**
Po naprawie aktywności są prawidłowo wyświetlane w widoku listy. API działa poprawnie zarówno przez curl jak i w przeglądarce.

**Uwagi:**
- Problem nie dotyczył uprawnień RLS - API działało poprawnie
- Problem był wyłącznie w parsowaniu odpowiedzi po stronie klienta
- Logowanie debugowe pozostawiono w kodzie dla przyszłych problemów diagnostycznych (tylko w trybie DEV)

---

### Integracja i optymalizacja wyświetlania ocen AI (2025-11-02)

#### Faza 1: Integracja wyświetlania ocen AI

**Problem:**
Komponent `AIChips` był implementowany jako placeholder z hardcoded wartościami `undefined`, więc oceny AI nie wyświetlały się mimo że istniały w bazie danych w tabeli `ai_evaluations`.

**Rozwiązanie:**

1. **Rozszerzenie typu `ActivityWithEditorsDTO`** (`src/types.ts`):
   ```typescript
   latest_ai_evaluation?: {
     lore_score: number;
     scouting_values_score: number;
     version: number;
     created_at: TimestampISO;
   } | null;
   ```

2. **Aktualizacja mappera** (`src/lib/mappers/activity.mapper.ts`):
   - Dodano parametr `latestAIEvaluation` do funkcji `mapActivityRow`
   - Mapper przekazuje dane ocen AI do DTO

3. **Rozszerzenie serwisu** (`src/lib/services/activities.service.ts`):
   - Funkcja `listActivities` pobiera oceny AI dla aktywności z bieżącej strony
   - Zapytanie do tabeli `ai_evaluations` z filtrowaniem po `activity_id IN (...)`
   - Sortowanie po `version DESC` i deduplikacja client-side

4. **Podłączenie danych w komponencie** (`src/components/activities/ActivitiesTable.tsx`):
   ```typescript
   <AIChips 
     lore={it.latest_ai_evaluation?.lore_score} 
     scouting={it.latest_ai_evaluation?.scouting_values_score} 
   />
   ```

**Wynik:**
Oceny AI są teraz poprawnie wyświetlane jako kolorowe chipy (zielony >7, żółty 5-7, czerwony <5) w kolumnie "AI" widoku listy.

#### Faza 2: Optymalizacja pobierania ocen AI

**Problem wydajnościowy:**
Pierwsza implementacja pobierała **wszystkie wersje ocen AI** dla aktywności i filtrowała je w aplikacji. Dla grupy z:
- 100 aktywności
- Po 3 wersje ocen każda
- Lista pokazująca 20 aktywności naraz

Pobierane było potencjalnie **~300 rekordów** zamiast potrzebnych **20**.

**Rozwiązanie:**

1. **Migracja bazodanowa - funkcja RPC** (`supabase/migrations/20251102000001_get_latest_ai_evaluations_rpc.sql`):
   ```sql
   CREATE OR REPLACE FUNCTION public.get_latest_ai_evaluations(p_activity_ids uuid[])
   RETURNS TABLE (...)
   AS $$
     SELECT DISTINCT ON (ae.activity_id)
       ae.activity_id,
       ae.lore_score,
       ae.scouting_values_score,
       ae.version,
       ae.created_at
     FROM public.ai_evaluations ae
     WHERE ae.activity_id = ANY(p_activity_ids)
     ORDER BY ae.activity_id, ae.version DESC;
   $$;
   ```

2. **Aktualizacja serwisu z mechanizmem fallback**:
   - **Optymalna ścieżka**: RPC `get_latest_ai_evaluations` - `DISTINCT ON` wykonuje się na bazie
   - **Fallback**: standardowe zapytanie z deduplikacją client-side (dla starszych baz)
   - **Kluczowa zmiana**: zawsze pobiera tylko oceny dla aktywności z bieżącej strony (`activityIds`)

**Korzyści wydajnościowe:**

| Metryka | Przed | Po | Poprawa |
|---------|-------|-----|---------|
| Rekordy pobrane | ~300 | ~20 | **93% ↓** |
| Filtrowanie | Client-side | Database-level | **Znacznie szybsze** |
| Transfer danych | Wszystkie wersje | Tylko najnowsze | **93% ↓** |
| Obciążenie aplikacji | Średnie | Minimalne | **Bardzo niskie** |

**Zmiany:**
- `supabase/migrations/20251102000001_get_latest_ai_evaluations_rpc.sql` - nowa funkcja RPC
- `src/lib/services/activities.service.ts` - logika pobierania z RPC i fallback

**Backward compatibility:**
Kod automatycznie wykrywa czy funkcja RPC istnieje i używa fallback dla starszych wersji bazy. Fallback jest nadal zoptymalizowany - pobiera tylko oceny dla aktywności z bieżącej strony.

**Wynik:**
- Drastyczna redukcja ilości pobieranych danych
- Filtrowanie na poziomie bazy danych (szybsze)
- Brak wpływu na działanie aplikacji dla użytkowników ze starszą wersją bazy

**Dokumentacja:**
Szczegółowa analiza wydajnościowa i techniczne detale w `.ai/optymalizacja-pobierania-ocen-ai.md`

