# API Endpoint Implementation Plan: Activities Resource

## 1. Przegląd punktu końcowego
Zestaw endpointów do zarządzania zasobem "Activity" (zajęcia) w kontekście konkretnej grupy. Obejmuje tworzenie, listowanie, pobieranie szczegółów, aktualizację (częściową), soft delete oraz przywracanie. Dane są przechowywane w tabeli `activities` z powiązaniem do `groups` oraz relacjami pomocniczymi (`activity_editors`, `ai_evaluations`, harmonogram w późniejszym etapie). Endpointy muszą respektować role użytkownika w grupie (admin, editor, member) oraz zasady RLS w Supabase. Wdrażamy walidację wejścia, filtrowanie i wyszukiwanie (proste full-text w MVP), spójne opakowanie odpowiedzi oraz wzorce błędów.

## 2. Szczegóły żądania
### 2.1 Lista (GET /api/groups/{group_id}/activities)
- Metoda: GET
- Path params: `group_id: UUID` (wymagany)
- Query params (opcjonalne):
  - `status`: jeden z ('draft','review','ready','archived')
  - `assigned=me`: jeżeli obecny i równy 'me' – ogranicza wyniki do aktywności gdzie użytkownik jest edytorem lub (opcjonalnie) creator (do decyzji – w MVP: tylko edytorem)
  - `search`: fraza tekstowa do wyszukania po `title` i `objective` (MVP proste `ILIKE` lub `to_tsvector` jeśli rozszerzenie dostępne)
  - Pagination: `limit` (domyślnie 20, max 100), `cursor` (dla stronicowania kursorowego opartego na `created_at,id`) LUB alternatywnie offsetowe `page`/`page_size` (preferujemy kursor). W planie implementujemy kursor.
- Autoryzacja: użytkownik musi być członkiem grupy (dowolna rola).

### 2.2 Tworzenie (POST /api/groups/{group_id}/activities)
- Metoda: POST
- Path params: `group_id: UUID`
- Body (JSON) – wszystkie pola wymagane:
  - `title`, `objective`, `tasks`, `duration_minutes`, `location`, `materials`, `responsible`, `knowledge_scope`, `participants`, `flow`, `summary`
- Pola nadawane automatycznie: `status='draft'`, `created_by`, `updated_by` (auth.uid), `group_id` z path, timestamps z DB.
- Autoryzacja: rola w grupie `admin` lub `editor`.
- Walidacja: patrz sekcja 5.

### 2.3 Pobranie pojedynczej (GET /api/activities/{activity_id})
- Metoda: GET
- Path params: `activity_id: UUID`
- Autoryzacja: użytkownik musi należeć do powiązanej grupy.
- Uwzględnić filtr: jeśli `deleted_at` nie jest NULL -> zasób traktowany jako usunięty (404) chyba że późniejsza opcja „show_deleted” (nie w MVP).

### 2.4 Aktualizacja (PATCH /api/activities/{activity_id})
- Metoda: PATCH
- Path params: `activity_id`
- Body (JSON) – dowolny podzbiór pól: `title`, `objective`, `tasks`, `duration_minutes`, `location`, `materials`, `responsible`, `knowledge_scope`, `participants`, `flow`, `summary`, `status` (kontrola przejść statusów – opcjonalnie w MVP pozwalamy na każdy dozwolony z enumeracji jeśli rola `admin` lub edytor przypisany).
- Autoryzacja: `admin` lub przypisany edytor (rola `editor` w group_memberships plus obecny w `activity_editors`), zgodnie z politykami RLS.
- Walidacja: tylko pola obecne, plus reguły zakresu dla `duration_minutes`.
- Concurrency: opcjonalne `If-Match` na etag (pochodny z `updated_at`). Jeśli nagłówek obecny i nie zgodny -> 412 (opcjonalne, poza zakresem minimalnym – można oznaczyć jako następny krok).

### 2.5 Soft Delete (DELETE /api/activities/{activity_id})
- Metoda: DELETE
- Realizacja: zamiast fizycznego usunięcia ustawiamy `deleted_at = now()` (o ile null). 
- Autoryzacja: `admin` lub przypisany edytor? (Zwykle tylko `admin`; przyjmujemy tylko `admin` w MVP dla bezpieczeństwa.)
- Idempotencja: powtórne DELETE zasobu już soft-deleted -> 404 (zasób traktowany jako nieistniejący publicznie).

### 2.6 Restore (POST /api/activities/{activity_id}/restore)
- Metoda: POST
- Body: pusty (`{}`)
- Warunek: `deleted_at IS NOT NULL`.
- Efekt: ustawienie `deleted_at = NULL`, aktualizacja `updated_at`.
- Autoryzacja: `admin` (wyłącznie).
- Konflikt: jeśli `deleted_at IS NULL` -> 404 (spójne z „nie ma usuniętej wersji”).

## 3. Wykorzystywane typy
- `ActivityDTO` (z `types.ts`) – rozszerzymy wypłatę o pole `editors: ActivityEditorDTO[]` oraz `last_evaluation_requested_at` (już istnieje) => definiujemy nowy typ: `ActivityWithEditorsDTO`.
- `ActivityCreateCommand` – wejście do POST (wszystkie pola wymagane).
- `ActivityUpdateCommand` – wejście do PATCH (częściowe).
- `ActivityRestoreCommand` – pusty typ (Record<never, never>) dla restore.
- `ApiSingle<T>` / `ApiList<T>` – opakowania odpowiedzi.
- `ApiError` / `ApiErrorCode` – kody błędów: `VALIDATION_ERROR`, `FORBIDDEN_ROLE`, `ACTIVITY_NOT_FOUND`, `UNAUTHORIZED`, `INTERNAL_ERROR`.
- `CursorPaginationParams` – dla listy.
- Nowy: `ActivitiesListFilters` (lokalny interface w service) scalający status/search/assigned/pagination.

## 4. Szczegóły odpowiedzi
### 4.1 Sukces
- POST (create): 201 + `ApiSingle<ActivityWithEditorsDTO>` (bez `deleted_at`). Editors początkowo: pusty array; opcjonalnie auto-dodanie tworzącego do `activity_editors` (decyzja: w MVP NIE dodajemy automatycznie – pozostaje pusty; notatka w przyszłym backlogu).
- GET list: 200 + `ApiList<ActivityWithEditorsDTO>` (`data: []`, `nextCursor?`, `count?` jeśli offset mode – w kursorowym brak `count`).
- GET single: 200 + `ApiSingle<ActivityWithEditorsDTO>`.
- PATCH: 200 + `ApiSingle<ActivityWithEditorsDTO>` (zaktualizowany).
- DELETE: 200 + `ApiSingle<{ id: UUID; deleted_at: TimestampISO }>` (prostota) lub pełny DTO – wybieramy minimalny envelope.
- RESTORE: 200 + `ApiSingle<ActivityWithEditorsDTO>`.

### 4.2 Błędy (statusy wg wytycznych)
- 400: błędna walidacja danych wejściowych (`VALIDATION_ERROR`).
- 401: brak autentykacji lub brak uprawnień roli (`UNAUTHORIZED` lub `FORBIDDEN_ROLE` – ponieważ lista dopuszczalnych statusów nie zawiera 403; w payload code zostaje `FORBIDDEN_ROLE`).
- 404: zasób nie istnieje lub soft-deleted (dla GET/PATCH/DELETE/RESTORE) -> `ACTIVITY_NOT_FOUND`.
- 500: nieoczekiwany błąd serwera (`INTERNAL_ERROR`).

## 5. Przepływ danych
1. Middleware uwierzytelnia użytkownika (Supabase session) i udostępnia `locals.supabase` oraz `locals.user`.
2. Endpoint parsuje path params (`group_id` lub `activity_id`).
3. Walidacja wejścia przez Zod (schemas w `src/lib/validation/activity.ts`). W przypadku błędu -> mapowanie do `VALIDATION_ERROR`.
4. Service layer (`activities.service.ts`) otrzymuje: kontekst użytkownika (userId), supabase client, parametry filtrowania lub komendę tworzenia/aktualizacji.
5. Service wykonuje zapytania:
   - Create: `insert` do `activities` (Supabase). Pobiera wiersz, mapuje do DTO, dołącza editors (pusty set).
   - List: buduje bazowe zapytanie `from('activities')` + `eq('group_id', group_id)` + filtry + soft delete exclusion (`is null` deleted_at). Paginacja kursorowa: sort `created_at DESC, id DESC`, użycie `lt`/`lte` z kursorem złożonym (`created_at|id`). Po pobraniu identyfikatorów aktywności wykonuje drugie zapytanie `activity_editors` dla batch (IN) i skleja wyniki (redukcja N+1). Alternatywa: jedna RPC – w MVP prosty batch.
   - Get single: select by id + deleted_at is null + join editors (drugi query). 
   - Update: sprawdzenie uprawnień (RLS plus manualnie rola dla pola `status`), wykonanie `update` ograniczone do dopuszczonych kolumn, zwrócenie nowego wiersza.
   - Soft delete: update `deleted_at`.
   - Restore: update `deleted_at = null`.
6. Mapowanie w service -> DTO (mapper w `src/lib/mappers/activity.mapper.ts`).
7. Endpoint opakowuje wynik w `ApiSingle`/`ApiList` i zwraca JSON + właściwy status.
8. Ewentualne błędy przechwytywane w try/catch -> `errors.ts` helper (standaryzacja).

## 6. Względy bezpieczeństwa
- Autentykacja: każdy endpoint wymaga zalogowanego użytkownika (sprawdzenie session / `auth.uid()` przez Supabase RLS). Jeśli brak -> 401.
- Autoryzacja: tworzenie/aktualizacja/usuwanie/przywracanie limitowane rolą (`admin` lub edytor). RLS zabezpiecza SELECT/UPDATE, ale aplikacja dodatkowo może szybciej zwrócić `FORBIDDEN_ROLE` przed wykonywaniem kosztownego zapytania.
- Path Param Trust: `group_id` i `activity_id` nigdy nie z body; redukcja ryzyka overpostingu.
- Walidacja intensywna: brak pustych stringów – `min(1)` w Zod; `duration_minutes` w zakresie 5..1440.
- Ochrona przed masową edycją: w PATCH wybieramy whitelistę kolumn.
- Wyszukiwanie: zabezpieczenie przed SQL injection – Supabase builder + parametyzacja; dla tsquery: sanitizacja (plainto_tsquery) lub fallback ILIKE.
- Paginacja: limit max 100 (ochrona przed DoS).
- Soft delete: usunięte rekordy niewidoczne w listach i get – zapobiega nieautoryzowanemu odczytowi historycznemu.
- Audyt: `created_by`, `updated_by` wypełniane z kontekstu; brak możliwości nadpisania z body.
- Unikanie ujawniania zbędnych danych: brak kolumn `deleted_at` w standardowym DTO (chyba że restore/DELETE odpowiedź) – minimalizacja powierzchni.

## 7. Obsługa błędów
| Scenariusz | Kod HTTP | ApiErrorCode | Opis |
|------------|----------|--------------|------|
| Brak session | 401 | UNAUTHORIZED | Użytkownik niezalogowany |
| Brak członkostwa w grupie (list/create) | 401 | FORBIDDEN_ROLE | Nie jest członkiem / brak roli |
| Próba edycji bez uprawnień | 401 | FORBIDDEN_ROLE | Rola niewystarczająca |
| Rekord nie istnieje lub soft deleted | 404 | ACTIVITY_NOT_FOUND | Nie znaleziono |
| Niepoprawne dane wejściowe | 400 | VALIDATION_ERROR | Walidacja Zod |
| Zakres `duration_minutes` poza 5..1440 | 400 | VALIDATION_ERROR | Specyficzny detal w `details` |
| Próba restore gdy nie deleted | 404 | ACTIVITY_NOT_FOUND | Brak usuniętej wersji |
| Błąd bazy (np. constraint) | 500 | INTERNAL_ERROR | Log + generic message |
| Inny nieoczekiwany wyjątek | 500 | INTERNAL_ERROR | Fallback |

Format błędu: `{ error: { code, message, details? } }`.

## 8. Rozważania dotyczące wydajności
- Batch retrieval editors: unikamy N+1 – jedna kwerenda `select * from activity_editors where activity_id IN (...)` i grupowanie w aplikacji.
- Indeksy: użycie `idx_activities_group`, `idx_activities_status`. Jeśli `search` często używane – możliwe dodanie GIN na tsvector (później). W MVP `ILIKE` na dwóch kolumnach może wymagać limitu.
- Kursor vs offset: Kursor skalowalny dla dużych zbiorów. Implementacja: kursor = base64("{created_at}|{id}").
- Minimalizacja payload: brak zbędnych kolumn, brak joinów jeśli nie potrzebne.
- Możliwa dalsza optymalizacja: RPC funkcja zwracająca aktywności z edytorami (późniejszy etap).

## 9. Kroki implementacji
1. Utworzyć plik `src/lib/validation/activity.ts` z Zod schemas: `activityCreateSchema`, `activityUpdateSchema`, internal helpers (stringNonEmpty, durationRange). Eksportować type inference jeśli potrzebne.
2. Dodać mapper `src/lib/mappers/activity.mapper.ts`: funkcja `mapActivityRow(row, editorsRows): ActivityWithEditorsDTO`.
3. Dodać typ rozszerzony: aktualizacja `src/types.ts` (opcjonalny dodatek na końcu pliku) – `export interface ActivityWithEditorsDTO extends ActivityDTO { editors: ActivityEditorDTO[] }`.
4. Stworzyć service `src/lib/services/activities.service.ts` z funkcjami:
   - `createActivity(supabase, userId, groupId, cmd: ActivityCreateCommand): Promise<ApiResponse<ActivityWithEditorsDTO>>`
   - `listActivities(supabase, userId, groupId, filters: ActivitiesListFilters): Promise<ApiListResponse<ActivityWithEditorsDTO>>`
   - `getActivity(supabase, userId, activityId): Promise<ApiResponse<ActivityWithEditorsDTO>>`
   - `updateActivity(supabase, userId, activityId, cmd: ActivityUpdateCommand): Promise<ApiResponse<ActivityWithEditorsDTO>>`
   - `softDeleteActivity(supabase, userId, activityId): Promise<ApiResponse<{ id: UUID; deleted_at: TimestampISO }>>`
   - `restoreActivity(supabase, userId, activityId): Promise<ApiResponse<ActivityWithEditorsDTO>>`
   Reużywać helpery z `errors.ts` do budowy ApiError.
5. Implementować endpoint `src/pages/api/groups/[group_id]/activities.ts` z obsługą GET i POST (rozróżnienie metod; `export async function GET(ctx)` / `POST`). Włączenie `export const prerender = false`.
6. Implementować endpoint `src/pages/api/activities/[activity_id].ts` z GET, PATCH, DELETE.
7. Implementować endpoint `src/pages/api/activities/[activity_id]/restore.ts` z POST.
8. Dodać walidację: parse `ctx.request.json()` -> Zod, w przypadku błędu zwrot 400 `VALIDATION_ERROR`.
9. Dodać funkcję budującą kursor i parsującą `cursor` (utility w `src/lib/utils.ts` lub nowy `pagination.ts`).
10. Test manualny (curl) dla scenariuszy: create, list (status filter, search, assigned), get, patch (change duration_minutes i status), delete, restore.
11. Uzupełnić README lub `docs` z endpointami (opcjonalne).
12. (Opcjonalne) Dodanie auto edytora: decyzja backlog.
13. (Opcjonalne) Concurrency ETag: backlog.

## 10. Edge Cases & Notatki
- Puste stringi: odrzucone przez walidację – nie zastępować whitespace trim w service (Zod refine z `trim().min(1)`).
- `duration_minutes` = graniczne wartości 5 i 1440 – akceptowane.
- Soft delete + list: upewnić się `eq('deleted_at', null)` lub `is('deleted_at', null)` w builderze.
- `assigned=me` + brak wpisu w `activity_editors`: aktywność wykluczona nawet jeśli autor – zgodnie z MVP.
- Zmiana `status` na `archived` nie blokuje dalszej edycji w MVP (backlog: lock archived).

## 11. Logging
- Przy 500: log `error.stack` (do konsoli / zewnętrzny logger w przyszłości). Nie ujawniać detali DB w odpowiedzi.

## 12. Future Enhancements
- Full-text GIN tsvector na (title, objective).
- RPC do listy z edytorami jednym zapytaniem.
- ETag / If-Match concurrency.
- Audit trail tabelka oddzielna.
- Auto-assign creator jako edytor.
