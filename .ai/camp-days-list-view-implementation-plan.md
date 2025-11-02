# Plan implementacji widoku Camp Days – lista dni (zarządzanie)

## 1. Przegląd
Widok służy do przeglądu i zarządzania dniami obozu w ramach danej grupy HAL. Umożliwia listowanie dni wraz z kluczowymi metrykami (numer dnia, data, motyw dnia, liczba slotów, łączny czas zajęć), filtrowanie (np. dni bez zajęć), przejście do widoku szczegółowego dnia oraz wykonywanie akcji administracyjnych (dodaj/edytuj/usuń), z zachowaniem ograniczeń ról i dobrych praktyk UX/A11y.

## 2. Routing widoku
- Ścieżka: `/groups/{id}/camp-days`
- Plik strony: `src/pages/groups/[id]/camp-days.astro`
- Linki do podwidoków:
  - Dodawanie: `/groups/{id}/camp-days/new`
  - Edycja: `/groups/{id}/camp-days/{camp_day_id}/edit`
  - Szczegóły dnia: `/groups/{id}/camp-days/{camp_day_id}` (opcjonalnie, jeśli istnieje dedykowany widok dnia)

## 3. Struktura komponentów
- `CampDaysPage` (strona Astro + osadzone komponenty React)
  - `CampDaysHeader` (nagłówek z tytułem i CTA „Dodaj dzień” – warunkowo)
  - `CampDaysFilters` (kontrolki filtrowania)
  - `CampDaysList` (lista kart/tabela)
    - `CampDayCard` lub `CampDayRow` (pojedynczy dzień)
      - `CampDayMetrics` (liczba slotów, łączny czas)
      - `CampDayActions` (Edytuj, Usuń, Otwórz dzień – warunkowo)
  - `CampDaysEmptyState` (pusty stan)
  - `CampDaysSkeleton` (skeletony ładowania)
  - `DeleteConfirmDialog` (potwierdzenie przed usunięciem)

## 4. Szczegóły komponentów
### CampDaysPage
- Opis: Kontener strony. Odpowiada za pobranie danych (dni obozu, uprawnienia), przekazanie ich do komponentów i obsługę akcji globalnych (usuwanie, nawigacja, odświeżanie).
- Główne elementy: wrapper layoutu, `CampDaysHeader`, `CampDaysFilters`, `CampDaysList`, `CampDaysEmptyState`, `CampDaysSkeleton`.
- Obsługiwane interakcje:
  - Inicjalne pobranie: `GET /api/groups/{group_id}/camp-days`, `GET /api/groups/{group_id}/permissions`.
  - Usunięcie dnia: `DELETE /api/camp_days/{camp_day_id}` (po potwierdzeniu).
  - Zmiana filtrów (propagacja do listy).
- Obsługiwana walidacja:
  - Maskowanie 404 dla braku członkostwa (pokazanie Not Found/redirect).
  - Ukrycie akcji admin-only na podstawie `GroupPermissionsDTO`.
- Typy: `CampDayDTO`, `GroupPermissionsDTO` (z `src/types.ts`).
- Propsy: brak (strona źródłowa), parametry `group_id` z routingu.

### CampDaysHeader
- Opis: Nagłówek sekcji z tytułem, opcjonalnym opisem i przyciskiem „Dodaj dzień”.
- Główne elementy: tytuł H1/H2, przycisk `Button` z `components/ui/button`.
- Obsługiwane interakcje: klik „Dodaj dzień” → nawigacja do `/groups/{id}/camp-days/new`.
- Obsługiwana walidacja: widoczność CTA tylko dla admina (US-004: akcje tworzenia/edycji/usuwania tylko admin).
- Typy: `GroupPermissionsDTO`.
- Propsy: `{ groupId: UUID; canManageDays: boolean; }`.

### CampDaysFilters
- Opis: Pasek filtrowania listy. Minimum: przełącznik „bez zajęć” (pokaż tylko dni, które nie mają przypisanych slotów).
- Główne elementy: `Checkbox`/`Switch`, opcjonalnie `Select` sortowania, `Input` wyszukiwania tematu.
- Obsługiwane interakcje: zmiana filtru → aktualizacja stanu widoku i przefiltrowanie listy po stronie klienta.
- Obsługiwana walidacja: brak danych wejściowych do API; weryfikacja lokalna typów boolean/string.
- Typy: `CampDaysFilterState` (ViewModel, nowy typ – poniżej).
- Propsy: `{ filters: CampDaysFilterState; onChange: (next: CampDaysFilterState) => void; }`.

### CampDaysList
- Opis: Lista dni – render jako karty lub tabela. Dopasowuje się do skeletonów, pustego stanu i filtrów.
- Główne elementy: grid kart lub tabela; stan empty; skeleton.
- Obsługiwane interakcje: klik w kartę/wiersz → „Otwórz dzień”; akcje z `CampDayActions`.
- Obsługiwana walidacja: brak własnej – bazuje na danych wejściowych.
- Typy: `CampDayListItemVM[]` (ViewModel), `UserActionPermissionsVM`.
- Propsy: `{ items: CampDayListItemVM[]; isLoading: boolean; canManageDays: boolean; onOpen: (id: UUID) => void; onEdit: (id: UUID) => void; onDelete: (id: UUID) => void; }`.

### CampDayCard / CampDayRow
- Opis: Prezentacja pojedynczego dnia z kluczowymi polami i metrykami.
- Główne elementy: tytuł (np. „Dzień 3”), data, motyw (theme), `CampDayMetrics`, `CampDayActions`.
- Obsługiwane interakcje: klik w tytuł/„Otwórz” → przejście do szczegółów dnia.
- Obsługiwana walidacja: zabezpieczenie przed brakiem danych (null-safe render), format daty.
- Typy: `CampDayListItemVM`.
- Propsy: `{ item: CampDayListItemVM; canManageDays: boolean; onOpen: () => void; onEdit: () => void; onDelete: () => void; }`.

### CampDayMetrics
- Opis: Wyświetla liczbę slotów i łączny czas zajęć w danym dniu.
- Główne elementy: `Badge`/`Pill` z liczbą slotów, ikona zegara + tekst z sumą minut.
- Obsługiwane interakcje: brak.
- Obsługiwana walidacja: wartości liczbowe ≥ 0; fallback na 0 przy braku danych.
- Typy: `{ slotsCount: number; totalMinutes: number; }`.
- Propsy: `{ slotsCount: number; totalMinutes: number; }`.

### CampDayActions
- Opis: Zestaw działań wiersza/karty: „Otwórz dzień”, „Edytuj”, „Usuń”. Akcje edycja/usuwanie widoczne tylko dla admina.
- Główne elementy: `Button`/`Dropdown`/`RowActionsMenu`.
- Obsługiwane interakcje: click → wywołanie handlerów z rodzica; „Usuń” → otwarcie `DeleteConfirmDialog`.
- Obsługiwana walidacja: ukrycie przycisków wg uprawnień; zablokowanie w trakcie requestu (disabled loading state).
- Typy: `UserActionPermissionsVM`.
- Propsy: `{ canManageDays: boolean; onOpen: () => void; onEdit: () => void; onDelete: () => void; isDeleting?: boolean; }`.

### CampDaysEmptyState
- Opis: Widoczny, gdy lista dni jest pusta po załadowaniu. Komunikuje brak danych i (opcjonalnie) CTA „Dodaj dzień” dla admina.
- Główne elementy: ilustracja/ikona, tytuł, opis, CTA.
- Obsługiwane interakcje: klik CTA → nawigacja do „New”.
- Obsługiwana walidacja: ukrycie CTA dla nie-adminów.
- Typy: `GroupPermissionsDTO`/`UserActionPermissionsVM`.
- Propsy: `{ canManageDays: boolean; onCreate: () => void; }`.

### CampDaysSkeleton
- Opis: Skeleton ekranu listy widoczny podczas ładowania danych.
- Główne elementy: placeholdery kart/wierszy w liczbie 4–8.
- Obsługiwane interakcje: brak.
- Obsługiwana walidacja: brak.
- Typy: brak (prezentacyjny).
- Propsy: `{ rows?: number }` (opcjonalnie).

### DeleteConfirmDialog
- Opis: Modal z potwierdzeniem usunięcia dnia.
- Główne elementy: `Dialog` (z `components/ui/dialog`), tytuł, opis, przyciski „Anuluj”/„Usuń”.
- Obsługiwane interakcje: potwierdzenie → `DELETE`; anulowanie → zamknij.
- Obsługiwana walidacja: blokada przycisku podczas requestu; wyświetlenie błędu w razie niepowodzenia.
- Typy: `ApiError` (do wyświetlenia komunikatu), lokalny stan.
- Propsy: `{ open: boolean; onOpenChange: (v: boolean) => void; onConfirm: () => Promise<void>; isLoading: boolean; error?: string; }`.

## 5. Typy
- Wykorzystane DTO (z `src/types.ts`):
  - `CampDayDTO` (id, group_id, day_number, date, theme, created_at, updated_at)
  - `GroupPermissionsDTO` (group_id, role, can_edit_all, can_edit_assigned_only)
  - `ApiError`, `ApiList<CampDayDTO>`
- Nowe ViewModele (lokalne dla widoku):
  - `CampDaysFilterState`:
    - `withoutActivities: boolean` – filtruj dni o `slotsCount === 0`
    - `searchTheme?: string` – filtr po `theme` (opcjonalnie)
  - `CampDayListItemVM`:
    - `id: UUID`
    - `dayNumber: number`
    - `date: DateISO`
    - `theme: string | null`
    - `slotsCount: number` (agregowane po harmonogramach)
    - `totalMinutes: number` (suma różnic `end_time - start_time` w minutach)
  - `UserActionPermissionsVM`:
    - `canManageDays: boolean` – wynik z ról (admin-only CRUD w tym widoku)

## 6. Zarządzanie stanem
- Lokalne stany w `CampDaysPage` (React):
  - `isLoading: boolean`, `error?: string`
  - `campDays: CampDayDTO[]`
  - `permissions: GroupPermissionsDTO | null`
  - `filters: CampDaysFilterState`
  - `deleteState: { open: boolean; id?: UUID; isLoading: boolean; error?: string }`
- Pochodne:
  - `items: CampDayListItemVM[]` – mapowanie `CampDayDTO` + dołączone metryki (z cache lub do-liczane)
  - `filteredItems` – filtracja wg `filters`
- Custom hooki (opcjonalnie):
  - `useCampDays(groupId: UUID)` – fetch listy dni, zarządzanie loading/error, refetch po usunięciu.
  - `useGroupPermissions(groupId: UUID)` – fetch uprawnień, memo `canManageDays`.
  - `useCampDayMetrics()` – obliczanie slotów i minut, jeśli dostępny endpoint/źródło.

## 7. Integracja API
- `GET /api/groups/{group_id}/camp-days` → `ApiList<CampDayDTO>`
  - Sort: `day_number ASC` (domyślnie z serwera)
  - Obsługa 404: potraktować jako brak dostępu do grupy (Not Found)
  - Obsługa błędów: komunikat toast + przycisk spróbuj ponownie
- `GET /api/groups/{group_id}/permissions` → `ApiSingle<GroupPermissionsDTO>`
  - Ustala widoczność akcji admin-only (`canManageDays` = `role === 'admin'`)
- `DELETE /api/camp-days/{camp_day_id}` → 204/200
  - Po sukcesie: refetch listy; toast „Usunięto dzień”
  - Błędy: `FORBIDDEN_ROLE`, `DAY_OUT_OF_RANGE`, `BAD_REQUEST`, `INTERNAL_ERROR` → toasty z przyjaznym komunikatem
- Metryki slotów i czasu:
  - Jeśli istnieje strona/dane harmonogramu w cache (np. przez `src/lib/camp-days`), użyć fetchu dodatkowego: `GET /api/camp-days/{camp_day_id}/schedules` (jeśli dostępne) lub pominąć metryki w MVP i oznaczyć `N/A`.

## 8. Interakcje użytkownika
- Wejście na stronę → skeleton → lista lub pusty stan.
- Klik „Dodaj dzień” (admin) → nawigacja do `/groups/{id}/camp-days/new`.
- Klik „Otwórz dzień” → nawigacja do widoku dnia.
- Klik „Edytuj” (admin) → nawigacja do `/groups/{id}/camp-days/{camp_day_id}/edit`.
- Klik „Usuń” (admin) → dialog potwierdzenia → `DELETE` → sukces: odświeżenie, toast; błąd: toast.
- Zmiana filtru „bez zajęć” → natychmiastowa filtracja listy.

## 9. Warunki i walidacja
- Uprawnienia:
  - `canManageDays` gdy `role === 'admin'` (US-004: akcje admin-only). Ukryj CTA i akcje Edytuj/Usuń.
- Maskowanie 404:
  - Gdy `GET camp-days` zwraca 404, pokaż stronę Not Found (bez zdradzania istnienia grupy).
- Walidacja danych:
  - `day_number` ≥ 1 (prezentacja – założyć poprawność z DB)
  - `date` w zakresie dat grupy (walidowane na backend; w UI jedynie format i fallback)
  - Metryki `slotsCount`, `totalMinutes` ≥ 0; fallback 0

## 10. Obsługa błędów
- Poziom listy: komunikat w `sonner`/toast przy błędzie pobrania, przycisk „Spróbuj ponownie”.
- Poziom usuwania: blokada przycisku podczas requestu; jeżeli błąd, pokaż komunikat błędu w dialogu i pozwól ponowić.
- Kody API → komunikaty:
  - `FORBIDDEN_ROLE` → „Nie masz uprawnień do tej operacji.”
  - `NOT_MEMBER`/`UNAUTHORIZED`/404 → Not Found (masking) lub przekierowanie do `/login` jeśli brak sesji.
  - `INTERNAL_ERROR` → „Coś poszło nie tak. Spróbuj ponownie.”

## 11. Kroki implementacji
1. Routing: dodaj `src/pages/groups/[id]/camp-days.astro` i osadź kontener React `CampDaysPage`.
2. Typy: zdefiniuj ViewModele `CampDaysFilterState`, `CampDayListItemVM`, `UserActionPermissionsVM` w `src/types.ts` lub lokalnie w module widoku (prefer lokalnie na start).
3. Hooki: zaimplementuj `useCampDays(groupId)` i `useGroupPermissions(groupId)` w `src/lib/camp-days` lub `src/lib/hooks`.
4. UI bazowe: stwórz `CampDaysHeader` z warunkowym CTA; `CampDaysSkeleton`.
5. Filtry: zaimplementuj `CampDaysFilters` i stan filtrów w `CampDaysPage`.
6. Lista: zaimplementuj `CampDaysList` + `CampDayCard`/`CampDayRow` z `CampDayMetrics` i `CampDayActions`.
7. Uprawnienia: ukryj CTA i akcje Edytuj/Usuń gdy `!canManageDays`.
8. Usuwanie: dodaj `DeleteConfirmDialog`, wywołanie `DELETE`, obsługa sukcesu/błędów, refetch.
9. Empty state: pokaż `CampDaysEmptyState` po załadowaniu przy pustej liście; z CTA dla admina.
10. Metryki slotów/czasu: jeśli dostępny endpoint harmonogramów – dołącz agregację; w przeciwnym razie placeholdery `0` i oznaczyć w kodzie miejsce rozszerzenia.
11. Skeletony i a11y: aria-labels dla przycisków, focus management w dialogu.
12. Test ręczny: role admin/member, 404 maskowanie, błędy sieci, usuwanie z potwierdzeniem.


