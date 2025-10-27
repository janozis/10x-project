# API Endpoint Implementation Plan: Group Tasks

## 1. Przegląd punktu końcowego
Zestaw endpointów do zarządzania zadaniami grupy (`group_tasks`). Zadania mogą być opcjonalnie powiązane z aktywnością (`activity_id`). Funkcjonalność obejmuje:
- Tworzenie zadania w kontekście grupy
- Listowanie z filtrowaniem po `status` oraz `activity_id`
- Pobieranie pojedynczego zadania po `task_id`
- Cząstkową aktualizację właściwości (PATCH)
- Usunięcie zadania (hard delete) lub opcjonalnie przyszłe miękkie kasowanie (na razie fizyczne)

Model bezpieczeństwa: dostęp tylko dla członków grupy (dowolna rola) do odczytu; modyfikacja dla ról `admin` lub `editor`. Rola `member` ma wyłącznie odczyt. Wersja MVP nie obsługuje przypisywania użytkowników do zadań ani dodatkowych reguł workflow.

## 2. Szczegóły żądania
### 2.1 POST /api/groups/{group_id}/tasks
Tworzy nowe zadanie w grupie.
- Wymagane Path Param: `group_id: UUID`
- Body (JSON):
  - `title: string` (trimmed, 1..200)
  - `description: string` (trimmed, 1..4000)
  - `due_date: YYYY-MM-DD | null` (opcjonalne; jeśli obecne walidujemy format; rozważamy przyszłe sprawdzenie zakresu dat w obrębie obozu)
  - `activity_id: UUID | null` (opcjonalne; jeśli podane – musi istnieć i należeć do tej samej grupy)
- Generowane przez backend: `status` = `pending` (domyślna), `created_by`, `updated_by`.

### 2.2 GET /api/groups/{group_id}/tasks
Lista zadań dla grupy z filtrami.
- Path Param: `group_id: UUID`
- Query Params (opcjonalne):
  - `status=pending|in_progress|done|canceled`
  - `activity_id=UUID` (tylko zadania powiązane z daną aktywnością)
  - `limit` (int 1..100; domyślnie 20)
  - `cursor` (opaque string – implementacja kursora opartego o `(created_at,id)` jak w `activities.service.ts`)
- Brak body.

### 2.3 GET /api/tasks/{task_id}
Szczegóły pojedynczego zadania.
- Path Param: `task_id: UUID`
- Brak body.

### 2.4 PATCH /api/tasks/{task_id}
Cząstkowa aktualizacja zadania.
- Path Param: `task_id: UUID`
- Body (co najmniej jedno pole):
  - `title?: string`
  - `description?: string`
  - `due_date?: YYYY-MM-DD | null`
  - `status?: pending|in_progress|done|canceled` (dowolna zmiana dozwolona; idempotentna jeśli identyczna)
  - `activity_id?: UUID | null` (zmiana powiązania; null usuwa powiązanie)
- Wszystkie pola opcjonalne, ale przynajmniej jedno musi być obecne (walidacja).

### 2.5 DELETE /api/tasks/{task_id}
Usuwa zadanie.
- Path Param: `task_id: UUID`
- Brak body.
- Odpowiedź: 200 wraz z `{ id }` lub 404 jeśli nie istnieje / brak dostępu.

## 3. Wykorzystywane typy
Z pliku `types.ts`:
- `GroupTaskDTO`
- `GroupTaskCreateCommand`
- `GroupTaskUpdateCommand`
- `UUID`, `TimestampISO`, `ApiResponse<T>`, `ApiListResponse<T>`

Nowe / rozszerzone:
- Dodanie fabryki błędu `taskNotFound() => code TASK_NOT_FOUND` do `errors.ts` (używane dla tego zasobu; alternatywnie reuse `errors.notFound('Task')` lecz spec wymaga dedykowanego kodu).
- Interfejs filtrów: `GroupTasksListFilters { status?: string; activity_id?: string; limit?: number; cursor?: string; }`
- Typ kursora: kodowany Base64 JSON `{ created_at: string; id: string }` (jak analog `parseActivityCursor`).

## 4. Szczegóły odpowiedzi
Standardowe envelope:
- Sukces pojedynczy: `200` / `201` => `{ data: GroupTaskDTO }`
- Lista: `200` => `{ data: GroupTaskDTO[]; nextCursor?: string; count?: number }`
- Błędy: `{ error: { code: ApiErrorCode; message: string; details?: Record<string,unknown> } }`

Statusy HTTP:
- 201: poprawne utworzenie (POST)
- 200: poprawny odczyt / aktualizacja / usunięcie / lista
- 400: walidacja (VALIDATION_ERROR) lub niespójny stan wejścia (BAD_REQUEST)
- 401: brak członkostwa (UNAUTHORIZED) – gdy użytkownik nie jest członkiem grupy (lub brak uwierzytelnienia) 
- 403: rola niedozwolona (FORBIDDEN_ROLE)
- 404: TASK_NOT_FOUND (lub Group masked as NOT_FOUND przy listowaniu gdy brak członkostwa? Decyzja: zachowujemy spójność z membership: brak członkostwa => UNAUTHORIZED)
- 500: INTERNAL_ERROR

## 5. Przepływ danych
### 5.1 Tworzenie
1. Middleware pobiera `supabase` i `authUserId` (obecna konwencja: `context.locals.supabase`, tymczasowo fallback do `DEFAULT_USER_ID`).
2. Walidacja `group_id` (UUID) + body zod (`groupTaskCreateSchema`).
3. Sprawdzenie członkostwa poprzez `user_group_permissions` (view) jak w `activities.service.ts`.
4. Rola: must be `admin` lub `editor`.
5. Jeśli `activity_id` podane: SELECT `activities.id, group_id` -> musi należeć do tej samej grupy; w przeciwnym razie 400 (BAD_REQUEST) z `details.activity_id = 'mismatched_group'` lub TASK_NOT_FOUND jeśli aktywność nie istnieje. (Preferujemy BAD_REQUEST dla mismatched, NOT_FOUND dla nieistniejącej aktywności.)
6. INSERT do `group_tasks` z ustawieniem `status='pending'`, polami audytowymi `created_by`, `updated_by`.
7. SELECT wstawionego wiersza -> mapowanie do DTO.
8. Odpowiedź 201.

### 5.2 Listowanie
1. Walidacja `group_id`, filtrów (status enumeration, activity_id UUID).
2. Sprawdzenie członkostwa (jak wyżej): brak => 401.
3. Budowa zapytania: `FROM group_tasks WHERE group_id = :group_id`.
4. Opcjonalne filtry: `status`, `activity_id`.
5. Paginacja: jeśli `cursor` -> dekoduj -> w zapytaniu warunek: `(created_at < cursor.created_at) OR (created_at = cursor.created_at AND id < cursor.id)`; sortowanie DESC po `created_at, id`; `limit`.
6. Pobranie wyników i zbudowanie `nextCursor` jeśli count == limit.
7. Odpowiedź 200 lista.

### 5.3 Pobranie pojedynczego
1. Walidacja `task_id` (UUID).
2. SELECT wiersz; jeśli brak -> 404 TASK_NOT_FOUND.
3. Sprawdzenie członkostwa w grupie `row.group_id`; brak -> 401.
4. Mapowanie -> DTO -> 200.

### 5.4 Aktualizacja (PATCH)
1. Walidacja `task_id`, body (`groupTaskUpdateSchema`).
2. SELECT zadanie; brak -> 404.
3. Sprawdzenie członkostwa i roli (admin/editor). Jeśli `member` -> 403.
4. Jeśli `activity_id` w PATCH:
   - `null` => ustawienie `activity_id = null`.
   - UUID => walidacja istnienia i spójności grupy.
5. Budowa `updatePayload`: tylko pola obecne + `updated_by`.
6. UPDATE + RETURNING.
7. 200 + DTO.
Idempotencja: jeśli żaden whitelisted field nie zmienia wartości -> nadal 200 zwracając bieżący stan.

### 5.5 Usunięcie
1. Walidacja `task_id`.
2. SELECT wiersz -> brak => 404.
3. Sprawdzenie członkostwa i roli (admin/editor). Inni -> 403.
4. DELETE (fizyczny). Przyszłość: soft delete (dodanie `deleted_at`).
5. 200 -> `{ data: { id } }`.

## 6. Względy bezpieczeństwa
- Autoryzacja oparta o widok `user_group_permissions` (redukuje liczbę zapytań w porównaniu z joinkami na membership).
- RLS na `group_tasks` w bazie (wymagane polityki — do dodania: SELECT, INSERT, UPDATE, DELETE analogicznie do `activities`). Defense in depth: kod weryfikuje role przed wykonaniem operacji.
- Walidacja UUID zapobiega prostym błędom / potencjalnym injection w dynamicznych sekwencjach zapytań.
- Ograniczenia długości pól tekstowych chronią przed nadmiernym obciążeniem / log injection.
- Unikanie ujawniania czy zasób istnieje poza kontekstem uprawnionego (401 vs 404) – decyzja: preferowana jasna semantyka: brak członkostwa => 401, brak wiersza => 404.
- Ochrona przed IDOR: każda operacja weryfikuje `group_id` powiązany z zadaniem a następnie członkostwo.
- Zapobieganie masowym aktualizacjom: PATCH ogranicza do whitelisted pól.

## 7. Obsługa błędów
Potencjalne scenariusze:
| Scenariusz | Kod HTTP | ApiErrorCode | Uwagi |
|------------|----------|--------------|-------|
| Niepoprawny UUID path param | 400 | VALIDATION_ERROR | details: { task_id/group_id: 'invalid uuid' } |
| Body nie przechodzi walidacji | 400 | VALIDATION_ERROR | Zod flatten -> fieldErrors |
| Brak uwierzytelnienia / członkostwa | 401 | UNAUTHORIZED | Spójne z istniejącymi services |
| Rola niewystarczająca (member próbuje modyfikować) | 403 | FORBIDDEN_ROLE | |
| Zadanie nie istnieje | 404 | TASK_NOT_FOUND | Dedykowana fabryka błędu |
| Aktywność wskazana w activity_id nie istnieje | 400 | BAD_REQUEST | details.activity_id = 'not_found' |
| Aktywność należy do innej grupy | 400 | BAD_REQUEST | details.activity_id = 'mismatched_group' |
| Limit przekroczony (przyszłe) | 429 | RATE_LIMIT_EXCEEDED | Nie implementujemy teraz |
| Błąd DB (insert/update/delete) | 500 | INTERNAL_ERROR | message ogólny lub uproszczony |

Logowanie: w DEV można dodać `diagnostics` (jak w membership service) – nie w PROD. Przyszłość: tabela `api_errors` lub zewnętrzny monitoring.

## 8. Rozważania dotyczące wydajności
- Indeks sugerowany istnieje: `idx_group_tasks_group_status (group_id,status)` oraz `idx_group_tasks_activity`. Filtry wykorzystają je.
- Paginacja kursorem minimalizuje koszty przy dużych listach (sort DESC po `created_at` + `id`).
- Redukcja liczby zapytań: przy listowaniu nie potrzebujemy dodatkowych joinów (DTO nie zawiera zagnieżdżonych struktur).
- Potencjalne N+1 brak, bo brak dodatkowych relacji; weryfikacja `activity_id` pojedyncza.
- Można dodać head query do liczenia w przyszłości (tu count zwracamy jako length page; pełny total opcjonalny).

## 9. Etapy wdrożenia
1. Dodaj fabrykę błędu w `src/lib/errors.ts`: `taskNotFound: () => make("TASK_NOT_FOUND", "Task not found")`.
2. Utwórz plik walidacji `src/lib/validation/groupTask.ts`:
   - `groupTaskCreateSchema`
   - `groupTaskUpdateSchema` (co najmniej jedno pole; refine + enumeracje statusu)
3. Utwórz mapper `src/lib/mappers/group-task.mapper.ts` funkcja `mapGroupTaskRow(row): GroupTaskDTO`.
4. Utwórz service `src/lib/services/group-tasks.service.ts` z funkcjami:
   - `createGroupTask(supabase, userId, groupId, input)`
   - `listGroupTasks(supabase, userId, groupId, filters)`
   - `getGroupTask(supabase, userId, taskId)`
   - `updateGroupTask(supabase, userId, taskId, input)`
   - `deleteGroupTask(supabase, userId, taskId)`
   Wzorce: wykorzystaj analogie do `activities.service.ts` (perms fetch, effectiveUserId, internal(), unauthorized(), forbidden(), notFound()).
5. Implementuj pomocnicze: `parseGroupTaskCursor`, `nextGroupTaskCursorFromPage` w `src/lib/utils.ts` lub dedykowany plik jeśli chcemy separację.
6. Dodaj endpoint `src/pages/api/groups/[group_id]/tasks.ts`:
   - `export async function GET(context)` -> parsowanie filtrów, wywołanie `listGroupTasks`, mapowanie kodu statusu (error -> status mapping) + zwrot `json`.
   - `export async function POST(context)` -> body JSON, walidacja, wywołanie `createGroupTask`, odpowiedź 201.
   - `export const prerender = false`.
7. Dodaj endpoint `src/pages/api/tasks/[task_id].ts`:
   - `GET` -> `getGroupTask`
   - `PATCH` -> `updateGroupTask`
   - `DELETE` -> `deleteGroupTask`
   - Kod statusu: 200 wszystkie, 404 mapowane dla `TASK_NOT_FOUND`.
8. Ujednolić mapowanie błędów (utility) jeśli powtarzalne: stworzyć helper `respond(apiResponse)` w wspólnym module (opcjonalnie).
9. Dodać testy manualne (curl examples) w katalogu `notatki/group-tasks-curl-examples` (opcjonalne).
10. Zaktualizować dokumentację `/README.md` sekcja API z nowymi trasami.
11. (Opcjonalnie) Dodać polityki RLS w migracji SQL jeśli nie istnieją dla `group_tasks`.
12. Code review: sprawdzić spójność stylu (early returns, brak zbędnych `else`).
13. Monitoring w DEV: dodać console.debug dla krytycznych błędów przy insert/update (do usunięcia w PROD).

## 10. Walidacja danych (szczegóły schematów)
Przykładowe definicje zod (do implementacji):
```ts
const STATUS_ENUM = ["pending","in_progress","done","canceled"] as const;
export const groupTaskCreateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(4000),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  activity_id: z.string().uuid().optional().nullable(),
});

export const groupTaskUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().min(1).max(4000).optional(),
    due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    status: z.enum(STATUS_ENUM).optional(),
    activity_id: z.string().uuid().optional().nullable(),
  })
  .refine((val) => Object.keys(val).length > 0, { message: "At least one field required" });
```

## 11. Edge Cases
- `activity_id` wskazuje na aktywność z innej grupy → 400 BAD_REQUEST.
- `due_date` w przeszłości: (brak wymogu w MVP) – akceptujemy; przyszłe reguły mogą wymagać.
- Pusta lista (brak zadań) → 200 `{ data: [] }` bez `nextCursor`.
- PATCH z niezmienionymi polami → 200 aktualny DTO (idempotencja).
- Usunięcie istniejącego zadania z którym powiązane jest inne przyszłe zasoby (brak zależności) → OK.

## 12. Mapowanie kodów błędów na HTTP (helper)
Pseudo:
```ts
function httpStatusFor(errorCode: ApiErrorCode): number {
  switch(errorCode) {
    case 'VALIDATION_ERROR': return 400;
    case 'BAD_REQUEST': return 400;
    case 'UNAUTHORIZED': return 401;
    case 'FORBIDDEN_ROLE': return 403;
    case 'TASK_NOT_FOUND': return 404;
    case 'NOT_FOUND': return 404; // fallback
    case 'CONFLICT': return 409;
    case 'RATE_LIMIT_EXCEEDED': return 429;
    default: return 500;
  }
}
```

## 13. Konsekwencje przyszłego rozszerzenia
- Soft delete: dodanie `deleted_at` kolumny i aktualizacja filtrów.
- Przypisania użytkowników do zadań: nowa tabela `group_task_assignees` + filtry `assigned=me`.
- Wymuszenie reguł statusu (np. `done` tylko jeśli wszystkie subtasks wykonane) – wymaga workflow engine.
- Indeksowanie po `due_date` dla sortowania backlogu.

---
Gotowy plan prowadzi implementację z minimalnym ryzykiem regresji i spójnością z istniejącymi wzorcami kodu.
