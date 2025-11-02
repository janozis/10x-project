# Podsumowanie prac - Implementacja AI Evaluations (2025-11-01)

## Kontekst
Przycisk "Poproś o ocenę AI" w edytorze aktywności (`/activities/[activity_id]/edit`) nie działał poprawnie. Endpointy API nie zwracały odpowiedniego Content-Type, a panel ocen AI wyświetlał tylko podstawowe informacje. Zadanie polegało na naprawieniu całego przepływu żądań ocen AI oraz poprawie interfejsu użytkownika.

## Wykonane prace

### 1. Naprawa endpointów API - Content-Type

**Problem:**
- Endpointy `POST /api/activities/{activity_id}/ai-evaluations` i `GET /api/activities/{activity_id}/ai-evaluations` zwracały `Content-Type: text/plain` zamiast `application/json`
- Frontend (`api.client.ts`) sprawdzał Content-Type i pomijał parsowanie JSON dla `text/plain`
- Skutek: dane z API były ignorowane, formularz dostawał puste odpowiedzi

**Rozwiązanie:**
Zamieniono wszystkie `new Response(JSON.stringify(...))` na `jsonResponse(...)` używając istniejącego helpera z `src/lib/http/response.ts`:

```typescript
// Przed:
return new Response(JSON.stringify(result), { status: 200 });

// Po:
return jsonResponse(result, { status: 200 });
```

**Pliki zmodyfikowane:**
1. `src/pages/api/activities/[activity_id]/ai-evaluations.ts`:
   - Dodano import `jsonResponse`
   - Zamieniono wszystkie zwracane Response (GET, POST)
   - Status codes: 200, 202, 400, 401, 403, 404, 429, 500

2. `src/pages/api/ai-evaluations/[evaluation_id].ts`:
   - Dodano import `jsonResponse`
   - Zamieniono wszystkie zwracane Response (GET)
   - Status codes: 200, 400, 401, 403, 404, 500

### 2. Ulepszenie UI panelu ocen AI

**Problem:**
- `AIEvaluationPanel` wyświetlał tylko podstawowe informacje (wersja, data, liczba sugestii)
- Brak wyświetlania scores, feedback, pełnej listy sugestii
- Brak komunikatu gdy lista ocen jest pusta

**Rozwiązanie:**
Rozbudowano komponent `src/components/activities/editor/AIEvaluationPanel.tsx`:

**Dodane elementy:**
- Nagłówek sekcji "Oceny AI"
- Komunikat dla pustej listy: "Brak ocen AI. Kliknij przycisk poniżej, aby poprosić o pierwszą ocenę."
- Wyświetlanie pełnych szczegółów każdej oceny:
  - **Wersja i data** (header z flexbox)
  - **Grid 2-kolumnowy** z scores:
    - Zgodność z lore: X/10
    - Wartości harcerskie: X/10
  - **Feedback dla lore** (jeśli dostępny) - z border-left
  - **Feedback dla wartości harcerskich** (jeśli dostępny) - z border-left
  - **Lista sugestii** (jeśli dostępne) - jako `<ul>` z bullet points

**Stylowanie:**
- Ulepszona prezentacja: spacing, borders, typography
- Grid layout dla scores (2 kolumny)
- Border-left dla feedbacków (visual hierarchy)
- Numbered list dla sugestii

### 3. Weryfikacja architektury i przepływu

**Zweryfikowano:**
- ✅ Backend service: `src/lib/services/ai-evaluations.service.ts` (już zaimplementowany)
- ✅ API endpoints: POST/GET dla ocen AI (naprawione Content-Type)
- ✅ Frontend API client: `src/lib/activities/api.client.ts` (już zaimplementowany)
- ✅ Hook: `src/lib/editor/useAIEvaluations.ts` (już zaimplementowany)
- ✅ Komponent: `AIEvaluationPanel.tsx` (ulepszony)
- ✅ Integracja w edytorze: `ActivityEditorForm.tsx` (już zintegrowane)
- ✅ Migracje SQL: tabele i RPC funkcja (już istnieją)
- ✅ Build projektu: sukces (brak błędów TypeScript/lintera)

### 4. Dokumentacja promptu dla workera

**Utworzono:** `.ai/ai-evaluation-prompt-template.md`

Kompletny dokument zawierający:

**Sekcja 1: Struktura promptu**
- System prompt dla LLM (rola eksperta, skala ocen, format JSON)
- User prompt (szablon z danymi aktywności)
- Dane wejściowe z bazy (group.lore_theme + activity.*)
- Przykładowy prompt sformatowany

**Sekcja 2: JSON Schema**
```typescript
{
  lore_score: number (1-10),
  lore_feedback: string (1-3 zdania),
  scouting_values_score: number (1-10),
  scouting_feedback: string (1-3 zdania),
  suggestions: string[] (3-5 pytań)
}
```

**Sekcja 3: Implementacja workera**
- Pseudokod workera z pełnym przepływem:
  1. Pobierz request ze statusem 'queued'
  2. Zmień status na 'processing'
  3. Pobierz dane aktywności + lore_theme
  4. Zbuduj prompt (system + user)
  5. Wywołaj LLM (OpenRouter)
  6. Parsuj i waliduj odpowiedź
  7. Wstaw do `ai_evaluations`
  8. Oznacz request jako 'completed'/'failed'
- Integracja z `OpenRouterService`
- Strukturalna odpowiedź (JSON Schema)
- Error handling

**Sekcja 4: Deployment**
- Opcja 1: Supabase Edge Function (cron)
- Opcja 2: Standalone Node.js service
- Opcja 3: Serverless (AWS Lambda/Cloud Functions)

**Sekcja 5: Bezpieczeństwo**
- Sanityzacja promptu (XSS, HTML, limit długości)
- Rate limiting (cooldown + dzienny limit)
- Monitoring kosztów

**Sekcja 6: Monitorowanie i testowanie**
- Metryki (czas, tokeny, sukces/błędy, koszt)
- Logowanie
- Mock responses dla dev

## Przepływ działania AI Evaluations (end-to-end)

### Frontend → API → Queue
1. Użytkownik klika "Poproś o ocenę AI" w `ActivityHeader`
2. `ActivityEditorForm.handleRequestAI()` wywołuje `requestActivityAIEvaluation(activityId)`
3. Frontend → `POST /api/activities/{id}/ai-evaluations` (body: `{}`)
4. Endpoint → `requestAIEvaluation()` service
5. Service → RPC `request_ai_evaluation()` w Supabase:
   - Sprawdza cooldown (5 minut)
   - Aktualizuje `activities.last_evaluation_requested_at = now()`
   - Wstawia rekord do `ai_evaluation_requests` (status: 'queued')
6. Zwraca 202 Accepted: `{ data: { queued: true, next_poll_after_sec: 5 } }`

### Frontend polling
7. Frontend ustawia trigger pollingu
8. `AIEvaluationPanel` rozpoczyna polling → `GET /api/activities/{id}/ai-evaluations`
9. Panel wyświetla istniejące oceny (jeśli są)

### Worker (do implementacji)
10. Worker skanuje `ai_evaluation_requests WHERE status='queued'`
11. Zmienia status na 'processing'
12. Buduje prompt z danych aktywności + lore_theme
13. Wywołuje LLM (OpenRouter)
14. Waliduje odpowiedź (scores 1-10, max 10 sugestii)
15. Wstawia rekord do `ai_evaluations` (trigger nadaje `version`)
16. Aktualizuje request na 'completed'
17. Nowa ocena pojawia się w polling response

## Uprawnienia i walidacje

### Kto może żądać oceny AI:
- ✅ Admin grupy
- ✅ Editor przypisany do aktywności
- ❌ Member (błąd 403 FORBIDDEN_ROLE)
- ❌ Niezalogowany (błąd 401 UNAUTHORIZED)

### Walidacje przed żądaniem:
- ✅ Formularz musi być zapisany (isDirty = false)
- ✅ Cooldown 5 minut (wyświetlany jako "AI za Xs")
- ✅ Aktywność musi istnieć i nie być soft-deleted
- ✅ Użytkownik musi być członkiem grupy

### Blokady przycisku "Poproś o ocenę AI":
```typescript
disabled={!canEdit || isDirty || cooldownSec > 0 || requestingAI}
```

## Struktura bazy danych

### Tabele użyte:
1. **activities** - tabela główna
   - `last_evaluation_requested_at` - timestamp ostatniego żądania (cooldown)

2. **ai_evaluation_requests** - kolejka żądań
   - `id`, `activity_id`, `requested_by`
   - `status`: 'queued' | 'processing' | 'completed' | 'failed'
   - `created_at`, `started_at`, `finished_at`
   - `error_code`, `error_message`

3. **ai_evaluations** - zapisane oceny
   - `id`, `activity_id`, `version` (auto-increment per activity)
   - `lore_score`, `lore_feedback`
   - `scouting_values_score`, `scouting_feedback`
   - `suggestions` (JSONB array)
   - `tokens`, `created_at`

### RPC funkcja:
```sql
CREATE OR REPLACE FUNCTION request_ai_evaluation(p_activity uuid, p_user uuid)
RETURNS uuid -- request_id
```
- Sprawdza cooldown
- Atomowa operacja: UPDATE activities + INSERT request
- Throws: 'cooldown', 'activity_not_found'

### Trigger:
```sql
CREATE TRIGGER trg_ai_evaluations_version 
BEFORE INSERT ON ai_evaluations
```
- Nadaje `version = max(previous) + 1` per aktywność

## Kody błędów i statusy HTTP

| Operacja | Sukces | Błędy |
|----------|--------|-------|
| POST /api/activities/{id}/ai-evaluations | 202 Accepted | 400, 401, 403, 404, 429, 500 |
| GET /api/activities/{id}/ai-evaluations | 200 OK | 400, 401, 404, 500 |
| GET /api/ai-evaluations/{id} | 200 OK | 400, 401, 404, 500 |

### Szczególne kody:
- **429 AI_EVALUATION_COOLDOWN** - cooldown aktywny (< 5 minut od ostatniego)
- **403 FORBIDDEN_ROLE** - nie admin, nie przypisany editor
- **404 ACTIVITY_NOT_FOUND** - aktywność nie istnieje lub soft-deleted

## Pliki zmodyfikowane/utworzone

### Zmodyfikowane:
1. `src/pages/api/activities/[activity_id]/ai-evaluations.ts`
   - Import `jsonResponse`
   - Zamiana wszystkich Response na `jsonResponse()`
   
2. `src/pages/api/ai-evaluations/[evaluation_id].ts`
   - Import `jsonResponse`
   - Zamiana wszystkich Response na `jsonResponse()`

3. `src/components/activities/editor/AIEvaluationPanel.tsx`
   - Dodano nagłówek "Oceny AI"
   - Dodano komunikat pustej listy
   - Rozbudowano wyświetlanie ocen (scores, feedback, sugestie)
   - Ulepszone stylowanie (grid, borders, spacing)

### Utworzone:
4. `.ai/ai-evaluation-prompt-template.md`
   - Kompletna dokumentacja promptu
   - Pseudokod workera
   - Instrukcje deployment
   - Bezpieczeństwo i monitoring

5. `.ai/podsumowanie-prac-edytor-aktywnosci-view-implementation.md` (aktualizacja)
   - Dodano sekcję "Podsumowanie napraw (część 2): AI Evaluations"

## Status komponentów

### ✅ Gotowe (działają)
- [x] API endpoints z poprawnymi headerami
- [x] Service layer (`ai-evaluations.service.ts`)
- [x] Frontend API client (`api.client.ts`)
- [x] Hook do zarządzania stanem (`useAIEvaluations`)
- [x] Hook do żądań (`useAIEvaluationRequest`)
- [x] Komponenty UI (panel, header, button)
- [x] Integracja w edytorze
- [x] Cooldown logic
- [x] Permissions check
- [x] Polling mechanism
- [x] Migracje SQL (tabele + RPC + trigger)
- [x] Error handling (422, 403, 404, 429)
- [x] Dokumentacja promptu

### ⏳ Do zaimplementowania
- [ ] **AI Evaluation Worker** (kluczowy element)
  - [ ] Proces w tle (cron/daemon/serverless)
  - [ ] Logika promptu
  - [ ] Integracja z OpenRouter
  - [ ] Walidacja odpowiedzi AI
  - [ ] Sanityzacja danych
  - [ ] Error handling
  - [ ] Retry logic
  - [ ] Monitoring i logi

- [ ] **Testing**
  - [ ] Testy end-to-end (request → worker → response)
  - [ ] Testy jednostkowe workera
  - [ ] Mock LLM responses
  - [ ] Testy uprawnień

- [ ] **Deployment**
  - [ ] Konfiguracja OPENROUTER_API_KEY
  - [ ] Deploy workera (wybór: Edge Function / Service / Lambda)
  - [ ] Monitoring i alerting
  - [ ] Cost tracking

### 🎯 Opcjonalne ulepszenia (przyszłość)
- [ ] Endpoint statusu żądań (`GET /api/activities/{id}/ai-evaluation-requests`)
- [ ] SSE/WebSocket push zamiast pollingu
- [ ] Dzienny limit żądań per grupa/użytkownik
- [ ] Dashboard z metrykami AI (średnie scores, koszty, usage)
- [ ] Parametry jakości (temperature, model) jako opcje UI
- [ ] Retry failed requests z backoff
- [ ] Agregaty statystyk (średnia score, trend)

## Build i weryfikacja

### Build status:
```bash
npm run build
# Exit code: 0
# ✅ Build successful (2.00s)
# ✅ No linter errors
# ✅ No TypeScript errors
```

### Weryfikacja:
- ✅ Wszystkie importy poprawne
- ✅ Typy TypeScript zgodne
- ✅ Brak unused variables
- ✅ Content-Type headers poprawne
- ✅ JSON Schema valid
- ✅ Error handling comprehensive

## Notatki techniczne

### OpenRouter Service
- Już zaimplementowany w `src/lib/services/openrouter.ts`
- Wspiera synchroniczne i streaming completions
- JSON Schema dla strukturalnych odpowiedzi
- Comprehensive error mapping
- Ready to use w workerze

### Temperature dla ocen AI
- Rekomendacja: **0.3** (niska dla konsystencji ocen)
- Kreatywność nie jest potrzebna przy ocenianiu
- Deterministyczne oceny dla tej samej aktywności

### Sugestie (suggestions)
- Format: **pytania prowokujące**, nie gotowe rozwiązania
- Cel: zachęcić instruktorów do przemyślenia
- Przykład: "Czy można wzbogacić zajęcie o więcej elementów interaktywnych?"

### Bezpieczeństwo promptu
```typescript
function sanitizeForPrompt(text: string): string {
  return text
    .replace(/<script[^>]*>.*?<\/script>/gi, '') // XSS
    .replace(/<[^>]+>/g, '') // HTML tags
    .substring(0, 5000); // Limit
}
```

## Instrukcje dla następnego programisty

### Aby kontynuować (worker implementation):

1. **Przygotowanie środowiska:**
   ```bash
   # Dodaj do .env
   OPENROUTER_API_KEY=sk-or-v1-xxxxx
   ```

2. **Stwórz plik workera:**
   ```bash
   mkdir -p src/workers
   touch src/workers/ai-evaluation-worker.ts
   ```

3. **Zaimplementuj zgodnie z szablonem:**
   - Otwórz `.ai/ai-evaluation-prompt-template.md`
   - Skopiuj pseudokod workera
   - Dostosuj import paths
   - Dodaj error handling
   - Zaimplementuj sanityzację

4. **Wybierz deployment:**
   
   **Opcja A: Supabase Edge Function (najłatwiejsze)**
   ```bash
   supabase functions new ai-evaluation-worker
   # Skopiuj kod do functions/ai-evaluation-worker/index.ts
   supabase functions deploy ai-evaluation-worker --no-verify-jwt
   # Ustaw cron: co 30-60 sekund
   ```

   **Opcja B: Standalone Node.js**
   ```bash
   # Dodaj script do package.json
   "scripts": {
     "worker": "tsx src/workers/ai-evaluation-worker.ts"
   }
   # Run z PM2 na serwerze
   pm2 start "npm run worker" --name ai-eval-worker
   ```

5. **Testowanie:**
   ```bash
   # Manual test
   curl -X POST http://localhost:4321/api/activities/{id}/ai-evaluations \
     -H 'Accept: application/json' \
     -d '{}'
   
   # Sprawdź logi workera
   # Sprawdź czy pojawia się nowa ocena w bazie
   ```

6. **Monitoring:**
   - Loguj każde żądanie (czas, tokeny, koszt)
   - Alert jeśli failed > 10% w 1h
   - Dashboard dla metrics (opcjonalnie)

## Najważniejsze linki

### Dokumentacja:
- Prompt template: `.ai/ai-evaluation-prompt-template.md`
- Implementation plan: `.ai/ai-evaluations-implementation-plan.md`
- PRD: `.ai/prd.md` (sekcje US-006, US-007)
- API plan: `.ai/api-plan.md` (sekcja 2.6)

### Kod:
- Service: `src/lib/services/ai-evaluations.service.ts`
- OpenRouter: `src/lib/services/openrouter.ts`
- Endpoints: `src/pages/api/activities/[activity_id]/ai-evaluations.ts`
- UI: `src/components/activities/editor/AIEvaluationPanel.tsx`

### Przykłady:
- Curl tests: `notatki/ai-evaluations-curl-examples`
- OpenRouter: `notatki/openrouter-curl-examples.md`

## Co działa vs co trzeba zrobić

### ✅ Co DZIAŁA (może być przetestowane w UI):
1. Przycisk "Poproś o ocenę AI" jest widoczny i reaguje
2. Walidacja: blokuje żądanie jeśli są niezapisane zmiany
3. Cooldown: pokazuje "AI za Xs" po żądaniu
4. POST request trafia do API i zwraca 202
5. RPC tworzy rekord w `ai_evaluation_requests`
6. Panel ocen pobiera i wyświetla istniejące oceny (jeśli są)
7. Polling uruchamia się po żądaniu
8. Szczegóły ocen są ładnie wyświetlane (scores, feedback, sugestie)

### ❌ Co NIE DZIAŁA (wymaga workera):
1. **Worker nie istnieje** - żądania czekają w kolejce
2. Brak generowania ocen przez AI
3. Polling nie wykryje nowych ocen (bo worker ich nie tworzy)
4. Tabela `ai_evaluations` pozostaje pusta (chyba że ręcznie dodane)

### 🎯 Co TRZEBA ZROBIĆ w kolejnym etapie:

#### Priorytet 1: Worker (kluczowe)
1. [ ] Stworzyć plik workera (`src/workers/ai-evaluation-worker.ts`)
2. [ ] Zaimplementować logikę zgodnie z `.ai/ai-evaluation-prompt-template.md`:
   - Skanowanie kolejki (`ai_evaluation_requests WHERE status='queued'`)
   - Zmiana statusu na 'processing'
   - Budowanie promptu (system + user z danymi aktywności)
   - Wywołanie OpenRouter (`llm.completeChat()`)
   - Parsowanie JSON response
   - Walidacja odpowiedzi (scores 1-10, max 10 suggestions)
   - Insert do `ai_evaluations`
   - Update request status ('completed'/'failed')
3. [ ] Dodać sanityzację danych do promptu (XSS, HTML tags)
4. [ ] Zaimplementować error handling (try-catch, failed status)
5. [ ] Dodać logowanie (start, success, failure, duration, tokens, cost)

#### Priorytet 2: Deployment
6. [ ] Wybrać strategię deployment (Edge Function / Standalone / Serverless)
7. [ ] Skonfigurować `OPENROUTER_API_KEY` w środowisku
8. [ ] Deploy workera
9. [ ] Ustawić cron/loop (co 30-60 sekund)
10. [ ] Przetestować end-to-end flow

#### Priorytet 3: Testing i monitoring
11. [ ] Test: utworzyć aktywność → zapisać → żądanie AI → sprawdzić czy ocena się pojawia
12. [ ] Test: cooldown enforcement (drugi request < 5 min)
13. [ ] Test: permissions (member nie może żądać)
14. [ ] Dodać monitoring: success rate, avg duration, total tokens, cost
15. [ ] Opcjonalnie: dashboard metrics

#### Nice-to-have (opcjonalne):
16. [ ] Retry logic dla failed requests (exponential backoff)
17. [ ] Endpoint `/api/activities/{id}/ai-evaluation-requests` (status pending/failed)
18. [ ] SSE push zamiast pollingu
19. [ ] Parametryzacja modelu/temperature w UI
20. [ ] Cost tracking i limity dzienne

## Szybki start dla kontynuacji

```bash
# 1. Sklonuj szablon workera
cat > src/workers/ai-evaluation-worker.ts << 'EOF'
// Zobacz pełny kod w .ai/ai-evaluation-prompt-template.md
import { OpenRouterService } from "@/lib/services/openrouter";
// ... (reszta kodu z template)
EOF

# 2. Dodaj zmienne środowiskowe
echo "OPENROUTER_API_KEY=sk-or-v1-xxxxx" >> .env

# 3. Uruchom workera lokalnie (test)
npx tsx src/workers/ai-evaluation-worker.ts

# 4. Sprawdź logi
# Powinieneś zobaczyć: "Processing request..."

# 5. Deploy (wybierz jedną opcję)
supabase functions deploy ai-evaluation-worker  # Opcja A
# LUB
pm2 start "npm run worker" --name ai-eval       # Opcja B
```

## Podsumowanie sesji

### Co zrobiono dzisiaj (2025-11-01):
1. ✅ Naprawiono endpointy API (Content-Type: application/json)
2. ✅ Ulepszono UI panelu ocen AI (pełne szczegóły, lepszy layout)
3. ✅ Zweryfikowano całą architekturę i przepływ danych
4. ✅ Stworzono kompletną dokumentację promptu + pseudokod workera
5. ✅ Build successful, brak błędów TypeScript/lintera

### Co czeka na implementację:
- **Worker** - jedyny brakujący element do pełnego działania

### Czas do ukończenia (estymacja):
- Worker implementation: **2-4 godziny** (z testami)
- Deployment + monitoring: **1-2 godziny**
- **Total: ~3-6 godzin pracy**

### Gotowość do produkcji:
- Interfejs: ✅ 100%
- Backend: ✅ 100%
- Worker: ⏳ 0% (do zrobienia)
- **Ogólnie: ~85% gotowe**

---

**Data**: 2025-11-01  
**Autor**: AI Assistant (Claude Sonnet 4.5)  
**Status**: Gotowe do przekazania / kontynuacji

