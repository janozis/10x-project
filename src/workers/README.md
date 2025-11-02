# AI Evaluation Worker - Dokumentacja

## Przegląd

Worker jest procesem w tle, który przetwarza żądania ocen AI dla aktywności harcerskich. Skanuje tabelę `ai_evaluation_requests` w poszukiwaniu statusu `queued`, wysyła dane do OpenRouter LLM (Claude 3.5 Sonnet), a następnie zapisuje wyniki w tabeli `ai_evaluations`.

## Wymagania

### Zmienne środowiskowe

Dodaj do pliku `.env`:

```bash
# OpenRouter API Key (WYMAGANE)
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Supabase (jeśli nie są już ustawione)
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_KEY=your-anon-key-here
```

Klucz API możesz uzyskać z: https://openrouter.ai/keys

### Instalacja zależności

Worker używa już zainstalowanych zależności projektu:
- `@supabase/supabase-js` - klient bazy danych
- `OpenRouterService` - serwis LLM (własna implementacja)

Brak dodatkowych pakietów do zainstalowania.

## Uruchamianie

### Opcja 1: Lokalnie (development)

```bash
# Uruchom workera w trybie deweloperskim
npm run worker:ai-eval
```

Worker będzie działał w nieskończonej pętli, skanując kolejkę co 10 sekund.

### Opcja 2: PM2 (produkcja - standalone)

```bash
# Instalacja PM2 (jeśli nie masz)
npm install -g pm2

# Uruchom jako daemon
pm2 start "npm run worker:ai-eval" --name ai-evaluation-worker

# Sprawdź status
pm2 status

# Sprawdź logi
pm2 logs ai-evaluation-worker

# Restart
pm2 restart ai-evaluation-worker

# Stop
pm2 stop ai-evaluation-worker
```

### Opcja 3: Supabase Edge Function (rekomendowane)

```bash
# Przygotuj plik funkcji
mkdir -p supabase/functions/ai-evaluation-worker
cp src/workers/ai-evaluation-worker.ts supabase/functions/ai-evaluation-worker/index.ts

# Deploy
supabase functions deploy ai-evaluation-worker --no-verify-jwt

# Ustaw zmienną środowiskową
supabase secrets set OPENROUTER_API_KEY=sk-or-v1-xxxxx

# Ustaw cron (co 1 minutę)
# W Dashboard: https://supabase.com/dashboard/project/_/database/triggers
# Lub dodaj w migracji SQL
```

## Konfiguracja

Worker ma następujące domyślne ustawienia (zdefiniowane w `WORKER_CONFIG`):

```typescript
{
  pollIntervalMs: 10000,    // 10 sekund między skanowaniami kolejki
  batchSize: 5,              // Maksymalnie 5 żądań przetwarzanych równolegle
  model: "anthropic/claude-3.5-sonnet",
  temperature: 0.3,          // Niska temperatura dla konsystentnych ocen
  maxTokens: 2000
}
```

Możesz je zmienić bezpośrednio w kodzie workera lub dodać zmienne środowiskowe (wymaga modyfikacji kodu).

## Przepływ działania

1. **Skanowanie kolejki**: Worker pobiera do 5 żądań ze statusem `queued`
2. **Zmiana statusu**: Request → `processing`
3. **Pobieranie danych**: Aktywność + `lore_theme` z grupy
4. **Budowanie promptu**: System prompt + user prompt z danymi
5. **Wywołanie LLM**: OpenRouter API (Claude 3.5 Sonnet)
6. **Parsowanie**: JSON Schema validation
7. **Walidacja**: Scores 1-10, max 10 sugestii, limit długości
8. **Sanityzacja**: XSS, HTML tags removed
9. **Zapis**: Insert do `ai_evaluations` (trigger nadaje `version`)
10. **Finalizacja**: Request → `completed` lub `failed`

## Bezpieczeństwo

### Sanityzacja danych

Worker automatycznie sanityzuje wszystkie dane wejściowe przed wysłaniem do LLM:
- Usuwa tagi `<script>` (XSS)
- Usuwa wszystkie tagi HTML
- Usuwa `javascript:` i `on*=` (injection)
- Limit 5000 znaków per pole

### Rate limiting

- **Cooldown**: 5 minut między żądaniami (enforced przez RPC `request_ai_evaluation`)
- **Uprawnienia**: Tylko admin lub przypisany editor może żądać oceny

## Monitorowanie

### Logi

Worker loguje wszystkie operacje:

```
[AI Eval Worker] 🚀 Starting worker { pollIntervalMs: 10000, ... }
[AI Eval Worker] Found 2 pending request(s)
[AI Eval Worker] Processing request abc123-... { startedAt: "2025-11-01T12:00:00Z" }
[AI Eval Worker] ✅ Completed request abc123-... { loreScore: 8, scoutingScore: 9, tokens: 1234, durationMs: 3456 }
```

### Metryki (do zaimplementowania)

- Success rate (% completed / failed)
- Średni czas przetwarzania
- Zużycie tokenów (koszt)
- Model używany

### Błędy

Worker loguje błędy i zapisuje je w `ai_evaluation_requests.error_code` / `error_message`:

```
[AI Eval Worker] ❌ Failed to process request abc123-... { error: "...", durationMs: 1234 }
```

Kody błędów:
- `ACTIVITY_NOT_FOUND` - aktywność usunięta lub nie istnieje
- `INTERNAL_ERROR` - błąd LLM, bazy, parsowania
- `RATE_LIMIT_EXCEEDED` - limit OpenRouter przekroczony

## Testowanie

### Test lokalny (ręczny)

1. Uruchom worker: `npm run worker:ai-eval`
2. W innym terminalu, stwórz żądanie przez API:

```bash
curl -X POST http://localhost:4321/api/activities/{activity_id}/ai-evaluations \
  -H "Cookie: sb-access-token=..." \
  -H "Content-Type: application/json" \
  -d '{}'
```

3. Sprawdź logi workera - powinien przetworzyć żądanie w ciągu 10 sekund
4. Sprawdź wynik w bazie lub przez API:

```bash
curl http://localhost:4321/api/activities/{activity_id}/ai-evaluations \
  -H "Cookie: sb-access-token=..."
```

### Test jednostkowy (TODO)

```typescript
import { sanitizeForPrompt, validateEvaluation } from './ai-evaluation-worker';

// Test sanityzacji
expect(sanitizeForPrompt('<script>alert("XSS")</script>Hello')).toBe('Hello');

// Test walidacji
const eval = { lore_score: 15, ... };
expect(validateEvaluation(eval).lore_score).toBe(10); // clamped
```

## Troubleshooting

### Worker nie startuje

**Problem**: `OPENROUTER_API_KEY is required`
**Rozwiązanie**: Dodaj klucz do `.env`

**Problem**: `Supabase client not available`
**Rozwiązanie**: Sprawdź `PUBLIC_SUPABASE_URL` i `PUBLIC_SUPABASE_KEY` w `.env`

### Żądania nie są przetwarzane

**Problem**: Worker nie widzi żądań w kolejce
**Rozwiązanie**: 
1. Sprawdź status w bazie: `SELECT * FROM ai_evaluation_requests WHERE status = 'queued'`
2. Upewnij się, że worker ma dostęp do tej samej bazy danych

**Problem**: Request blokowany przez cooldown
**Rozwiązanie**: Odczekaj 5 minut od ostatniego żądania lub ręcznie zresetuj `last_evaluation_requested_at` w tabeli `activities`

### Błędy LLM

**Problem**: `LLM_AUTH_ERROR`
**Rozwiązanie**: Sprawdź poprawność `OPENROUTER_API_KEY`

**Problem**: `LLM_RATE_LIMIT`
**Rozwiązanie**: OpenRouter ma limity - poczekaj lub zwiększ tier konta

**Problem**: `LLM_UPSTREAM_ERROR`
**Rozwiązanie**: Problem po stronie OpenRouter - retry automatycznie lub sprawdź status: https://status.openrouter.ai

## Koszty

### Szacunkowy koszt per ocena:

- **Model**: Claude 3.5 Sonnet (przez OpenRouter)
- **Input tokens**: ~500-1000 (zależy od długości aktywności)
- **Output tokens**: ~200-400 (feedback + sugestie)
- **Koszt**: ~$0.003-0.006 USD per ocena

Przy 100 ocenach miesięcznie: **~$0.50 USD**

### Optymalizacja kosztów:

1. Użyj tańszego modelu (np. `anthropic/claude-3-haiku`)
2. Skróć prompty (mniej szczegółów)
3. Ogranicz `max_tokens`
4. Dodaj dzienny limit żądań per grupa

## Następne kroki (ulepszenia)

- [ ] Retry logic dla failed requests (exponential backoff)
- [ ] Monitoring dashboard (metrics, cost tracking)
- [ ] Parametryzacja modelu/temperature przez zmienne środowiskowe
- [ ] Testy jednostkowe i integracyjne
- [ ] SSE/WebSocket push zamiast pollingu na froncie
- [ ] Endpoint `/api/activities/{id}/ai-evaluation-requests` (status pending/failed)
- [ ] Cost tracking per grupa/użytkownik
- [ ] Alert jeśli failed rate > 10% w 1h

## Licencja

Część projektu **10x-project** - wewnętrzne narzędzie dla harcerzy.

