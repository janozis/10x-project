# OpenRouter API - Przykłady testów curl

## Wymagania

1. Upewnij się, że serwer dev działa: `npm run dev`
2. Sprawdź, czy zmienna `OPENROUTER_API_KEY` jest ustawiona w pliku `.env`

## Podstawowe testy

### 1. Proste zapytanie do modelu (JSON)

```bash
curl -X POST http://localhost:4321/api/ai/chat \
  -H 'Content-Type: application/json' \
  -d '{
    "messages": [
      {"role":"system","content":"You are a helpful assistant."},
      {"role":"user","content":"Wymień 3 zalety TypeScript."}
    ]
  }'
```

**Oczekiwany wynik (200):**
```json
{
  "ok": true,
  "data": {
    "id": "gen-...",
    "model": "openrouter/auto",
    "created": 1234567890,
    "content": "1. Silne typowanie...",
    "usage": {
      "prompt_tokens": 20,
      "completion_tokens": 150,
      "total_tokens": 170
    }
  }
}
```

---

### 2. Zapytanie z konkretnym modelem i parametrami

```bash
curl -X POST http://localhost:4321/api/ai/chat \
  -H 'Content-Type: application/json' \
  -d '{
    "messages": [
      {"role":"system","content":"You are a creative storyteller."},
      {"role":"user","content":"Opowiedz krótką historię o kocie programiście."}
    ],
    "options": {
      "model": "anthropic/claude-3.5-sonnet",
      "params": {
        "temperature": 0.9,
        "max_tokens": 500
      }
    }
  }'
```

---

### 3. Zapytanie ze strukturalną odpowiedzią (JSON Schema)

```bash
curl -X POST http://localhost:4321/api/ai/chat \
  -H 'Content-Type: application/json' \
  -d '{
    "messages": [
      {"role":"system","content":"You extract structured data from text."},
      {"role":"user","content":"Stwórz zadanie: Naprawić błąd w formularzu logowania, priorytet wysoki, termin za 2 dni."}
    ],
    "options": {
      "model": "anthropic/claude-3.5-sonnet",
      "params": {
        "temperature": 0.2
      },
      "response_format": {
        "type": "json_schema",
        "json_schema": {
          "name": "TaskExtraction",
          "strict": true,
          "schema": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "title": {"type": "string"},
              "priority": {"type": "string", "enum": ["low", "medium", "high"]},
              "dueInDays": {"type": "number"}
            },
            "required": ["title", "priority"]
          }
        }
      }
    }
  }'
```

**Oczekiwany wynik (200):**
```json
{
  "ok": true,
  "data": {
    "id": "gen-...",
    "model": "anthropic/claude-3.5-sonnet",
    "created": 1234567890,
    "content": "{\"title\":\"Naprawić błąd w formularzu logowania\",\"priority\":\"high\",\"dueInDays\":2}",
    "usage": {...}
  }
}
```

---

### 4. Strumieniowanie (SSE)

```bash
curl -X POST http://localhost:4321/api/ai/chat-stream \
  -H 'Content-Type: application/json' \
  -d '{
    "messages": [
      {"role":"system","content":"You are a helpful assistant."},
      {"role":"user","content":"Opowiedz mi bajkę o smoku."}
    ],
    "options": {
      "model": "anthropic/claude-3.5-sonnet",
      "params": {
        "temperature": 0.8,
        "max_tokens": 1000
      }
    }
  }'
```

**Oczekiwany wynik (200):**
```
data: {"id":"gen-...","choices":[{"delta":{"content":"Dawno"}}]}
data: {"id":"gen-...","choices":[{"delta":{"content":" temu"}}]}
data: {"id":"gen-...","choices":[{"delta":{"content":"..."}}]}
data: [DONE]
```

---

## Testy błędów

### 5. Błąd walidacji - pusta tablica messages

```bash
curl -X POST http://localhost:4321/api/ai/chat \
  -H 'Content-Type: application/json' \
  -d '{
    "messages": []
  }'
```

**Oczekiwany wynik (400):**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "...",
    "details": {
      "messages": "messages.array must contain at least 1 message"
    }
  }
}
```

---

### 6. Błąd walidacji - nieprawidłowa rola wiadomości

```bash
curl -X POST http://localhost:4321/api/ai/chat \
  -H 'Content-Type: application/json' \
  -d '{
    "messages": [
      {"role":"invalid_role","content":"Hello"}
    ]
  }'
```

**Oczekiwany wynik (400):**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "...",
    "details": {
      "messages": "messages.0.role: role must be system, user, assistant, or tool"
    }
  }
}
```

---

### 7. Błąd walidacji - za długa wiadomość

```bash
# Wiadomość > 50000 znaków
curl -X POST http://localhost:4321/api/ai/chat \
  -H 'Content-Type: application/json' \
  -d "{
    \"messages\": [
      {\"role\":\"user\",\"content\":\"$(printf 'x%.0s' {1..50001})\"}
    ]
  }"
```

**Oczekiwany wynik (400):**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "...",
    "details": {
      "messages": "messages.0.content: content too long (max 50000 chars)"
    }
  }
}
```

---

### 8. Błąd: response_format w strumieniowaniu (nie wspierane)

```bash
curl -X POST http://localhost:4321/api/ai/chat-stream \
  -H 'Content-Type: application/json' \
  -d '{
    "messages": [
      {"role":"user","content":"Hello"}
    ],
    "options": {
      "response_format": {
        "type": "json_schema",
        "json_schema": {
          "name": "Test",
          "strict": true,
          "schema": {"type": "object"}
        }
      }
    }
  }'
```

**Oczekiwany wynik (400):**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "...",
    "details": {
      "options": "response_format is not supported for streaming requests"
    }
  }
}
```

---

### 9. Błąd autoryzacji (brak API key)

Tymczasowo usuń `OPENROUTER_API_KEY` z `.env` i zrestartuj serwer:

```bash
curl -X POST http://localhost:4321/api/ai/chat \
  -H 'Content-Type: application/json' \
  -d '{
    "messages": [
      {"role":"user","content":"Hello"}
    ]
  }'
```

**Oczekiwany wynik (500):**
```json
{
  "ok": false,
  "error": {
    "code": "LLM_CONFIG_ERROR",
    "message": "OpenRouter service is not configured properly"
  }
}
```

---

## Testy zaawansowane

### 10. Konwersacja z historią (multi-turn)

```bash
curl -X POST http://localhost:4321/api/ai/chat \
  -H 'Content-Type: application/json' \
  -d '{
    "messages": [
      {"role":"system","content":"You are a helpful math tutor."},
      {"role":"user","content":"Co to jest pochodna?"},
      {"role":"assistant","content":"Pochodna funkcji to miara szybkości zmian tej funkcji..."},
      {"role":"user","content":"Czy możesz podać przykład?"}
    ],
    "options": {
      "model": "anthropic/claude-3.5-sonnet",
      "params": {
        "temperature": 0.3
      }
    }
  }'
```

---

### 11. Test z bardzo precyzyjnymi parametrami (creative vs deterministic)

**Kreatywny (wysoka temperatura):**
```bash
curl -X POST http://localhost:4321/api/ai/chat \
  -H 'Content-Type: application/json' \
  -d '{
    "messages": [
      {"role":"user","content":"Napisz kreatywne hasło reklamowe dla aplikacji do zarządzania projektami."}
    ],
    "options": {
      "params": {
        "temperature": 1.5,
        "top_p": 0.95
      }
    }
  }'
```

**Deterministyczny (niska temperatura):**
```bash
curl -X POST http://localhost:4321/api/ai/chat \
  -H 'Content-Type: application/json' \
  -d '{
    "messages": [
      {"role":"user","content":"Jaka jest suma 123 + 456?"}
    ],
    "options": {
      "params": {
        "temperature": 0.0
      }
    }
  }'
```

---

### 12. Ekstrakcja danych z tekstu (strukturalne)

```bash
curl -X POST http://localhost:4321/api/ai/chat \
  -H 'Content-Type: application/json' \
  -d '{
    "messages": [
      {"role":"system","content":"Extract person information from text."},
      {"role":"user","content":"Jan Kowalski, 35 lat, programista z Warszawy, email: jan@example.com"}
    ],
    "options": {
      "params": {
        "temperature": 0.1
      },
      "response_format": {
        "type": "json_schema",
        "json_schema": {
          "name": "PersonInfo",
          "strict": true,
          "schema": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "name": {"type": "string"},
              "age": {"type": "number"},
              "profession": {"type": "string"},
              "city": {"type": "string"},
              "email": {"type": "string", "format": "email"}
            },
            "required": ["name"]
          }
        }
      }
    }
  }'
```

---

## Uwagi

1. **Rate limiting**: OpenRouter ma limity zapytań. Jeśli otrzymasz błąd 429, poczekaj kilka sekund.
2. **Koszty**: Sprawdź ceny modeli na https://openrouter.ai/models - różne modele mają różne stawki.
3. **Tokeny**: `max_tokens` kontroluje długość odpowiedzi, ale różne modele mają różne limity kontekstu.
4. **Modele**: Użyj `openrouter/auto` dla automatycznego wyboru lub konkretny model jak `anthropic/claude-3.5-sonnet`.

## Skrypty pomocnicze

### Test połączenia

```bash
#!/bin/bash
# test-connection.sh

echo "Testing OpenRouter service connection..."

response=$(curl -s -w "\n%{http_code}" -X POST http://localhost:4321/api/ai/chat \
  -H 'Content-Type: application/json' \
  -d '{
    "messages": [
      {"role":"user","content":"Say hi"}
    ],
    "options": {
      "params": {"max_tokens": 10}
    }
  }')

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" -eq 200 ]; then
  echo "✅ Connection successful!"
  echo "$body" | jq .
else
  echo "❌ Connection failed (HTTP $http_code)"
  echo "$body" | jq .
fi
```

Nadaj uprawnienia i uruchom:
```bash
chmod +x test-connection.sh
./test-connection.sh
```

