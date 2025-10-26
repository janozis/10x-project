# API Endpoint Implementation Plan: AI Evaluations

## 1. Przegląd punktu końcowego
Punkt końcowy dostarcza wersjonowane ewaluacje aktywności generowane przez usługę AI. Zestaw trzech zasobów REST:
- `POST /api/activities/{activity_id}/ai-evaluations` – asynchroniczne zlecenie nowej ewaluacji (admin lub przypisany editor). Zwraca 202 Accepted gdy zadanie umieszczone w kolejce lub już istnieje pending/processing.
- `GET /api/activities/{activity_id}/ai-evaluations` – lista wszystkich wersji ewaluacji danej aktywności (najświeższa pierwsza).
- `GET /api/ai-evaluations/{evaluation_id}` – pobranie pojedynczej ewaluacji po ID.

Wersjonowanie zapewnia trigger w DB (`version = max(previous)+1`). Zdecydowano o modelu asynchronicznym (202 + polling) aby:
- Zachować responsywność UI niezależnie od opóźnień dostawcy AI.
- Umożliwić prosty mechanizm cooldown / rate limiting (5 minut) i kontrolę kosztów.
- Ułatwić rozszerzenie w przyszłości (webhook, SSE, wsparcie retry/backoff, metryki).

## 2. Szczegóły żądania
### 2.1 POST /api/activities/{activity_id}/ai-evaluations
- Metoda: POST
- URL: `/api/activities/{activity_id}/ai-evaluations`
- Parametry Path: `activity_id: UUID (wymagany)`
- Query: (brak w MVP; możliwość rozszerzenia np. `priority` / `draft=true` w przyszłości)
- Body: pusty (Command model: `AIEvaluationRequestCommand = {}`); jeśli klient prześle body ≠ `{}` => 400.
- Headers: standardowe (Auth – Supabase JWT / cookies via `ctx.locals.user`). Brak dodatkowych.

### 2.2 GET /api/activities/{activity_id}/ai-evaluations
- Metoda: GET
- URL: `/api/activities/{activity_id}/ai-evaluations`
- Parametry Path: `activity_id: UUID (wymagany)`
- Query: opcjonalnie przyszłościowo `limit`, `cursor` (MVP: brak paginacji – mały wolumen).

### 2.3 GET /api/ai-evaluations/{evaluation_id}
- Metoda: GET
- URL: `/api/ai-evaluations/{evaluation_id}`
- Parametry Path: `evaluation_id: UUID (wymagany)`
- Query: brak

### 2.4 Wymagane / opcjonalne parametry podsumowanie
- Wymagane: `activity_id` (POST/GET list), `evaluation_id` (GET single)
- Opcjonalne: brak w MVP

### 2.5 Walidacja wejścia
- UUID format (funkcja `isUuid` lub zod `z.string().uuid()`).
- Autoryzacja: użytkownik musi być członkiem grupy aktywności. Role: admin lub assigned editor aby zlecić ewaluację.
- Cooldown: min. 5 minut od `activities.last_evaluation_requested_at` – weryfikacja w service zanim utworzymy request; jeśli naruszenie ⇒ 429 + `AI_EVALUATION_COOLDOWN`.

## 3. Wykorzystywane typy
### DTO
- `AIEvaluationDTO` (z `types.ts`): projekcja kolumn + `suggestions: string[]`.
- List envelope: `ApiList<AIEvaluationDTO>`.
- Single envelope: `ApiSingle<AIEvaluationDTO>`.

### Command Models
- `AIEvaluationRequestCommand` (puste body).

### Nowe typy (proponowane)
Dodanie nowych typów do `types.ts` (opcjonalne jeśli wdrażamy kolejkę):
```ts
export type AIEvaluationRequestStatus = 'queued' | 'processing' | 'completed' | 'failed';
export interface AIEvaluationRequestDTO {
  id: UUID;
  activity_id: UUID;
  status: AIEvaluationRequestStatus;
  created_at: TimestampISO;
  started_at: TimestampISO | null;
  finished_at: TimestampISO | null;
  error_code?: ApiErrorCode | null;
}
```
(Endpoint MVP nie eksponeuje jeszcze requestów – przygotowanie pod przyszły status endpoint.)

## 4. Szczegóły odpowiedzi
### 4.1 POST (202)
```json
{
  "data": {
    "queued": true,
    "next_poll_after_sec": 5
  }
}
```
Statusy alternatywne:
- 429 gdy cooldown aktywny (`{ error: { code: "AI_EVALUATION_COOLDOWN", message: "..." } }`).
- 401 gdy brak autentykacji.
- 403 gdy rola niewystarczająca.
- 404 gdy aktywność nie istnieje / soft-deleted.
- 500 gdy błąd serwera.

### 4.2 GET list (200)
```json
{
  "data": [AIEvaluationDTO, ...]
}
```
Pusta lista: `data: []`. Możliwość dodania w przyszłości `nextCursor`.

### 4.3 GET single (200)
```json
{ "data": AIEvaluationDTO }
```
Błędy: 404 (nie znaleziono / brak dostępu do grupy), 401, 500.

## 5. Przepływ danych
1. Klient wywołuje POST.
2. Service `requestAIEvaluation()`:
   - Waliduje UUID.
   - Pobiera `activity` (select id, group_id, last_evaluation_requested_at, deleted_at).
   - Sprawdza membership i rolę (join przez `group_memberships` lub widok `user_group_permissions`).
   - Sprawdza cooldown (>=5 minut od `last_evaluation_requested_at`).
   - Jeśli ok: zapis w tabeli kolejki `ai_evaluation_requests` (nowa tabela) ze statusem `queued` + aktualizacja pola `last_evaluation_requested_at = now()` (atomowo w transakcji / RPC / row-level lock w Supabase ograniczony – więc: zaczynamy od update, potem insert; ryzyko race → zaakceptowane w MVP, docelowo użycie `SELECT ... FOR UPDATE` przez RPC).
   - Zwraca 202.
3. Worker (zewnętrzny proces / edge function cron / background queue) odbiera pending rekordy:
   - Ustawia `processing`, wypełnia prompt, wywołuje dostawcę AI (OpenAI / gemini etc.).
   - Waliduje odpowiedź (range score 1..10, length suggestions <=10, typy tekstowe).
   - Wstawia rekord do `ai_evaluations` (trigger nadaje `version`).
   - Aktualizuje request `completed` lub `failed` (z `error_code`).
4. Klient polluje GET list – pojawia się nowa wersja.
5. Klient może pobrać konkretną wersję GET single.

## 6. Względy bezpieczeństwa
- Autentykacja: `ctx.locals.user` (Supabase) – jeśli brak, 401.
- Autoryzacja: tylko członkowie grupy mogą czytać listę/pojedyncze; tylko admin lub editor przypisany do aktywności może zlecić POST.
- RLS w tabelach `activities`, `ai_evaluations` już uwzględnia membership – service powtarza logikę dla spójnych błędów semantycznych.
- Ochrona przed masowym nadużyciem: cooldown + (opcjonalnie) dzienny limit per użytkownik/grupa – wzmianka w rozszerzeniach.
- Walidacja sugestii – generowane przez serwer; przy insert sprawdzamy typ JSON (array stringów). Nie ufamy klientowi (brak body).
- Prompt Injection / Data Exfiltration: sanitizacja promptu (strip HTML, limit długości fields). (Out-of-scope kod – uwzględnić w workerze.)
- Rate limiting globalny (np. edge middleware) – plan rozszerzenia.
- Brak ujawniania internal IDs poza UUID (bez auto-increment). Chroni przed enumeracją.

## 7. Obsługa błędów
| Scenariusz | Kod | Error Code | Uwagi |
|------------|-----|------------|-------|
| Nieprawidłowy UUID | 400 | VALIDATION_ERROR | Path param regex fail |
| Brak auth | 401 | UNAUTHORIZED | `ctx.locals.user` null |
| Brak membership | 401 / 404 | UNAUTHORIZED / NOT_FOUND | Prefer 401 gdy brak usera; 404 gdy activity nie istnieje; jeśli activity istnieje ale brak członkostwa – 404 (maskowanie) lub 403 (ujawnienie). Rekomendacja: 404 maskujące. |
| Rola niewystarczająca (POST) | 403 | FORBIDDEN_ROLE | Admin lub assigned editor wymagany |
| Cooldown aktywny | 429 | AI_EVALUATION_COOLDOWN | `now() - last_evaluation_requested_at < 5 min` |
| Aktywność usunięta | 404 | ACTIVITY_NOT_FOUND | Soft delete check |
| Błąd AI provider | 500 | INTERNAL_ERROR | Worker konwertuje; request status=failed |
| Walidacja odpowiedzi AI (np. score out of range) | 500 | INTERNAL_ERROR | Worker log + sanitizacja |
| Conflict (race cooldown) | 409 | CONFLICT | Rzadkie – jednoczesne POST; opcjonalne mapowanie do 429 |

Mapowanie w kodzie endpointu przez funkcję `mapAIEvaluationErrorToStatus(code)`.

## 8. Rozważania dotyczące wydajności
- Indeksy: już planowane `idx_ai_evaluations_activity(activity_id)` i `(activity_id, created_at DESC)`. Zapewnia szybkie listowanie.
- Brak paginacji w MVP – mały wolumen per aktywność (<100). Wzrost → dodać `limit` + `cursor` (sort po created_at DESC + id). Format kursora analogiczny do aktywności.
- Worker backpressure: limit równoległych zapytań do AI (konfiguracja). Retry z exponential backoff (np. max 2). Failed request nie tworzy wersji.
- Minimalizacja payloadu: list endpoint nie zwraca pól `created_by`, `tokens` jeśli opcjonalne? (Spec mówi aby zwrócić tokens – zachowujemy). Możliwość lazy load szczegółów w single GET jeśli dane ciężkie (np. długie feedbacki). W MVP pełne rekordy.
- Przy dużym obciążeniu: możliwość materializowania agregatu statystyk dla UI (np. latest evaluation) – poza zakresem.

## 9. Etapy wdrożenia
1. Migracja DB: utworzyć tabelę `ai_evaluation_requests`:
   ```sql
   CREATE TABLE ai_evaluation_requests (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     activity_id uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
     requested_by uuid NOT NULL REFERENCES auth.users(id),
     status text NOT NULL CHECK (status IN ('queued','processing','completed','failed')) DEFAULT 'queued',
     error_code text NULL,
     error_message text NULL,
     created_at timestamptz NOT NULL DEFAULT now(),
     started_at timestamptz NULL,
     finished_at timestamptz NULL
   );
   CREATE INDEX idx_ai_eval_req_activity_status ON ai_evaluation_requests(activity_id, status);
   ```
   (Opcjonalnie: unikalność na `(activity_id, status)` gdzie status IN ('queued','processing') aby zapobiec duplikatom – lub logicznie w workerze.)
2. Dodać nowe error factory w `src/lib/errors.ts`:
   ```ts
   aiEvaluationCooldown: () => make('AI_EVALUATION_COOLDOWN','AI evaluation cooldown active'),
   ```
3. Typ rozszerzeń: dodać `AIEvaluationRequestDTO` jeśli planujemy rozszerzenie status endpointu.
4. Service: utworzyć plik `src/lib/services/ai-evaluations.service.ts` z funkcjami:
   - `requestAIEvaluation(supabase, userId, activityId): ApiResponse<{ queued: true; next_poll_after_sec: number }>`
     - Fetch activity (id, group_id, last_evaluation_requested_at, deleted_at)
     - Validate membership & role (admin OR (editor assigned))
     - Cooldown check (5 min) – jeśli fail → return aiEvaluationCooldown error
     - Insert row w `ai_evaluation_requests` + update `activities.last_evaluation_requested_at = now()` (transakcja lub sekwencja; w Supabase JS brak natywnej transakcji – rozważyć RPC `request_ai_evaluation()` w SQL dla atomowości):
       ```sql
       CREATE OR REPLACE FUNCTION request_ai_evaluation(p_activity uuid, p_user uuid)
       RETURNS uuid LANGUAGE plpgsql AS $$
       DECLARE v_id uuid; v_last timestamptz; BEGIN
         SELECT last_evaluation_requested_at INTO v_last FROM activities WHERE id = p_activity;
         IF v_last IS NOT NULL AND v_last > now() - interval '5 minutes' THEN
           RAISE EXCEPTION 'cooldown';
         END IF;
         UPDATE activities SET last_evaluation_requested_at = now() WHERE id = p_activity;
         INSERT INTO ai_evaluation_requests(activity_id, requested_by) VALUES(p_activity, p_user) RETURNING id INTO v_id;
         RETURN v_id; END; $$;
       ```
       Supabase RPC wywołanie – przechwycić error `cooldown` → AI_EVALUATION_COOLDOWN.
   - `listAIEvaluations(supabase, userId, activityId): ApiListResponse<AIEvaluationDTO>` (select * from `ai_evaluations` WHERE activity_id = ? ORDER BY created_at DESC)
   - `getAIEvaluation(supabase, userId, evaluationId): ApiResponse<AIEvaluationDTO>` (lookup + membership check via join activities->group_id).
5. Mapper: nowy `mapAIEvaluationRow(row)` w `src/lib/mappers/ai-evaluation.mapper.ts` – konwersja `suggestions` JSONB do `string[]` (walidacja: jeśli nie tablica → pusty array lub sanitizowany).
6. Validation: plik `src/lib/validation/aiEvaluation.ts` z:
   - `isUuid` reuse (lub import), brak body schema.
7. Endpointy Astro:
   - `src/pages/api/activities/[activity_id]/ai-evaluations.ts` (GET list, POST request). Status mapping:
     - POST success: 202
     - List success: 200
     - Error: map codes (UNAUTHORIZED→401, FORBIDDEN_ROLE→403, ACTIVITY_NOT_FOUND / NOT_FOUND→404, AI_EVALUATION_COOLDOWN→429, VALIDATION_ERROR→400, INTERNAL_ERROR→500)
   - `src/pages/api/ai-evaluations/[evaluation_id].ts` (GET single). Status mapping analogicznie (NOT_FOUND→404 etc.).
8. Worker / background job (poza repo API endpointów – dokumentacja):
   - Skrypt periodyczny (cron) lub edge function skanuje `ai_evaluation_requests WHERE status='queued'`.
   - Zmiana statusu na `processing`, zapis `started_at`.
   - Pobiera dane aktywności (title, objective, tasks, lore_theme, summary...) buduje prompt.
   - Wywołuje dostawcę AI (timeout np. 30s).
   - Na sukces: walidacja odpowiedzi; insert do `ai_evaluations`; update request `completed`, `finished_at`.
   - Na fail: update request `failed`, zapisz `error_code='INTERNAL_ERROR'` + `error_message`.
9. Testy jednostkowe (propozycja – w przyszłości):
   - Cooldown enforcement (second request <5min → 429)
   - Role enforcement (member → 403 na POST)
   - List visibility (member sees evaluations)
   - Worker integration (mock AI → version increments).
10. Dokumentacja README sekcja API – dodać opis polling + przykłady curl.
11. Monitoring i logi: w workerze logować czas generacji, liczbę tokenów, ewentualne błędy; w przyszłości metryki do dashboardu.

## 10. Edge Cases & Decyzje
- Race: dwa równoległe POST tuż przed update `last_evaluation_requested_at`: możliwy duet requestów → oba queued. Akceptowalne w MVP (podwójny koszt). W przyszłości: transakcyjny RPC z blokadą.
- Brak wyników AI (np. provider empty): fallback `lore_score=5`, `scouting_values_score=5`, feedback = "No feedback generated" – polityka sanitizacji (konfigurowalna w workerze).
- Sugestie >10: przycięcie do 10 przed insert; worker zapewnia.
- GET single dla ewaluacji z innej grupy: RLS ukryje, service zwróci 404 maskujące.
- Tokeny mogą być null – DTO zachowuje null.

## 11. Mapowanie kodów statusu (podsumowanie)
| Operacja | Sukces | Główne błędy |
|----------|--------|-------------|
| POST request | 202 | 400,401,403,404,429,500 |
| GET list | 200 | 400,401,404,500 |
| GET single | 200 | 400,401,404,500 |

(409 możliwy przy konflikcie transakcji – aktualnie mało prawdopodobny; jeśli wystąpi może być zmapowany do 429 albo 409.)

## 12. Przyszłe rozszerzenia
- Endpoint statusu `/api/activities/{activity_id}/ai-evaluation-requests` (lista pending/failed).
- SSE/WebSocket push nowej wersji zamiast pollingu.
- Parametry jakości (temperature, model) – body lub query z walidacją & role restrictions.
- Agregat statystyk ocen (średnia lore_score, trend). Materialized view.
- Retry polityka konfigurowalna (max attempts).

---
Plan gotowy do implementacji; kolejne kroki: migracja, service, endpointy, worker.
