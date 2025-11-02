# Plan implementacji widoku Lista aktywności

## 1. Przegląd
Widok listy aktywności pozwala członkom grupy HAL przeglądać, filtrować i szybko zarządzać aktywnościami. Wspiera wyszukiwanie z debouncingiem, filtry (status, przypisane do mnie), nieskończone przewijanie, konfigurowalne kolumny (persistowane per grupa), akcje zbiorcze (na desktopie), stan pusty oraz kartę „Ostatnio usunięte”. Uwzględnia real-time updates (Supabase Realtime) oraz polityki RLS (uprawnienia, ukrywanie mutacji dla archiwum).

## 2. Routing widoku
- Ścieżka: `/groups/{group_id}/activities`
- Pliki:
  - `src/pages/groups/[group_id]/activities.astro` – strona/układ (Astro)
  - `src/components/activities/ActivitiesListShell.tsx` – wyspa (React) z logiką UI

## 3. Struktura komponentów
- `ActivitiesListShell` (React island; kontener widoku)
  - `ActivitiesHeader` (tytuł, licznik, hint RLS/archiwum)
  - `ActivitiesToolbar`
    - `SearchInput` (debounce 300 ms)
    - `StatusFilter` (draft/review/ready/archived)
    - `AssignedFilter` (checkbox „Moje”)
    - `ColumnsConfigurator` (konfiguracja widoczności kolumn)
    - `BulkActionsBar` (pokazywany przy zaznaczeniu, desktop only)
  - `ActivitiesTabs` ("Aktywne", "Ostatnio usunięte")
  - `ActivitiesVirtualList`/`ActivitiesTable` (lista z wierszami)
    - `ActivityRow` (pozycja listy)
      - `AIChips` (wizualizacja ocen AI – lazy fetch lub placeholder)
      - `EditorsAvatarGroup` (avatary przypisanych edytorów)
  - `InfiniteScrollSentinel` (prefetch 70%)
  - `EmptyState`
  - `DeleteConfirmDialog` / `RestoreConfirmDialog`

## 4. Szczegóły komponentów
### ActivitiesListShell
- Opis: Główny kontener zarządzający stanem filtrów, paginacją, połączeniem realtime i renderowaniem listy/tabs.
- Główne elementy: header, toolbar, tabs, list/table, sentinel, dialogi.
- Obsługiwane interakcje: zmiana filtrów, wpisywanie w search, przewijanie (prefetch), zaznaczanie wierszy, akcje delete/restore.
- Obsługiwana walidacja:
  - `status` ∈ {draft, review, ready, archived}
  - `assigned` ∈ {me|undefined}
  - `search` długość 1..200 (po trim); puste nie wysyłać
  - limity paginacji 1..100; domyślnie 20
  - karta „Ostatnio usunięte” wymaga wsparcia API (zwrócenie soft-deleted)
- Typy: `ActivitiesListFilters`, `ActivityWithEditorsDTO`, `ApiListResponse<ActivityWithEditorsDTO>`, `ActivityListItemVM`, `ColumnVisibilityState`, `PermissionsVM`.
- Propsy: `{ groupId: UUID }`.

### ActivitiesHeader
- Opis: Tytuł widoku + badge z liczbą elementów w buforze + ostrzeżenia RLS/archiwum.
- Główne elementy: H1/H2, badge, tekst informacyjny.
- Interakcje: brak.
- Walidacja: render hint, jeśli `role==='member'` lub `group.status==='archived'` (jeśli status dostępny).
- Typy: `PermissionsVM`.
- Propsy: `{ count: number, permissions: PermissionsVM, isArchived: boolean }`.

### ActivitiesToolbar
- Opis: Pasek sterujący filtrami, wyszukiwaniem, kolumnami i akcjami zbiorczymi.
- Główne elementy: `SearchInput`, `StatusFilter`, `AssignedFilter`, `ColumnsConfigurator`, `BulkActionsBar`.
- Interakcje: onSearchChange, onStatusChange, onAssignedToggle, onColumnsChange, onBulkAction.
- Walidacja: blokada mutacji w archiwum (disable przycisków), confirm przy delete.
- Typy: `ActivitiesListFilters`, `BulkAction`.
- Propsy: `{ value: ActivitiesListFilters, onChange(v), columns, onColumnsChange, selectedCount, onBulk(action) }`.

### ActivitiesTabs
- Opis: Przełączanie „Aktywne” vs „Ostatnio usunięte”.
- Główne elementy: `Tabs` z 2 zakładkami.
- Interakcje: onTabChange → zmiana trybu zapytania.
- Walidacja: zakładka „Usunięte” wymaga parametru API (np. `deleted=only`).
- Typy: `{ mode: 'active'|'deleted' }`.
- Propsy: `{ mode, onModeChange }`.

### ActivitiesVirtualList / ActivitiesTable
- Opis: Lista elementów z wierszami, wspiera selection (desktop), infinite scroll, layout responsywny.
- Główne elementy: wiersze z kolumnami Title, Objective (1–2 linie), AIChips, Editors, UpdatedAt, Checkbox (bulk desktop).
- Interakcje: select/unselect, click row (nawigacja do szczegółów w MVP+1), hover actions (opcjonalnie).
- Walidacja: brak dodatkowej – deleguje do nadrzędnych.
- Typy: `ActivityListItemVM`, `ColumnVisibilityState`.
- Propsy: `{ items: ActivityListItemVM[], visibleColumns, selectedIds, onToggleSelect(id) }`.

### ActivityRow
- Opis: Pojedyncza pozycja listy; zwraca uwagę na 2-liniowy `objective` (truncate) i avatar group.
- Główne elementy: tytuł, objective snippet, `AIChips`, `EditorsAvatarGroup`, `UpdatedAt`, checkbox (desktop).
- Interakcje: zaznaczenie (desktop), menu kontekstowe (opcjonalnie później).
- Walidacja: ukrycie przycisków mutacji, jeśli `isArchived` lub brak uprawnień.
- Typy: `ActivityListItemVM`.
- Propsy: `{ item, visibleColumns, selected, onToggle }`.

### AIChips
- Opis: Wizualizacja ostatnich ocen AI (lore, harcerstwo) z kolorami progowymi; jeśli brak – neutralny chip „Brak oceny”.
- Główne elementy: 1–2 chipy (np. LORE, SCOUTING) z kolorem.
- Interakcje: tooltip z wartościami/feedbackiem (MVP+1).
- Walidacja: brak (tylko prezentacja).
- Typy: `AIChipVM`.
- Propsy: `{ value?: { lore: number, scouting: number } }`.

### EditorsAvatarGroup
- Opis: Skupisko avatarów użytkowników przypisanych jako edytorzy.
- Główne elementy: avatar z inicjałami lub identicon z `user_id`.
- Interakcje: hover (tooltip UID/imię w MVP+1).
- Walidacja: brak.
- Typy: `{ userIds: UUID[] }`.
- Propsy: `{ userIds: UUID[] }`.

### ColumnsConfigurator
- Opis: Popover z checkboxami kolumn; preferencje persistowane per user+group w `localStorage`.
- Główne elementy: lista kolumn (Title, Objective, AI, Editors, UpdatedAt).
- Interakcje: toggle kolumny, reset do domyślnych.
- Walidacja: zawsze co najmniej Title widoczny.
- Typy: `ColumnId`, `ColumnVisibilityState`.
- Propsy: `{ state, onChange }`.

### BulkActionsBar
- The: Pojawia się dla ≥1 zaznaczonych; akcje: Delete (aktywni), Restore (usunięte); desktop only.
- Główne elementy: przyciski akcji, licznik zaznaczonych.
- Interakcje: onDeleteConfirm, onRestoreConfirm (z dialogiem), unselect all.
- Walidacja: Delete/Restore tylko dla `role==='admin'` i niearchiwalnych (delete) / w zakładce „Usunięte” (restore).
- Typy: `BulkAction`.
- Propsy: `{ selectedIds: UUID[], mode: 'active'|'deleted', permissions }`.

### EmptyState
- Opis: Prezentacja braku wyników lub braku danych w grupie; CTA: „Dodaj aktywność” (jeśli uprawnienia pozwalają).
- Główne elementy: ikona, tytuł, opis, przycisk CTA.
- Interakcje: CTA → nawigacja do formularza nowej aktywności (MVP+1) lub modal informacyjny.
- Walidacja: ukryj CTA, jeśli `role==='member'`.
- Typy: brak specjalnych.
- Propsy: `{ canCreate: boolean, reason?: 'filters'|'empty' }`.

## 5. Typy
- DTO z backendu:
  - `ActivityWithEditorsDTO` (z `src/types.ts`) – dane wiersza.
  - `GroupPermissionsDTO` – uprawnienia użytkownika w grupie.
  - `ApiListResponse<ActivityWithEditorsDTO>` – odpowiedź listy.
- ViewModel (nowe, frontend):
  - `type ColumnId = 'title'|'objective'|'ai'|'editors'|'updated_at'`.
  - `interface ColumnVisibilityState { [K in ColumnId]: boolean }` – co najmniej `title: true` zawsze.
  - `interface AIChipVM { lore?: number; scouting?: number; colorLore?: string; colorScouting?: string }` – kolory wg progów: <5 czerwony, 5–7 pomarańczowy, >7 zielony.
  - `interface ActivityListItemVM { id: UUID; title: string; objectiveSnippet: string; editors: UUID[]; updatedAt: TimestampISO; status: ActivityStatus; ai?: AIChipVM }`.
  - `interface ActivitiesListFilters { status?: ActivityStatus; assigned?: 'me'; search?: string }`.
  - `interface PaginationState { limit: number; cursor?: string; isFetching: boolean; hasMore: boolean }`.
  - `interface PermissionsVM { role: GroupRole; canEditAll: boolean; canEditAssignedOnly: boolean }`.

## 6. Zarządzanie stanem
- Lokalny stan w `ActivitiesListShell`:
  - `filters: ActivitiesListFilters` (domyślnie: jeśli `role==='editor'` → `assigned='me'`)
  - `mode: 'active'|'deleted'`
  - `items: ActivityListItemVM[]` (akumulacja stron)
  - `pagination: PaginationState` (limit=20, cursor, hasMore)
  - `selectedIds: Set<UUID>` (desktop)
  - `visibleColumns: ColumnVisibilityState` (persist per group+user w localStorage: `lp:cols:{groupId}:{userId}`)
  - `permissions: PermissionsVM`
- Hooki niestandardowe:
  - `useDebouncedValue(value, 300)` dla search.
  - `useInfiniteActivities({ groupId, filters, mode, limit })` – zarządza fetch, stronami, kursorem, prefetch przy 70% scroll.
  - `useGroupPermissions(groupId)` – GET `/api/groups/{group_id}/permissions`.
  - `useRealtimeActivities(groupId, onUpsert, onDelete)` – subskrypcja `activities` i `activity_editors` (w trybie `mode==='active'`).
  - `useColumnPreferences(groupId, userId)` – odczyt/zapis do localStorage.
  - `useBulkSelection(isDesktop)` – pomocnicze dla zaznaczania.

## 7. Integracja API
- Lista aktywnych:
  - `GET /api/groups/{group_id}/activities?status&assigned=me&search&limit&cursor`
  - Zapytanie: `status?: 'draft'|'review'|'ready'|'archived'`, `assigned?: 'me'`, `search?: string`, `limit?: 1..100` (string), `cursor?: string`.
  - Odpowiedź: `ApiListResponse<ActivityWithEditorsDTO>` z `nextCursor?: string`.
  - Sortowanie: spec mówi `updated_at DESC`; obecnie backend sortuje `created_at DESC` – wymaga weryfikacji/uzgodnienia.
- Soft delete:
  - `DELETE /api/activities/{activity_id}` → 200 z `{ data: { id, deleted_at } }` (tylko admin).
  - Confirm UI + komunikat o RLS.
- Restore:
  - `POST /api/activities/{activity_id}/restore` → 200 z `ActivityWithEditorsDTO` (tylko admin).
- Uprawnienia:
  - `GET /api/groups/{group_id}/permissions` → `GroupPermissionsDTO` (role, can_edit_all, can_edit_assigned_only).
- „Ostatnio usunięte”:
  - Wymagane rozszerzenie API listy (np. `deleted=only` lub `include_deleted=1`). Do czasu implementacji: opcjonalnie ukryć kartę lub wyświetlić informacyjny placeholder.
- AI chips:
  - Wersja 1: placeholder „Brak oceny”.
  - Wersja 2 (po rozszerzeniu API): `GET /api/activities/{id}` + dedykowany endpoint listujący najnowszą ocenę (`GET /api/activities/{id}/ai-evaluations?limit=1`) – lazy fetch na widoczność wiersza, cache per `activity_id`.

## 8. Interakcje użytkownika
- Wpisanie frazy w search → po 300 ms od bezczynności odśwież listę od 1. strony.
- Zmiana `status`/`assigned` → reset paginacji, fetch od początku.
- Przewinięcie do 70% wysokości listy → prefetch następnej strony (`limit=20`).
- Zaznaczenie wierszy (desktop) → pokaż `BulkActionsBar`.
- Klik „Usuń” → confirm dialog → `DELETE` → usuń z listy; realtime zadziała u pozostałych.
- Przełączenie na „Ostatnio usunięte” → fetch z parametrem `deleted=only` (gdy dostępny) → przywracanie przez `POST .../restore`.
- Zmiana kolumn → zapisz preferencje do localStorage.
- Domyślnie „Moje” włączone dla edytora (jeśli nie admin i ma `can_edit_assigned_only`).

## 9. Warunki i walidacja
- Filtry:
  - `status` – tylko wartości dozwolone przez enum; ustaw `undefined` dla „Wszystkie”.
  - `assigned` – checkbox → wysyłaj tylko literal „me” (zgodnie z backendem).
  - `search` – trim; nie wysyłaj pustego.
- Paginacja: `limit` 20; nie przekraczaj 100; zarządzaj `nextCursor`.
- Uprawnienia/RLS:
  - `member` – brak mutacji; ukryj akcje Delete/Restore; pokaż hint o braku uprawnień.
  - `editor` – brak Delete/Restore; filtr domyślny „Moje”.
  - `admin` – pełne akcje; Delete/Restore aktywne.
- Archiwum: jeśli grupa w statusie `archived` (MVP+1: wymaga źródła statusu grupy) → wszystkie mutacje ukryte/disabled.

## 10. Obsługa błędów
- 400 VALIDATION_ERROR: pokaż błąd przy filtrach (np. zbyt długi search) i zresetuj do ostatniego poprawnego.
- 401 UNAUTHORIZED: CTA do logowania.
- 403 FORBIDDEN_ROLE: banner z informacją o braku uprawnień do akcji.
- 404 ACTIVITY_NOT_FOUND/NOT_FOUND: po mutacjach – odśwież listę; w „Usunięte” – komunikat.
- 429 RATE_LIMIT_EXCEEDED (jeśli wystąpi): wyświetl toast i wstrzymaj kolejne żądania na krótko.
- 500 INTERNAL_ERROR: ogólny toast + przycisk ponów.
- Realtime: w razie desynchronizacji (błędy kanału) – automatyczne odświeżenie widoku po reconnect.

## 11. Kroki implementacji
1. Routing: utwórz `src/pages/groups/[group_id]/activities.astro` z layoutem i mountem wyspy `ActivitiesListShell` (props: `groupId`).
2. Uprawnienia: zaimplementuj `useGroupPermissions(groupId)` (GET `/permissions`), użyj do domyślnego ustawienia `assigned='me'` i ukrywania mutacji.
3. Preferencje kolumn: `useColumnPreferences(groupId, userId)` – localStorage z kluczem `lp:cols:{groupId}:{userId}`; domyślnie: wszystkie kolumny widoczne poza możliwością ukrycia `objective` i `ai` na mobile.
4. Toolbar: `SearchInput` z `useDebouncedValue(300)`, `StatusFilter`, `AssignedFilter`, `ColumnsConfigurator`.
5. Lista: `ActivitiesVirtualList`/`ActivitiesTable` + `ActivityRow`; render 20 na stronę; objective truncate do 2 linii (Tailwind line-clamp-2).
6. Paginacja: `useInfiniteActivities` – obsłuż `limit`, `cursor`, `hasMore`, prefetch przy 70%; zresetuj akumulację przy zmianie filtrów.
7. Realtime: `useRealtimeActivities` – subskrypcje na `activities` (insert/update/delete) i `activity_editors` (insert/delete) z filtrem `group_id` → aktualizuj/wycinaj wiersze w stanie.
8. Bulk actions (desktop): stan `selectedIds`, `BulkActionsBar` z confirm dialogami; wywołaj `DELETE`/`POST restore`; po sukcesie zmodyfikuj stan; reszta klientów zobaczy zmiany dzięki realtime.
9. Pusty stan: komponent `EmptyState` – rozróżnij „brak danych w grupie” vs „brak wyników filtrów”; CTA „Dodaj aktywność” tylko dla admin/editor (MVP+1: link do formularza).
10. Karta „Ostatnio usunięte”: tymczasowo pokaż placeholder informujący o wymaganym rozszerzeniu API; po dodaniu parametru `deleted=only` – zaimplementuj drugą ścieżkę fetchu i akcje restore.
11. AI chips: Wersja 1 – placeholder neutralny; Wersja 2 – lazy fetch najnowszej oceny (po dodaniu endpointu listującego oceny per aktywność), z cache i IntersectionObserver.
12. A11y/UX: role/aria dla listy i przycisków, focus states, klawiatura dla konfiguratora kolumn i confirm dialogów.
13. Testy ręczne: filtry, debounce, infinite scroll, realtime (druga karta przeglądarki), uprawnienia (różne role), delete/restore z confirm.
