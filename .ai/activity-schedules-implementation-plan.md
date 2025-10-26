# API Endpoint Implementation Plan: Activity Schedules

## 1. Przegląd punktu końcowego
Endpointy zarządzają harmonogramem aktywności w ramach konkretnego dnia obozu (`camp_day`). Pozwalają:
- Utworzyć wpis harmonogramu (przypisanie aktywności do dnia z określonym przedziałem czasu i kolejnością).
- Pobierać uporządkowaną listę wszystkich wpisów danego dnia.
- Aktualizować czas (start/end) oraz kolejność istniejącego wpisu.
- Usuwać wpis z harmonogramu.

Cele biznesowe: zapewnienie deterministycznej kolejności (`order_in_day`) i integralności czasowej (brak końca przed startem; w przyszłości brak nakładania się czasów). Wpisy są komplementarne wobec `activities` (jedna aktywność może występować wiele razy w różnych slotach).

## 2. Szczegóły żądania
### 2.1 POST /api/camp-days/{camp_day_id}/schedules
- Tworzy nowy slot w harmonogramie dnia.
- Path param: `camp_day_id` (UUID) – wymagany.
- Body (JSON):
  ```json
  { "activity_id": "uuid", "start_time": "HH:MM", "end_time": "HH:MM", "order_in_day": 1 }
  ```
- Wymagane pola: `activity_id`, `start_time`, `end_time`, `order_in_day`.
- Walidacja:
  - Format czasu `HH:MM` 24h (np. 09:00). (Zod: regex ^\d{2}:\d{2}$ oraz dodatkowo semantyczne sprawdzenie 00-23 i 00-59.)
  - `end_time > start_time`.
  - `order_in_day >= 1`.
  - `activity_id` istnieje i należy do tej samej grupy co `camp_day`.
  - Unikalność `order_in_day` per `camp_day` (mapowana na błąd `ORDER_IN_DAY_CONFLICT`).
  - (Future) brak kolizji czasowej – obecnie nie egzekwowane; rezerwujemy kod `OVERLAPPING_TIME`.
- Autoryzacja: członek grupy (dowolna rola) może czytać listę; tworzyć mogą role `admin` lub `editor` (spójnie z logiką tworzenia aktywności). Weryfikacja poprzez widok `user_group_permissions` na podstawie `camp_day.group_id`.
- Odpowiedź: 201 + `ApiSingle<ActivityScheduleDTO>`.

### 2.2 GET /api/camp-days/{camp_day_id}/schedules
- Lista wpisów dnia.
- Path param: `camp_day_id` – wymagany.
- Query params: brak (MVP). Ewentualnie w przyszłości paginacja (mała liczba slotów – nie potrzebna).
- Autoryzacja: dowolny członek grupy (rola obecna w `user_group_permissions`). Brak członkostwa -> 404 maskujące.
- Odpowiedź: 200 + `ApiList<ActivityScheduleDTO>` uporządkowane rosnąco po `order_in_day`.

### 2.3 PATCH /api/activity-schedules/{schedule_id}
- Aktualizacja `start_time`, `end_time`, `order_in_day` (dowolnej kombinacji).
- Path param: `schedule_id` – wymagany.
- Body (JSON) – wszystkie pola opcjonalne, co najmniej jedno:
  ```json
  { "start_time": "HH:MM", "end_time": "HH:MM", "order_in_day": 2 }
  ```
- Walidacja (jeśli pola obecne):
  - Format czasu jak wyżej.
  - Jeśli oba czasy podane: `end_time > start_time`.
  - `order_in_day >= 1`.
  - Unikalność `order_in_day` przy zmianie -> `ORDER_IN_DAY_CONFLICT`.
- Autoryzacja: `admin` lub `editor` grupy wyciągniętej przez relację `camp_day_id -> camp_days.group_id`. Jeśli brak członkostwa -> 404 maskujące.
- Odpowiedź: 200 + `ApiSingle<ActivityScheduleDTO>`.

### 2.4 DELETE /api/activity-schedules/{schedule_id}
- Usunięcie wpisu harmonogramu.
- Path param: `schedule_id` – wymagany.
- Autoryzacja: `admin` lub `editor` (spójnie z tworzeniem/aktualizacją). Brak członkostwa -> 404.
- Odpowiedź: 200 + `{ data: { id: UUID } }` (potwierdzenie).

### Kody statusu
- 201 (create), 200 (read/update/delete ok), 400 (walidacja, konflikt orderu), 401 (brak uwierzytelnienia – jeśli wzorzec w serwisie tak zwraca), 404 (maskowanie braku dostępu lub nieistnienia), 500 (błędy wewnętrzne).

## 3. Wykorzystywane typy
Z `types.ts`:
- `ActivityScheduleDTO` (Pick z `activity_schedules`: `id, activity_id, camp_day_id, start_time, end_time, order_in_day, created_at, updated_at`).
- `ActivityScheduleCreateCommand` (`activity_id`, `start_time`, `end_time`, `order_in_day`).
- `ActivityScheduleUpdateCommand` (partial: `start_time`, `end_time`, `order_in_day`).
- `ApiResponse<T>` / `ApiListResponse<T>`.
- Kody błędów: `ORDER_IN_DAY_CONFLICT`, `OVERLAPPING_TIME`, `VALIDATION_ERROR`, `NOT_FOUND`, `FORBIDDEN_ROLE`, `UNAUTHORIZED`, `INTERNAL_ERROR`, `BAD_REQUEST`.

Dodatkowe nowe elementy:
- Nowe error factory w `errors.ts`: `orderInDayConflict`, `overlappingTime` (future placeholder). Dodamy dla spójności.

## 4. Szczegóły odpowiedzi
### Sukces
- POST: `{ data: ActivityScheduleDTO }` 201
- GET list: `{ data: ActivityScheduleDTO[] }` 200
- PATCH: `{ data: ActivityScheduleDTO }` 200
- DELETE: `{ data: { id: UUID } }` 200

### Błędy (przykłady)
- 400 VALIDATION_ERROR (z polami).
- 400 ORDER_IN_DAY_CONFLICT (unikalność naruszona).
- 400 BAD_REQUEST (np. brak żadnych pól w PATCH).
- 401 UNAUTHORIZED (brak sesji lub membershipu, wzorzec jak w istniejących serwisach – dopasować do używanego typu).
- 403 FORBIDDEN_ROLE (rola `member` przy próbie mutacji).
- 404 NOT_FOUND (nieistniejący `camp_day`, `activity`, `schedule` lub maska braku członkostwa).
- 500 INTERNAL_ERROR (błąd Supabase/DB).

## 5. Przepływ danych
1. Klient wywołuje endpoint.
2. Middleware dostarcza `locals.supabase` oraz identyfikator użytkownika (z JWT) lub fallback do `DEFAULT_USER_ID` (patrz istniejący wzorzec).
3. Service pobiera wpis(y) z DB:
   - POST: pobranie `camp_day` (id, group_id), pobranie `activity` (id, group_id), porównanie group_id; autoryzacja przez `user_group_permissions`. Wstawienie w `activity_schedules` z `.insert(...).select()`.
   - GET list: pobranie `camp_day` -> autoryzacja -> listowanie po `camp_day_id` + sort.
   - PATCH: pobranie `schedule` -> dołączenie `camp_day` lub bezpośrednio join przez dodatkowe select (schedule + camp_day.group_id) -> autoryzacja -> walidacja -> update.
   - DELETE: pobranie `schedule` -> autoryzacja -> delete.
4. Mapowanie wyników do DTO (dedykowany mapper dodać w `lib/mappers/activity-schedule.mapper.ts`).
5. Zwrócenie struktury `{ data: ... }` lub `{ error: { code, message, details? } }`.

## 6. Względy bezpieczeństwa
- RLS aktywny na tabelach (zakładamy włączenie). Endpoint dodatkowo aplikacyjnie maskuje brak uprawnień jako 404, zgodnie z istniejącym stylem dla camp days.
- Autoryzacja roli: tylko `admin` / `editor` mutacje; `member` tylko GET.
- Weryfikacja, że `activity` należy do tej samej grupy co `camp_day` – zapobiega cross-group injection.
- Brak możliwości tworzenia slotów dla usuniętych (soft-deleted) aktywności (sprawdzając `deleted_at` na `activities`).
- Walidacja czasu i kolejności zapobiega wprowadzeniu nieprawidłowych danych.
- Ograniczenie enumeracji zasobów przez maskowanie braku członkostwa (`NOT_FOUND`).

## 7. Obsługa błędów
Mapowanie Supabase error -> business codes:
- Unikalność `camp_day_id, order_in_day`: jeśli constraint nazwa zawiera `activity_schedules_camp_day_id_order_in_day_key` -> `ORDER_IN_DAY_CONFLICT` (400).
- Format/semantyka czasu: walidacja Zod -> `VALIDATION_ERROR`.
- Brak `schedule` / `camp_day` / `activity` -> `NOT_FOUND` (404).
- Brak roli -> `UNAUTHORIZED` lub maskowane `NOT_FOUND` (zgodnie z istniejącymi serwisami; dla spójności z `camp-days.service` użyjemy maskowania do 404 gdy brak membershipu).
- Rola niewystarczająca do mutacji -> `FORBIDDEN_ROLE` (403, choć aktualny kod errors.forbiddenRole prawdopodobnie mapowany do 403 w handlerze – potwierdzić; jeśli dotychczas zwracane jest 200 z error envelope, dopasować). Handler w pliku API ustawi właściwy status.
- Brak pól w PATCH -> `BAD_REQUEST`.
- Przyszłe nakładanie się czasu -> `OVERLAPPING_TIME`.
- Inne DB błędy -> `INTERNAL_ERROR` 500.

Edge cases:
- PATCH bez żadnego pola -> szybki zwrot istniejącego wpisu lub `BAD_REQUEST` (preferujemy `BAD_REQUEST`).
- POST z aktywnością z innej grupy -> `NOT_FOUND` (maskowanie) lub `CONFLICT`; wybieramy `NOT_FOUND` dla spójności z nieistniejącym zasobem.
- Aktualizacja zmienia tylko `order_in_day` na istniejący -> `ORDER_IN_DAY_CONFLICT`.

## 8. Rozważania dotyczące wydajności
- Liczba slotów per dzień jest niska (zwykle < 50): brak potrzeby paginacji i indeksów poza istniejącymi `idx_activity_schedules_day` i `idx_activity_schedules_activity`.
- Użycie pojedynczych zapytań `select` + `insert/update/delete` minimalne; brak potrzeby batching.
- Możliwe przyszłe GIST EXCLUDE dla czasu – dodanie indeksu zwiększy koszt INSERT; obecnie pomijamy.
- Optymalizacja: przy PATCH pobranie `schedule` razem z `camp_day_id` wystarcza – nie potrzebujemy join (drugi select dla camp_day.group_id jeśli nie posiadamy wiersza camp_day). Można pobrać camp_day.group_id poprzez join RPC lub drugi select (niskie obciążenie).

## 9. Etapy wdrożenia
1. Dodaj error factories `orderInDayConflict` i `overlappingTime` w `lib/errors.ts` (mapujące na odpowiednie kody).
2. Utwórz plik walidacji `lib/validation/activitySchedule.ts` z Zod schematami: `create` (wszystkie required), `update` (partial). Implementuj regex czasu i semantyczne porównanie w serwisie.
3. Utwórz mapper `lib/mappers/activity-schedule.mapper.ts` -> funkcja `mapActivityScheduleRowToDTO(row)`.
4. Utwórz service `lib/services/activity-schedules.service.ts` eksportujący:
   - `createActivitySchedule(supabase, userId, campDayId, input)`
   - `listActivitySchedules(supabase, userId, campDayId)`
   - `updateActivitySchedule(supabase, userId, scheduleId, input)`
   - `deleteActivitySchedule(supabase, userId, scheduleId)`
   Wzorzec autoryzacji i błędów jak `camp-days.service.ts` + dodatkowe sprawdzenia aktywności.
5. Implementuj logikę:
   - Helpers: `effectiveUserId`, `fetchUserGroupPermissions`, `fetchCampDayWithGroup(campDayId)`, `fetchActivity(activityId)`.
   - Walidacja Zod + dodatkowe reguły (`end_time > start_time`).
   - Unikalność `order_in_day` -> przechwycić Supabase error; jeśli constraint nazwa zawiera `_camp_day_id_order_in_day_key` -> `ORDER_IN_DAY_CONFLICT`.
6. Dodaj endpointy Astro:
   - `src/pages/api/camp-days/[camp_day_id]/schedules.ts` (GET, POST). `export const prerender = false`. Parsowanie body dla POST, pobranie `supabase` z `locals`. Ustaw status (201 przy POST success).
   - `src/pages/api/activity-schedules/[schedule_id].ts` (PATCH, DELETE). Walidacja body i mapping status code.
7. Test manualny (curl) scenariuszy: create, duplicate order, list, patch change order, delete.
9. Dokumentacja README sekcja API: dopisać krótką tabelę (opcjonalnie później).
10. Przygotować miejsce pod przyszły overlap check (komentarz TODO w service).

## 10. Status Code Mapping w handlerach
- Sukces: 200/201.
- ApiError.code -> mapowanie:
  - VALIDATION_ERROR -> 400
  - ORDER_IN_DAY_CONFLICT -> 400
  - OVERLAPPING_TIME -> 400
  - BAD_REQUEST -> 400
  - UNAUTHORIZED -> 401
  - FORBIDDEN_ROLE -> 403
  - NOT_FOUND -> 404
  - INTERNAL_ERROR -> 500
  - Inne (CONFLICT, itp.) -> 409 lub odpowiedni (nie używane tu poza ORDER_IN_DAY_CONFLICT które mapujemy na 400).

## 11. Logging & Observability (mini)
- Przy INTERNAL_ERROR logować `error.message` (miejsce na integrację z zewnętrznym logerem w przyszłości).
- Brak osobnej tabeli błędów w MVP – mapowanie w envelope wystarczające.
- TODO komentarz w service dla przyszłego instrumentowania (metrics: count schedules per day).

## 12. Future Enhancements
- Overlap detection: implement server-side check z GIST EXCLUDE i mapowaniem błędu do `OVERLAPPING_TIME`.
- Pagination + filtering (np. wg aktywności) jeśli skala wzrośnie.
- Bulk reorder endpoint (PATCH kolekcji) dla drag & drop UI.
- Soft delete (jeśli wymagane audytowo) zamiast hard delete.
