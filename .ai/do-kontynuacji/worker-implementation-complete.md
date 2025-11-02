# AI Evaluation Worker - Implementacja zakończona (2025-11-01)

## Status: ✅ GOTOWE DO DEPLOYMENT

Worker AI Evaluations został w pełni zaimplementowany i jest gotowy do uruchomienia.

## Co zostało zaimplementowane

### 1. **Plik workera** (`src/workers/ai-evaluation-worker.ts`)

Kompletna implementacja workera z następującymi funkcjami:

#### Główne funkcje:
- `processAIEvaluationRequest(requestId)` - Przetwarza pojedyncze żądanie oceny AI
- `runWorker()` - Główna pętla workera (infinite loop z pollingiem co 10s)
- `sanitizeForPrompt(text)` - Sanityzacja danych wejściowych (XSS, HTML, length limit)
- `validateEvaluation(evaluation)` - Walidacja i korekcja odpowiedzi LLM
- `buildSystemPrompt()` - Generuje system prompt dla LLM
- `buildUserPrompt(activity)` - Generuje user prompt z danymi aktywności
- `markRequestAsFailed(requestId, errorCode, errorMessage)` - Oznacza request jako failed

#### Przepływ przetwarzania:
1. Fetch request z tabeli `ai_evaluation_requests` (status: `queued`)
2. Update status → `processing`
3. Fetch aktywności + `lore_theme` z grupy (JOIN)
4. Build promptu (system + user z danymi aktywności)
5. Sanityzacja danych (XSS, HTML tags, length limits)
6. Wywołanie OpenRouter LLM (Claude 3.5 Sonnet)
7. Parsowanie i walidacja JSON response
8. Insert do `ai_evaluations` (trigger auto-nadaje `version`)
9. Update request status → `completed` lub `failed`

#### Bezpieczeństwo:
- ✅ Sanityzacja XSS (`<script>`, `javascript:`, `on*=`)
- ✅ Usuwanie tagów HTML
- ✅ Limit długości per pole (5000 chars)
- ✅ Walidacja scores (clamping 1-10)
- ✅ Limit sugestii (max 10)
- ✅ Error handling z try-catch
- ✅ Detailed logging

#### Konfiguracja (WORKER_CONFIG):
```typescript
{
  pollIntervalMs: 10000,       // 10 sekund między skanowaniami
  batchSize: 5,                // Max 5 requestów równolegle
  model: "anthropic/claude-3.5-sonnet",
  temperature: 0.3,            // Niska dla konsystencji
  maxTokens: 2000
}
```

### 2. **Skrypt uruchomieniowy** (`package.json`)

Dodano skrypt:
```json
"worker:ai-eval": "tsx src/workers/ai-evaluation-worker.ts"
```

Uruchomienie:
```bash
npm run worker:ai-eval
```

### 3. **Dokumentacja workera** (`src/workers/README.md`)

Kompletna dokumentacja zawierająca:
- Wymagania (zmienne środowiskowe)
- Opcje uruchamiania (lokalnie, PM2, Supabase Edge Function)
- Przepływ działania (10 kroków)
- Bezpieczeństwo i sanityzacja
- Monitorowanie i logi
- Troubleshooting
- Szacunkowe koszty (~$0.50/miesiąc przy 100 ocenach)
- Następne kroki (ulepszenia)

### 4. **Obejście typów TypeScript**

Ponieważ tabela `ai_evaluation_requests` nie jest w wygenerowanych typach Supabase (`database.types.ts`), użyto workaroundów:
- Dodano interface `AIEvaluationRequest` w workerze
- Użyto `(supabaseClient as any)` do dostępu do tabeli
- Dodano `// eslint-disable-next-line @typescript-eslint/no-explicit-any` suppression
- Cast `typedRequest as AIEvaluationRequest` dla type safety

**Notatka**: W przyszłości należy wygenerować typy ponownie po uruchomieniu migracji w Supabase.

## Weryfikacja

### ✅ Build successful
```bash
npm run build
# Exit code: 0
# Build time: 2.29s
```

### ✅ Linter clean
```bash
# No linter errors found
```

### ✅ TypeScript valid (z workaroundami dla missing types)

## Zmienne środowiskowe (WYMAGANE)

Worker wymaga następujących zmiennych w `.env`:

```bash
# OpenRouter API Key (WYMAGANE)
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Supabase (już są w projekcie)
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_KEY=your-anon-key-here
```

**Uwaga**: `.env.example` nie został utworzony (blokada .gitignore), ale dokumentacja w `README.md` zawiera przykłady.

## Pliki utworzone/zmodyfikowane

### Nowe pliki:
1. `src/workers/ai-evaluation-worker.ts` - **Worker (467 linii)**
2. `src/workers/README.md` - **Dokumentacja (kompletna)**

### Zmodyfikowane pliki:
3. `package.json` - Dodano skrypt `worker:ai-eval`

## Jak uruchomić worker

### Opcja 1: Lokalnie (development)
```bash
# 1. Dodaj OPENROUTER_API_KEY do .env
echo "OPENROUTER_API_KEY=sk-or-v1-xxxxx" >> .env

# 2. Uruchom workera
npm run worker:ai-eval

# Worker będzie działał w nieskończonej pętli
# Logi: [AI Eval Worker] 🚀 Starting worker...
```

### Opcja 2: PM2 (produkcja)
```bash
# Instalacja PM2
npm install -g pm2

# Start jako daemon
pm2 start "npm run worker:ai-eval" --name ai-evaluation-worker

# Status
pm2 status

# Logi
pm2 logs ai-evaluation-worker
```

### Opcja 3: Supabase Edge Function (rekomendowane)
```bash
# Przygotuj plik
mkdir -p supabase/functions/ai-evaluation-worker
cp src/workers/ai-evaluation-worker.ts supabase/functions/ai-evaluation-worker/index.ts

# Deploy
supabase functions deploy ai-evaluation-worker --no-verify-jwt

# Ustaw secret
supabase secrets set OPENROUTER_API_KEY=sk-or-v1-xxxxx

# Ustaw cron (co 1 minutę) w Dashboard
```

## Test end-to-end

### Scenariusz testowy:

1. **Uruchom workera**:
   ```bash
   npm run worker:ai-eval
   ```

2. **Utwórz żądanie oceny AI** (w innym terminalu):
   ```bash
   curl -X POST http://localhost:4321/api/activities/{activity_id}/ai-evaluations \
     -H "Cookie: sb-access-token=..." \
     -H "Content-Type: application/json" \
     -d '{}'
   ```

3. **Sprawdź logi workera** (powinny pojawić się w ciągu 10 sekund):
   ```
   [AI Eval Worker] Found 1 pending request(s)
   [AI Eval Worker] Processing request abc123-...
   [AI Eval Worker] ✅ Completed request abc123-... { loreScore: 8, scoutingScore: 9, tokens: 1234 }
   ```

4. **Sprawdź wynik przez API**:
   ```bash
   curl http://localhost:4321/api/activities/{activity_id}/ai-evaluations \
     -H "Cookie: sb-access-token=..."
   ```

5. **Sprawdź w bazie** (opcjonalnie):
   ```sql
   SELECT * FROM ai_evaluations WHERE activity_id = 'xxx' ORDER BY created_at DESC LIMIT 1;
   SELECT * FROM ai_evaluation_requests WHERE status = 'completed' ORDER BY finished_at DESC LIMIT 1;
   ```

## Następne kroki (deployment)

### Priorytet 1: Konfiguracja środowiska
- [ ] Dodać `OPENROUTER_API_KEY` do `.env` (produkcja)
- [ ] Uzyskać klucz API z https://openrouter.ai/keys

### Priorytet 2: Wybór strategii deployment
- [ ] **Opcja A**: PM2 na serwerze (standalone)
- [ ] **Opcja B**: Supabase Edge Function (rekomendowane)
- [ ] **Opcja C**: AWS Lambda / Cloud Functions (przyszłość)

### Priorytet 3: Monitoring
- [ ] Logi workera (już są)
- [ ] Metryki (success rate, duration, tokens, cost)
- [ ] Alert jeśli failed rate > 10% w 1h

### Priorytet 4: Testowanie
- [ ] Test end-to-end (request → worker → response)
- [ ] Test cooldown enforcement (< 5 minut)
- [ ] Test permissions (member nie może żądać)
- [ ] Test błędów LLM (rate limit, auth)

## Znane ograniczenia

1. **Missing types**: Tabela `ai_evaluation_requests` nie jest w `database.types.ts`
   - **Workaround**: Użyto `(supabaseClient as any)` i interface w workerze
   - **TODO**: Wygenerować typy ponownie po uruchomieniu migracji w Supabase

2. **Brak retry logic**: Jeśli request failuje, pozostaje w statusie `failed`
   - **TODO**: Dodać exponential backoff retry dla transient errors

3. **Brak rate limiting per user**: Cooldown tylko per aktywność (5 min)
   - **TODO**: Dodać dzienny limit per grupa/użytkownik

4. **Brak metryki kosztów**: Worker nie śledzi kosztów API
   - **TODO**: Dashboard z metrykami (cost tracking, success rate)

## Estymowany czas do produkcji

| Zadanie | Czas |
|---------|------|
| Konfiguracja OPENROUTER_API_KEY | 5 min |
| Deployment (PM2 lub Edge Function) | 30 min |
| Testowanie end-to-end | 30 min |
| Monitoring setup (opcjonalne) | 1-2h |
| **TOTAL** | **~1-3 godziny** |

## Podsumowanie

### ✅ CO DZIAŁA:
- Worker w pełni zaimplementowany (467 linii)
- Build successful, brak błędów lintera
- Dokumentacja kompletna
- Sanityzacja i walidacja
- Error handling
- Logging

### ⏳ CO TRZEBA ZROBIĆ:
- Dodać `OPENROUTER_API_KEY` do `.env`
- Wybrać strategię deployment i uruchomić workera
- Przetestować end-to-end

### 🎯 GOTOWOŚĆ:
- **Implementacja**: 100% ✅
- **Deployment**: 0% (wymaga konfiguracji)
- **Testing**: 0% (wymaga działającego workera)

---

**Data zakończenia implementacji**: 2025-11-01  
**Autor**: AI Assistant (Claude Sonnet 4.5)  
**Status**: Ready for deployment  
**Następny krok**: Konfiguracja `OPENROUTER_API_KEY` i uruchomienie workera

