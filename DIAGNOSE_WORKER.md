# Przewodnik diagnostyki Worker AI

Ten dokument pomaga zdiagnozować problemy z AI Evaluation Worker, który nie przetwarza requestów pomimo ich obecności w bazie danych.

## Symptomy problemu

Worker uruchamia się poprawnie:
```
[AI Eval Worker] ✅ Supabase client initialized with service_role key
[AI Eval Worker] 🚀 Starting worker ...
```

Ale **NIE widzi requestów** w bazie, mimo że istnieją rekordy ze statusem `'queued'` w tabeli `ai_evaluation_requests`.

---

## Narzędzie diagnostyczne

Uruchom skrypt testowy aby zdiagnozować problem:

```bash
npx tsx --env-file=.env src/workers/test-worker-connection.ts
```

Skrypt sprawdzi:
- ✅ Czy zmienne środowiskowe są ustawione
- ✅ Czy używasz service_role key (nie anon key)
- ✅ Czy połączenie z Supabase działa
- ✅ Czy można odczytać rekordy z `ai_evaluation_requests`
- ✅ Czy są jakieś requesty ze statusem 'queued'

---

## Checklist weryfikacji konfiguracji

### 1. Sprawdź plik .env

**Lokalizacja**: W głównym katalogu projektu (tam gdzie `package.json`)

**Wymagane zmienne**:
```bash
# Supabase URL
PUBLIC_SUPABASE_URL=https://twoj-projekt.supabase.co

# Service Role Key (WYMAGANE!)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# OpenRouter API Key
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Weryfikacja**:
```bash
# Sprawdź czy plik istnieje
ls -la .env

# Sprawdź zawartość (bez pokazywania kluczy)
grep "SUPABASE" .env
```

**WAŻNE**: Jeśli masz `PUBLIC_SUPABASE_KEY` (anon key), to **NIE jest to to samo** co `SUPABASE_SERVICE_ROLE_KEY`!

### 2. Pobierz Service Role Key z Supabase Dashboard

Jeśli nie masz `SUPABASE_SERVICE_ROLE_KEY` w `.env`:

1. Otwórz **Supabase Dashboard**: https://supabase.com/dashboard
2. Wybierz swój projekt
3. Menu po lewej: **Settings** → **API**
4. Sekcja **Project API keys**:
   - ❌ `anon` `public` - to NIE jest service_role key
   - ✅ `service_role` `secret` - **TEN potrzebujesz!** (kliknij "Reveal")

5. Skopiuj klucz i dodaj do `.env`:
   ```bash
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

### 3. Jak rozpoznać service_role key vs anon key

Oba klucze są JWT i zaczynają się od `eyJ...`, ale mają różne role:

**Anon key** (PUBLIC_SUPABASE_KEY):
- Używany w aplikacji frontend/browser
- Ograniczony przez RLS (Row Level Security)
- Wymaga kontekstu użytkownika (`auth.uid()`)
- ❌ **NIE działa dla workera**

**Service role key** (SUPABASE_SERVICE_ROLE_KEY):
- Używany w backend/worker
- Ma pełne uprawnienia do bazy danych
- Omija wszystkie polityki RLS
- ✅ **WYMAGANY dla workera**

**Weryfikacja w kodzie**:
```typescript
// Anon key - długość ~200-250 znaków
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByb2plY3RpZCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjk...

// Service role key - długość ~300-400 znaków (dłuższy!)
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByb2plY3RpZCIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQi...
```

Możesz zweryfikować na: https://jwt.io/ (wklej klucz i sprawdź payload - powinien zawierać `"role": "service_role"`)

### 4. Zrestartuj worker z nową konfiguracją

Po dodaniu/poprawieniu `.env`:

```bash
# Zatrzymaj aktualny worker (Ctrl+C)

# Uruchom ponownie
npm run worker:ai-eval
```

Powinieneś zobaczyć w logach:
```
[AI Eval Worker] ✅ Supabase client initialized with service_role key
[AI Eval Worker] 🔑 Key info: { url: 'https://...', keyPrefix: 'eyJhbGciOiJIUzI1NiI...', keyLength: 380 }
[AI Eval Worker] 🚀 Starting worker ...
[AI Eval Worker] 🔍 Query result: 2 request(s) with status='queued'
[AI Eval Worker] 📦 Processing 2 pending request(s)...
```

### 5. Sprawdź logi workera

**Prawidłowe logi** (worker działa):
```
[AI Eval Worker] 🔍 Query result: 2 request(s) with status='queued'
[AI Eval Worker] 📦 Processing 2 pending request(s)...
[AI Eval Worker] Processing request abc123...
```

**Problem: Worker nie widzi requestów** (zwraca 0):
```
[AI Eval Worker] 🔍 Query result: 0 request(s) with status='queued'
```

Możliwe przyczyny:
- ❌ Używasz anon key zamiast service_role key
- ❌ `.env` nie jest wczytywany (brak `--env-file=.env`)
- ❌ Worker łączy się z innym projektem/bazą

**Problem: Worker wyrzuca błąd**:
```
[AI Eval Worker] ❌ Failed to fetch pending requests: { code: ..., message: ... }
```

Możliwe przyczyny:
- ❌ Błędny klucz (nieprawidłowy JWT)
- ❌ Tabela `ai_evaluation_requests` nie istnieje
- ❌ Problem z połączeniem do Supabase

---

## Typowe błędy i rozwiązania

### Błąd 1: Worker pokazuje 0 requestów, ale w bazie są

**Diagnoza**:
```bash
# Uruchom skrypt testowy
npx tsx --env-file=.env src/workers/test-worker-connection.ts
```

**Przyczyna**: Worker używa anon key, który jest blokowany przez RLS.

**Rozwiązanie**:
1. Pobierz service_role key z Supabase Dashboard (Settings → API)
2. Dodaj do `.env`: `SUPABASE_SERVICE_ROLE_KEY=eyJ...`
3. Zrestartuj worker: `npm run worker:ai-eval`

### Błąd 2: "Missing required environment variables"

**Objawy**:
```
[AI Eval Worker] ❌ Missing required environment variables
[AI Eval Worker] ❌ SUPABASE_SERVICE_ROLE_KEY is required...
```

**Przyczyna**: Plik `.env` nie zawiera wymaganej zmiennej.

**Rozwiązanie**:
1. Upewnij się, że plik `.env` istnieje w głównym katalogu
2. Dodaj `SUPABASE_SERVICE_ROLE_KEY=...`
3. Sprawdź, że nie ma literówki (wielkie litery!)

### Błąd 3: Worker widzi requesty, ale nie może ich przetworzyć

**Objawy**:
```
[AI Eval Worker] 📦 Processing 2 pending request(s)...
[AI Eval Worker] ❌ Failed to fetch request abc123: ...
```

**Możliwe przyczyny**:
- Brak `OPENROUTER_API_KEY` w `.env`
- Activity została usunięta
- Problem z strukturą danych

**Rozwiązanie**:
1. Sprawdź logi workera - pokaże dokładny błąd
2. Upewnij się, że `OPENROUTER_API_KEY` jest ustawiony
3. Sprawdź czy activity istnieje w bazie

### Błąd 4: .env jest poprawny, ale worker nie działa

**Weryfikacja**:
```bash
# Sprawdź czy worker używa --env-file
cat package.json | grep "worker:ai-eval"

# Powinno być:
"worker:ai-eval": "tsx --env-file=.env src/workers/ai-evaluation-worker.ts"
```

**Rozwiązanie**:
Jeśli brakuje `--env-file=.env`, dodaj go do skryptu w `package.json`.

---

## Przykład poprawnego .env

```bash
# Supabase Configuration
PUBLIC_SUPABASE_URL=https://abcdefghijklmno.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ubyIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE2OTAwMDAwMDAsImV4cCI6MTg0Nzc2NjQwMH0.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# OpenRouter API (wymagane do wywołań LLM)
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Opcjonalne (dla aplikacji frontend)
PUBLIC_SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ubyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjkwMDAwMDAwLCJleHAiOjE4NDc3NjY0MDB9.yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
```

**Uwaga**: `SUPABASE_SERVICE_ROLE_KEY` jest znacznie dłuższy niż `PUBLIC_SUPABASE_KEY`!

---

## Weryfikacja końcowa

Po naprawie konfiguracji:

### 1. Uruchom skrypt testowy
```bash
npx tsx --env-file=.env src/workers/test-worker-connection.ts
```

Oczekiwany output:
```
✅ Service role key configured
✅ Supabase client created
✅ Successfully queried QUEUED requests
  → Found 2 queued request(s)

✅ SUCCESS! Worker should be able to process these requests.
```

### 2. Uruchom worker
```bash
npm run worker:ai-eval
```

Oczekiwany output:
```
[AI Eval Worker] ✅ Supabase client initialized with service_role key
[AI Eval Worker] 🔑 Key info: { url: '...', keyPrefix: '...', keyLength: 380 }
[AI Eval Worker] 🚀 Starting worker ...
[AI Eval Worker] 🔍 Query result: 2 request(s) with status='queued'
[AI Eval Worker] 📦 Processing 2 pending request(s)...
[AI Eval Worker] Processing request abc123...
[AI Eval Worker] 🤖 Calling LLM: ...
[AI Eval Worker] ✅ Completed request abc123 { loreScore: 8, ... }
```

### 3. Sprawdź wynik w aplikacji

1. Odśwież stronę aktywności w przeglądarce
2. Powinieneś zobaczyć nową ocenę AI w panelu "Ocena AI"

---

## Bezpieczeństwo

⚠️ **PAMIĘTAJ**: Service role key ma pełne uprawnienia do bazy danych!

**DO:**
- ✅ Przechowuj w `.env` (plik jest w `.gitignore`)
- ✅ Używaj tylko w kodzie backend/worker
- ✅ Na produkcji: użyj zmiennych środowiskowych / secrets managera

**NIE:**
- ❌ NIE commituj do repozytorium Git
- ❌ NIE używaj w kodzie frontend/browser
- ❌ NIE udostępniaj publicznie
- ❌ NIE wklejaj do ChatGPT/AI assistant (używaj placeholderów)

---

## Potrzebujesz pomocy?

Jeśli nadal masz problem:

1. Uruchom skrypt diagnostyczny: `npx tsx --env-file=.env src/workers/test-worker-connection.ts`
2. Zapisz pełne logi workera do pliku: `npm run worker:ai-eval > worker-logs.txt 2>&1`
3. Sprawdź dokumentację: `src/workers/README.md`

**Najczęstsza przyczyna**: Brak `SUPABASE_SERVICE_ROLE_KEY` w `.env` lub używanie anon key!

