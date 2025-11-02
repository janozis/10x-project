# Plan implementacji widoku Camp Days – widok dnia

## 1. Przegląd
Widok dnia w module Camp Days służy do zarządzania slotami (harmonogramem) konkretnego dnia obozu: dodawanie, edycja godzin, zmiana kolejności (DnD), usuwanie oraz szybkie planowanie na podstawie domyślnych bloków. Widok respektuje uprawnienia: admin ma pełne prawo edycji, edytor może modyfikować wyłącznie sloty powiązane z przypisanymi mu aktywnościami. Interfejs zapewnia walidację czasu, badge statusu aktywności, autosave zmian i ostrzeżenia o potencjalnych konfliktach.

## 2. Routing widoku
- Ścieżka: `/groups/{group_id}/camp-days/{camp_day_id}`
- Selector dni dostępny pod: `/groups/{group_id}/camp-days` (lista dni + przejście do dnia)
- Implementacja w Astro: `src/pages/groups/[group_id]/camp-days/[camp_day_id].astro`

## 3. Struktura komponentów
- `CampDayPage` (Astro)
  - osadza `CampDayView` (React, klientowy)
- `CampDayView` (React)
  - `DaySelector` – lista dni w grupie (przełączanie routingu)
  - `DayHeader` – meta dnia (data, temat, sumaryczny czas)
  - `ConflictsBanner` – ostrzeżenia (lokalne lub z API)
  - `SlotsPanel`
    - `SlotsList` (dnd-kit) – sortowalne sloty
      - wiele `SlotRow`
        - `TimeRangeEditor` (Start/End `TimePicker`)
        - `ActivityBadge` (nazwa, status, możliwość przejścia do aktywności)
        - `SlotActionsMenu` (Usuń, Duplikuj, „Odłącz”/Zmień aktywność)
    - `AddSlotButton`
  - `Toolbar`
    - `ApplyTemplateButton`
    - `CreateActivityInlineButton`
  - `SaveStatusBar` – stan autosave (idle/saving/saved/error)
- Modale/Dialogi
  - `ActivityPickerDialog` – wybór istniejącej lub utworzenie nowej aktywności „z miejsca”
  - `ApplyTemplateDialog` – wybór i podgląd domyślnych bloków (opcjonalne; CTA może też działać bez dialogu)

## 4. Szczegóły komponentów
### CampDayPage (Astro)
- Opis: Strona routingu dnia. Ładuje parametry `group_id`, `camp_day_id` i montuje `CampDayView` z `client:only="react"` lub `client:visible`.
- Główne elementy: kontener, loader SSR minimalny (opcjonalnie), mount React.
- Zdarzenia: brak (delegowane do React).
- Walidacja: brak.
- Typy: przekazywane parametry routingu.
- Propsy:
  - `groupId: string`
  - `campDayId: string`

### CampDayView
- Opis: Top-level logika dnia. Pobiera dane dnia, sloty, prawa, nasłuchuje realtime, koordynuje akcje.
- Główne elementy: układ z panelem slotów, header, baner konfliktów, pasek statusu zapisu.
- Zdarzenia:
  - Zmiana dnia (z `DaySelector`) → nawigacja.
  - Edycja godzin/zmiana kolejności/dodawanie/usuwanie → wywołania API.
  - Zastosowanie szablonu → batch utworzeń slotów.
- Walidacja:
  - Lokalna: format czasu, `end_time > start_time`, brak lokalnych kolizji (best-effort), zakres kolejności ≥1.
  - Serwerowa: obsługa błędów `ORDER_IN_DAY_CONFLICT`, `OVERLAPPING_TIME` (przyszłość), `UNAUTHORIZED/ FORBIDDEN`.
- Typy: `CampDayDTO`, `ActivityScheduleDTO`, `GroupPermissionsDTO`, `ActivityDTO` (podsumowanie), VM-y poniżej.
- Propsy:
  - `groupId: UUID`
  - `campDayId: UUID`

### DaySelector
- Opis: Pasek wyboru dnia w obrębie grupy.
- Główne elementy: lista dni (scroll/segment), aktywny stan.
- Zdarzenia: klik na dzień → nawigacja do `/groups/{group_id}/camp-days/{camp_day_id}`.
- Walidacja: brak.
- Typy: `CampDayDTO[]` (lista), minimalne VM.
- Propsy: `{ groupId: UUID, activeCampDayId: UUID }`

### DayHeader
- Opis: Informacje o dniu (data, temat), suma minut slotów.
- Główne elementy: tytuł, badge tematu, `TotalDuration`.
- Zdarzenia: brak.
- Walidacja: brak.
- Typy: `CampDayDTO`, wyliczona `totalMinutes: number`.
- Propsy: `{ campDay: CampDayDTO, totalMinutes: number }`

### ConflictsBanner
- Opis: Wyświetla ostrzeżenia: lokalne możliwe konflikty czasu, błędy z API.
- Główne elementy: `Alert/Callout` z listą.
- Zdarzenia: „Odśwież” (opcjonalnie), link do dokumentacji.
- Walidacja: brak (prezentacja wyników).
- Typy: `ConflictMessage { type: 'overlap'|'order'|'api'; detail: string }[]`.
- Propsy: `{ conflicts: ConflictMessage[] }`

### SlotsList (dnd-kit)
- Opis: Sortowalna lista slotów dnia.
- Główne elementy: kontener DnD, `SlotRow` jako element sortowalny, `DragHandle`.
- Zdarzenia:
  - `onDragEnd` → renumeracja `order_in_day` → serie `PATCH`.
- Walidacja:
  - Tylko admin lub edytor przypisany do danej aktywności może przesuwać slot.
- Typy: `SlotVM[]`.
- Propsy: `{ slots: SlotVM[], onReorder: (ordered: SlotVM[]) => void, canReorder: (slotId) => boolean }`

### SlotRow
- Opis: Wiersz slotu z edycją godzin i akcji.
- Główne elementy: `TimeRangeEditor`, `ActivityBadge`, `SlotActionsMenu`.
- Zdarzenia:
  - Zmiana `start_time`/`end_time` → debounce autosave (`PATCH /api/activity-schedules/{id}`).
  - Usunięcie slotu → `DELETE`.
  - Zmiana aktywności → dialog wyboru i `PATCH activity_id`.
- Walidacja:
  - Format czasu, `end_time > start_time` przed zapisem.
  - Uprawnienia edycji.
- Typy: `SlotVM`.
- Propsy: `{ slot: SlotVM, disabled: boolean, onChange: (p: Partial<SlotVM>) => void, onDelete: () => void }`

### TimeRangeEditor / TimePicker
- Opis: Edytor zakresu czasu HH:MM, klawiaturowy, a11y.
- Główne elementy: dwa `input type="time"` lub custom z walidacją.
- Zdarzenia: `onStartChange`, `onEndChange` → walidacja natychmiastowa, debounce zapisu.
- Walidacja: HH:MM, `end > start`.
- Typy: `{ start: TimeHHMM, end: TimeHHMM }`.
- Propsy: `{ start, end, onChange, disabled }`

### ActivityBadge
- Theming: shadcn/ui `Badge` + status kolor (draft/review/ready/archived).
- Zdarzenia: klik → nawigacja do szczegółów aktywności.
- Walidacja: brak.
- Typy: `ActivitySummaryVM`.
- Propsy: `{ activity: ActivitySummaryVM }`

### SlotActionsMenu
- Akcje: Usuń, Duplikuj (lokalnie → POST nowy slot z +delta czasu), Zmień aktywność.
- Walidacja: uprawnienia.
- Propsy: `{ onDelete, onDuplicate, onChangeActivity, disabled }`

### AddSlotButton
- Opis: Dodanie nowego slotu na końcu listy lub w wybranym miejscu.
- Akcja: Otwiera `ActivityPickerDialog` (wybór istniejącej aktywności) albo „Utwórz i zaplanuj”. Po wyborze → `POST /api/camp-days/{camp_day_id}/schedules`.
- Walidacja: uprawnienia, czas domyślny bez kolizji.
- Propsy: `{ onCreate }`

### ActivityPickerDialog
- Opis: Wybór istniejącej aktywności (search) lub utworzenie minimalnej (tytuł + domyślne pola) i natychmiastowe zaplanowanie.
- API: `GET /api/groups/{group_id}/activities` (filtr), `POST /api/groups/{group_id}/activities` (minimal), następnie `POST schedules`.
- Walidacja: wymagane pola aktywności (wg API), uprawnienia.

### ApplyTemplateButton / ApplyTemplateDialog
- Opis: Zastosowanie domyślnych bloków czasu dla dnia (np. Poranny apel, Blok I, Obiad, Blok II, Cisza nocna…)
- Akcja: Generuje propozycje slotów i wysyła serię `POST` do schedules. W przypadku istniejących slotów – opcje: scalić, nadpisać, dodać puste bloki.
- Walidacja: brak konfliktów godzin (lokalna weryfikacja), uprawnienia.

### SaveStatusBar
- Opis: Prezentuje stan autosave (Saving… / Saved / Error). Przy błędzie link „spróbuj ponownie”.
- Propsy: `{ state: 'idle'|'saving'|'saved'|'error', message?: string }`

## 5. Typy
- DTO (z `src/types.ts`):
  - `CampDayDTO`: `id`, `group_id`, `day_number`, `date`, `theme`, `created_at`, `updated_at`.
  - `ActivityScheduleDTO`: `id`, `activity_id`, `camp_day_id`, `start_time`, `end_time`, `order_in_day`, `created_at`, `updated_at`.
  - `ActivityDTO`: używany do tytułu/statusu (min.: `id`, `title`, `status`).
  - `GroupPermissionsDTO`: `group_id`, `role`, `can_edit_all`, `can_edit_assigned_only`.
- Nowe ViewModel (frontend):
  - `ActivityStatus = ActivityDTO['status']` ("draft"|"review"|"ready"|"archived").
  - `ActivitySummaryVM`:
    ```ts
    interface ActivitySummaryVM {
      id: UUID;
      title: string;
      status: ActivityStatus;
    }
    ```
  - `SlotVM`:
    ```ts
    interface SlotVM {
      id: UUID; // schedule id
      activityId: UUID;
      startTime: TimeHHMM;
      endTime: TimeHHMM;
      orderInDay: number;
      activity?: ActivitySummaryVM; // lazy-loaded
      canEdit: boolean; // wyliczone z uprawnień i przypisań edytora
    }
    ```
  - `CampDayVM`:
    ```ts
    interface CampDayVM {
      day: CampDayDTO;
      slots: SlotVM[];
      totalMinutes: number;
      conflicts: ConflictMessage[];
    }
    ```
  - `ConflictMessage`:
    ```ts
    type ConflictType = 'overlap' | 'order' | 'api';
    interface ConflictMessage {
      type: ConflictType;
      detail: string;
      scheduleId?: UUID;
    }
    ```
  - `UserAssignments`:
    ```ts
    interface UserAssignments {
      assignedActivityIds: Set<UUID>;
    }
    ```

## 6. Zarządzanie stanem
- Lokalny stan w `CampDayView` + dedykowane hooki:
  - `useCampDayData(groupId, campDayId)` – pobiera `CampDayDTO`, listę `ActivityScheduleDTO`, lazy-loaduje `ActivitySummaryVM` dla `activity_id`, wylicza `totalMinutes`, `conflicts`.
  - `usePermissions(groupId)` – `GET /api/groups/{group_id}/permissions` → `GroupPermissionsDTO`; uzupełnia `UserAssignments` (np. dodatkowe wywołanie do listy przypisań – w miarę możliwości agregowane; fallback: oznacz `can_edit_all` i polegaj na serwerze).
  - `useAutosaveSchedule()` – debounce 500–700 ms, kolejkuje `PATCH` i obsługuje `SaveStatusBar`.
  - `useSchedulesDndController()` – utrzymuje lokalne ordery, po dropie renumeruje i wysyła serie `PATCH` (z retry i rollback przy konfliktach).
  - `useRealtimeCampDay(groupId, campDayId)` – subskrypcje Supabase Realtime dla tabel `activity_schedules` (INSERT/UPDATE/DELETE) i `camp_days` (opcjonalnie). Po zdarzeniach → soft-refetch lub reconcilacja na VM.
- Strategia spójności: optymistyczne aktualizacje + twardy refetch po błędach 409/412.

## 7. Integracja API
- Camp Days:
  - `GET /api/groups/{group_id}/camp-days` → lista `CampDayDTO[]` (dla `DaySelector`).
  - `GET /api/camp-days/{camp_day_id}` → `CampDayDTO`.
  - `PATCH /api/camp-days/{camp_day_id}` → aktualizacja `date/theme` (jeśli edytowane; MVP może pominąć).
- Activity Schedules:
  - `GET /api/camp-days/{camp_day_id}/schedules` → `ActivityScheduleDTO[]` (posortowane po `order_in_day`).
  - `POST /api/camp-days/{camp_day_id}/schedules` body:
    ```json
    { "activity_id": "uuid", "start_time": "09:00", "end_time": "10:30", "order_in_day": 1 }
    ```
    zwraca `ActivityScheduleDTO`.
  - `PATCH /api/activity-schedules/{schedule_id}` body (partial):
    ```json
    { "start_time": "09:00", "end_time": "10:30", "order_in_day": 2, "activity_id": "uuid" }
    ```
  - `DELETE /api/activity-schedules/{schedule_id}`
- Dodatkowe (dla ActivityBadge/Picker):
  - `GET /api/groups/{group_id}/activities` (filtrowanie po tytule/statusie) → lista `ActivityDTO`.
  - `POST /api/groups/{group_id}/activities` (minimalny formularz) → `ActivityDTO`.
- Uprawnienia:
  - `GET /api/groups/{group_id}/permissions` → `GroupPermissionsDTO`.
- Kody błędów (z `ApiError.error.code`): `OVERLAPPING_TIME` (przyszłość), `ORDER_IN_DAY_CONFLICT`, `UNAUTHORIZED`, `FORBIDDEN_ROLE`, inne.

## 8. Interakcje użytkownika
- Zmiana kolejności slotów (drag-and-drop):
  - Drop → lokalna renumeracja → wysyłka `PATCH` per slot zmieniony → „Saved” po sukcesie.
- Edycja czasu slotu:
  - Zmiana start/end → walidacja → autosave `PATCH` → aktualizacja sumarycznego czasu.
- Dodanie slotu:
  - Klik `AddSlotButton` → `ActivityPickerDialog` → wybór aktywności → domyślne godziny (np. ostatni `end_time` + 15 min) → `POST` → wstawienie w liście.
- Zmiana aktywności w slocie:
  - `SlotActionsMenu` → `ActivityPickerDialog` → `PATCH activity_id`.
- Usunięcie slotu:
  - Potwierdzenie → `DELETE` → usunięcie z listy i renumeracja lokalna.
- Zastosowanie domyślnych bloków:
  - Klik CTA → generacja zestawu slotów → batch `POST` (kolejno) → odświeżenie listy.
- Przejście do innego dnia:
  - `DaySelector` → nawigacja do ścieżki dnia.

## 9. Warunki i walidacja
- Czas:
  - HH:MM, `end_time > start_time` (lokalnie przed zapisem; UI z komunikatem inline).
- Kolejność:
  - `order_in_day >= 1`, unikalność – utrzymywana przez renumerację po DnD; konflikty z serwera → odśwież i retry.
- Konflikty czasu:
  - Lokalny check nakładania się slotów; jeśli wykryty → ostrzeżenie, ale pozwól zapisać (zgodnie z walidacją serwera „future”).
- Uprawnienia:
  - Admin: pełny dostęp.
  - Edytor: `disabled` jeśli `activity_id` nie w `assignedActivityIds` i `can_edit_all===false`.
- Szablony:
  - Przed batch-POST: pre-walidacja braku kolizji, korekta godzin (np. automatyczne wcięcia).

## 10. Obsługa błędów
- 401/403 (`UNAUTHORIZED`/`FORBIDDEN_ROLE`): baner z informacją i blokada edycji.
- 409 (`ORDER_IN_DAY_CONFLICT` lub kolizje przyszłości): komunikat z prośbą o odświeżenie, automatyczny refetch.
- `OVERLAPPING_TIME` (gdy serwer zwróci): highlight konfliktowych slotów, propozycja przesunięcia.
- 400/422 (`VALIDATION_ERROR`): komunikaty inline przy polach czasu.
- 500 (`INTERNAL_ERROR`): toast + „spróbuj ponownie”.
- Retry polityka: 2 próby dla `PATCH`/`POST` przy błędach sieci; fallback do rollback i refetch.

## 11. Kroki implementacji
1. Routing: utwórz `src/pages/groups/[group_id]/camp-days/[camp_day_id].astro` i zamontuj `CampDayView` (React, `client:only="react"`).
2. UI bazowy: layout z `DayHeader`, `Toolbar`, `SlotsPanel`, `SaveStatusBar`, pusty `ConflictsBanner`.
3. DaySelector: komponent z `GET /api/groups/{group_id}/camp-days`, nawigacja między dniami.
4. Warstwa danych: zaimplementuj `useCampDayData` (pobranie dnia, `GET schedules`, mapowanie na `SlotVM`, lazy `ActivitySummaryVM`).
5. Uprawnienia: `usePermissions` + określenie `canEdit` per slot (w tym fallback do serwera).
6. Edycja czasu: `TimeRangeEditor` z walidacją i `useAutosaveSchedule` (debounce, statusy).
7. DnD: `SlotsList` na `@dnd-kit` + `useSchedulesDndController` (renumeracja, serie `PATCH`, rollback on error).
8. Akcje slotu: `SlotActionsMenu` (Usuń/ Duplikuj/ Zmień aktywność) + odpowiednie wywołania API.
9. Dodawanie slotu: `AddSlotButton` + `ActivityPickerDialog` (lista aktywności, minimalny create) + `POST schedules`.
10. Szablony: `ApplyTemplateButton/Dialog` – wygeneruj zestaw bloków, batch `POST`, obsłuż kolizje.
11. ConflictsBanner: wypełnij lokalne ostrzeżenia i propaguj kody z API.
12. Realtime: `useRealtimeCampDay` – subskrypcje, reconcilacja lub refetch po zdarzeniach.
13. Badge statusów: `ActivityBadge` (kolory wg statusu).
14. A11y/UX: focus management po DnD, rola drag handle, klawiatura, komunikaty ARIA w walidacji czasu.
15. Testy ręczne: scenariusze zmian czasu, reorder, szablony, uprawnienia, konflikty.
16. Optymalizacje: memoizacja selektorów, caching activity summaries, minimalizowanie liczby PATCH (batching gdy możliwe).

---

Wymagane biblioteki i zależności:
- `@dnd-kit/core`, `@dnd-kit/sortable` – DnD dla `SlotsList`.
- shadcn/ui (już w projekcie) – `Button`, `Badge`, `Card`, `Dialog`, `Alert`.

Uwagi dotyczące bezpieczeństwa i zgodności z PRD:
- Egzekwuj uprawnienia na UI i licz się z odmową po stronie API.
- Minimalizuj dane: listy aktywności w pickerze filtruj po potrzebnych polach.
- Real-time: zapewnij możliwie szybkie odświeżanie po zapisach i subskrypcji.
