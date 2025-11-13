# Instrukcje konfiguracji AI Evaluation Worker

## Problem został rozwiązany

Worker AI został zaktualizowany, aby używać `SUPABASE_SERVICE_ROLE_KEY` zamiast `PUBLIC_SUPABASE_KEY`. To rozwiązuje problem, w którym worker nie widział requestów w kolejce z powodu blokowania przez RLS (Row Level Security).

## Wymagane kroki konfiguracji

### 1. Pobierz Service Role Key z Supabase Dashboard

1. Otwórz Supabase Dashboard: https://supabase.com/dashboard
2. Wybierz swój projekt
3. Przejdź do: **Settings → API**
4. Znajdź sekcję **Project API keys**
5. Skopiuj klucz `service_role` (secret) - **NIE anon key!**

⚠️ **UWAGA**: Service role key jest tajny i ma pełne uprawnienia do bazy danych. Nigdy nie commituj go do repozytorium!

### 2. Dodaj Service Role Key do .env

Edytuj lokalny plik `.env` (w katalogu głównym projektu) i dodaj:

```bash
# Supabase Service Role Key (WYMAGANE dla workera)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Zastąp `eyJhbGciOi...` swoim rzeczywistym kluczem service_role z Supabase Dashboard.

### 3. Upewnij się, że inne zmienne są ustawione

Sprawdź, czy w `.env` są również:

```bash
# OpenRouter API Key (wymagane do wywołań LLM)
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Supabase URL
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
```

### 4. Uruchom worker ponownie

Jeśli worker już działa, zatrzymaj go (Ctrl+C) i uruchom ponownie:

```bash
npm run worker:ai-eval
```

Powinieneś zobaczyć:

```
[AI Eval Worker] ✅ Supabase client initialized with service_role key
[AI Eval Worker] 🚀 Starting worker { pollIntervalMs: 10000, batchSize: 5, model: 'anthropic/claude-3.5-sonnet' }
```

### 5. Testowanie

1. Otwórz aplikację w przeglądarce: http://localhost:4321
2. Przejdź do szczegółów aktywności (lub utwórz nową)
3. Kliknij przycisk **"Poproś o ocenę AI"**
4. API powinno zwrócić 200 OK
5. **W ciągu 10 sekund** worker powinien wykryć request i rozpocząć przetwarzanie

W logach workera powinieneś zobaczyć:

```
[AI Eval Worker] Found 1 pending request(s)
[AI Eval Worker] Processing request abc123-... { startedAt: "2025-11-13T10:23:45Z" }
[AI Eval Worker] 📋 Request details: { id: "abc123-...", activity_id: "...", ... }
[AI Eval Worker] 📚 Activity fetched: { id: "...", title: "...", ... }
[AI Eval Worker] 🤖 Calling LLM: { model: "anthropic/claude-3.5-sonnet", ... }
[AI Eval Worker] ✅ LLM response received: { tokens: 1234, ... }
[AI Eval Worker] ✅ Completed request abc123-... { loreScore: 8, scoutingScore: 9, ... }
```

### 6. Weryfikacja w bazie danych (opcjonalnie)

Możesz sprawdzić status requestów bezpośrednio w bazie:

```sql
-- Sprawdź pending requesty
SELECT * FROM ai_evaluation_requests WHERE status = 'queued';

-- Sprawdź completed requesty
SELECT * FROM ai_evaluation_requests WHERE status = 'completed';

-- Sprawdź wygenerowane ewaluacje
SELECT * FROM ai_evaluations ORDER BY created_at DESC LIMIT 5;
```

## Rozwiązywanie problemów

### Worker nadal nie widzi requestów

Jeśli worker nadal nie pokazuje "Found X pending request(s)", sprawdź:

1. **Czy używasz prawidłowego klucza?**
   ```bash
   # Sprawdź w logach workera:
   [AI Eval Worker] ✅ Supabase client initialized with service_role key
   ```
   Jeśli widzisz błąd "Missing required environment variables", sprawdź `.env`

2. **Czy klucz jest prawidłowy?**
   - Service role key zaczyna się od `eyJ...`
   - Ma długość ~200-300 znaków
   - To NIE jest anon key (który też zaczyna się od `eyJ...` ale ma inne uprawnienia)

3. **Czy .env jest wczytywany?**
   ```bash
   # Worker używa --env-file=.env
   npm run worker:ai-eval
   ```

### Błędy LLM

Jeśli worker przetwarza requesty, ale kończy się błędem LLM:

```
[AI Eval Worker] ❌ Failed to process request ...
```

Sprawdź:
1. Czy `OPENROUTER_API_KEY` jest ustawiony w `.env`
2. Czy klucz jest prawidłowy (testuj na: https://openrouter.ai/playground)
3. Czy masz środki na koncie OpenRouter

## Bezpieczeństwo

⚠️ **KRYTYCZNE**: Service role key ma pełne uprawnienia do bazy danych!

- ✅ Używaj tylko w kodzie backend/worker
- ✅ Przechowuj w `.env` (plik jest w .gitignore)
- ✅ Na produkcji: użyj zmiennych środowiskowych / secrets managera
- ❌ NIE commituj do repozytorium
- ❌ NIE używaj w kodzie frontend/browser
- ❌ NIE udostępniaj publicznie

## Więcej informacji

Szczegółowa dokumentacja workera: `src/workers/README.md`

