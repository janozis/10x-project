## Usługa OpenRouter – Plan wdrożenia (Astro 5 / TypeScript 5 / React 19)

### 1. Opis usługi

OpenRouterService to serwerowa warstwa integracyjna z OpenRouter Chat Completions API, dostarczająca bezpieczny, typowany i łatwy w użyciu interfejs do generowania odpowiedzi LLM w aplikacji opartej o Astro 5 i TypeScript 5. Usługa:

- Bezpiecznie wykorzystuje klucz API (tylko po stronie serwera).
- Udostępnia jednolite metody do: żądań synchronicznych (JSON), strumieniowania (SSE / fetch streaming), ustrukturyzowanych odpowiedzi (response_format z JSON Schema).
- Zapewnia walidację wejścia/wyjścia oraz spójne mapowanie błędów na odpowiedzi HTTP.
- Umożliwia konfigurację modelu, parametrów i nagłówków zgodnych z OpenRouter (np. `HTTP-Referer`, `X-Title`).


### 2. Opis konstruktora

Rekomendowana lokalizacja: `src/lib/services/openrouter.ts`

Proponowana sygnatura:

```ts
export type OpenRouterServiceOptions = {
  apiKey?: string; // domyślnie z process.env.OPENROUTER_API_KEY
  baseUrl?: string; // domyślnie 'https://openrouter.ai/api/v1/chat/completions'
  defaultModel?: string; // np. 'anthropic/claude-3.5-sonnet' lub 'openrouter/auto'
  defaultParams?: {
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
  };
  headers?: {
    referer?: string; // HTTP-Referer
    title?: string;   // X-Title
  };
  fetchImpl?: typeof fetch; // dla testów/iniekcji
};

export class OpenRouterService {
  constructor(options?: OpenRouterServiceOptions) {
    // inicjalizacja, walidacja, nadanie domyślnych parametrów
  }
}
```

Założenia:
- Klucz API jest czytany z `process.env.OPENROUTER_API_KEY` w środowisku serwerowym (Astro API routes).
- Konstruktor nie robi zewnętrznych wywołań – tylko waliduje i ustawia konfigurację.


### 3. Publiczne metody i pola

Proponowany interfejs publiczny:

```ts
type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
};

type CompletionOptions = {
  model?: string;
  params?: {
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
  };
  response_format?: {
    type: 'json_schema';
    json_schema: {
      name: string;
      strict: true;
      schema: Record<string, unknown>; // JSON Schema Draft-07 lub nowszy
    };
  };
  signal?: AbortSignal; // anulowanie zapytań
};

class OpenRouterService {
  // Pola publiczne (readonly):
  readonly baseUrl: string;
  readonly defaultModel: string;

  // Metody publiczne:
  async completeChat(messages: ChatMessage[], options?: CompletionOptions): Promise<any>;
  streamChat(messages: ChatMessage[], options?: CompletionOptions): Promise<ReadableStream<Uint8Array>>;
  setDefaultModel(model: string): void;
  setDefaultParams(params: NonNullable<CompletionOptions['params']>): void;
}
```

Charakterystyka:
- `completeChat` – wywołanie synchroniczne (await JSON). Obsługuje `response_format` i walidację wyniku.
- `streamChat` – zwraca strumień do stopniowego pobierania odpowiedzi modelu.
- `setDefaultModel`, `setDefaultParams` – runtime’owa zmiana konfiguracji.

Przykładowe wywołanie (z ustrukturyzowaną odpowiedzią):

```ts
const svc = new OpenRouterService({ defaultModel: 'anthropic/claude-3.5-sonnet' });

const schema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string' },
    priority: { type: 'string', enum: ['low', 'medium', 'high'] },
    dueDate: { type: 'string', format: 'date' }
  },
  required: ['title', 'priority']
};

const json = await svc.completeChat([
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'Stwórz zadanie: „Naprawić błąd w formularzu”, priorytet wysoki, termin jutro.' }
], {
  response_format: {
    type: 'json_schema',
    json_schema: { name: 'TaskExtraction', strict: true, schema }
  },
  params: { temperature: 0.2 }
});
```


### 4. Prywatne metody i pola

Wewnętrzna struktura klasy (przykładowo):

```ts
class OpenRouterService {
  private apiKey: string;
  private defaultParams?: CompletionOptions['params'];
  private headers?: { referer?: string; title?: string };
  private fetchImpl: typeof fetch;

  private buildHeaders(): Headers {
    // Authorization: Bearer, Content-Type, ewentualnie HTTP-Referer, X-Title
  }

  private buildBody(messages: ChatMessage[], options?: CompletionOptions): Record<string, unknown> {
    // łączy model, messages, params i response_format w payload API
  }

  private async postJson<T = unknown>(body: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
    // fetch z obsługą timeout/AbortController, mapowanie błędów
  }

  private mapHttpErrorToDomain(error: unknown): Error {
    // spójne błędy domenowe, np. RateLimitError, AuthError
  }
}
```

Zalecenia:
- Guard clauses: brak klucza API, brak modelu, puste `messages` → szybkie i czytelne błędy.
- Happy-path na końcu funkcji.


### 5. Obsługa błędów

Scenariusze i reakcje (numerowane):

1. Brak `OPENROUTER_API_KEY` – zwróć błąd 500 z komunikatem konfiguracyjnym (nie loguj klucza).
2. 401/403 z OpenRouter – zmapuj na 401/403 w API i zwróć bezpieczny komunikat (bez treści odpowiedzi upstream).
3. 429 (rate limit) – zmapuj na 429; opcjonalnie zastosuj retry z backoff (na poziomie usługi lub klienta).
4. 5xx z OpenRouter – zmapuj na 502/503; nie ujawniaj szczegółów wewnętrznych.
5. Timeout/Network – zmapuj na 504/503; dodaj mechanizm anulowania (AbortController) i sensowne time‑outy.
6. Nieprawidłowy JSON w odpowiedzi – zmapuj na 502; loguj techniczne szczegóły po stronie serwera.
7. Walidacja `response_format` (schema) nie powiodła się – zmapuj na 422 z opisem walidacji (bez ujawniania promptów).
8. Przekroczone limity (np. za długi prompt) – 413 (Payload Too Large) lub 422 z podpowiedzią skrócenia historii.
9. Przerwane strumieniowanie (stream) – 499 (client closed request) po stronie serwera; klient powinien móc wznowić/zre-zażądać.

Praktyki:
- Logowanie z korelacją (requestId), ale z redakcją wrażliwych danych.
- Nie zwracaj surowych komunikatów OpenRouter użytkownikowi końcowemu.


### 6. Kwestie bezpieczeństwa

- Klucz API wyłącznie po stronie serwera (Astro API routes). Nigdy nie udostępniaj do przeglądarki.
- Walidacja i sanityzacja wejścia (role, content, rozmiary), wyraźne limity długości.
- CORS: endpointy tylko dla zaufanych originów (jeśli wystawiane publicznie).
- Rate limiting i/lub token bucket na poziomie API.
- Redakcja logów (prompt/response) lub ich agregacja w formie skrótów.
- Wybór i whitelisting modeli (np. dozwolona lista w konfiguracji).
- Nagłówki: ustaw `HTTP-Referer` (Twoja domena) i `X-Title` (nazwa aplikacji) zgodnie z wytycznymi OpenRouter.


### 7. Plan wdrożenia krok po kroku

#### Krok 1. Zmienne środowiskowe

- Dodaj w `.env` (tylko serwer):

```bash
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_REFERER=https://twoja-domena.example
OPENROUTER_TITLE=10x-project
```

Upewnij się, że endpointy API korzystają z `process.env.*` (serwer), a nie z `import.meta.env.*` (klient) dla sekretów.

#### Krok 2. Typy współdzielone

- Rozszerz `src/types.ts` o minimalne typy wiadomości/odpowiedzi:

```ts
export type LlmRole = 'system' | 'user' | 'assistant' | 'tool';

export type LlmMessage = { role: LlmRole; content: string };

export type LlmCompletionResult = {
  id: string;
  model: string;
  created: number;
  content: string; // dla prostych przypadków
  // lub structured: unknown (walidowane pod schema)
};
```

#### Krok 3. Usługa `OpenRouterService`

- Utwórz `src/lib/services/openrouter.ts` i zaimplementuj konstruktor, `completeChat`, `streamChat` oraz prywatne pomocnicze metody (nagłówki, body, POST/stream, mapowanie błędów).
- Domyślne `baseUrl`: `https://openrouter.ai/api/v1/chat/completions`.
- Domyślny model np. `'openrouter/auto'` lub `'anthropic/claude-3.5-sonnet'`.

Minimalny szkic `completeChat` (fragment):

```ts
export class OpenRouterService {
  // ... konstruktor i pola prywatne ...

  async completeChat(messages: LlmMessage[], options?: CompletionOptions) {
    if (!this.apiKey) throw new Error('OPENROUTER_API_KEY is missing');
    if (!messages?.length) throw new Error('messages are required');

    const model = options?.model ?? this.defaultModel;
    const params = { ...this.defaultParams, ...options?.params };

    const body = {
      model,
      messages,
      ...params,
      ...(options?.response_format ? { response_format: options.response_format } : {})
    };

    const res = await this.postJson<any>(body, options?.signal);
    // TODO: zmapować na LlmCompletionResult w zależności od formatu odpowiedzi
    return res;
  }
}
```

#### Krok 4. Endpointy API (Astro)

Rekomendowane umiejscowienie:
- `src/pages/api/ai/chat.ts` – żądania JSON (bez strumieniowania).
- `src/pages/api/ai/chat-stream.ts` – strumieniowanie (SSE / fetch streaming) dla UI React.

Przykład endpointu JSON:

```ts
// src/pages/api/ai/chat.ts
import type { APIRoute } from 'astro';
import { OpenRouterService } from '../../lib/services/openrouter';
import type { LlmMessage } from '../../types';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { messages, options } = (await request.json()) as {
      messages: LlmMessage[];
      options?: any;
    };

    const svc = new OpenRouterService({
      defaultModel: 'openrouter/auto',
      headers: {
        referer: process.env.OPENROUTER_REFERER,
        title: process.env.OPENROUTER_TITLE
      }
    });

    const data = await svc.completeChat(messages, options);
    return new Response(JSON.stringify({ ok: true, data }), { status: 200 });
  } catch (err: any) {
    const status = err?.statusCode ?? 500;
    return new Response(JSON.stringify({ ok: false, error: 'LLM_ERROR' }), { status });
  }
};
```

Przykład endpointu streamingowego (szkic):

```ts
// src/pages/api/ai/chat-stream.ts
import type { APIRoute } from 'astro';
import { OpenRouterService } from '../../lib/services/openrouter';

export const POST: APIRoute = async ({ request }) => {
  const { messages, options } = await request.json();
  const svc = new OpenRouterService();
  const stream = await svc.streamChat(messages, options);
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' }
  });
};
```

#### Krok 5. Integracja w React (klient)

- Utwórz prosty wrapper w React (np. `useLlm()` w `src/lib/hooks`) do wywołania `POST /api/ai/chat`.
- UI (Tailwind/Shadcn/ui) wykorzysta endpointy – żadnych kluczy/sekretów w przeglądarce.

Przykład użycia:

```ts
const res = await fetch('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ messages, options })
});
const json = await res.json();
```

#### Krok 6. Konfiguracja kluczowych elementów zgodnych z OpenRouter API (z przykładami)

1) Komunikat systemowy:

```ts
const messages = [
  { role: 'system', content: 'You are a helpful assistant that answers in Polish.' },
  { role: 'user', content: 'Opisz zalety TypeScript.' }
];
```

2) Komunikat użytkownika:

```ts
messages.push({ role: 'user', content: 'Dodaj przykłady użycia w Astro 5.' });
```

3) Ustrukturyzowane odpowiedzi – `response_format` (JSON Schema):

```ts
const response_format = {
  type: 'json_schema',
  json_schema: {
    name: 'FeatureList',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        features: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              title: { type: 'string' },
              description: { type: 'string' }
            },
            required: ['title', 'description']
          }
        }
      },
      required: ['features']
    }
  }
};

const result = await svc.completeChat(messages, { response_format });
```

4) Nazwa modelu:

```ts
await svc.completeChat(messages, { model: 'anthropic/claude-3.5-sonnet' });
// lub globalnie przez konstruktor: new OpenRouterService({ defaultModel: 'openrouter/auto' })
```

5) Parametry modelu:

```ts
await svc.completeChat(messages, {
  params: {
    temperature: 0.3,
    max_tokens: 512,
    top_p: 0.9,
    frequency_penalty: 0,
    presence_penalty: 0
  }
});
```

Uwagi implementacyjne:
- `response_format` powinien być przekazany w treści żądania do OpenRouter 1:1 zgodnie ze specyfikacją.
- Po otrzymaniu odpowiedzi, jeżeli oczekujemy JSON – należy ją sparsować i (opcjonalnie) zwalidować lokalnie podanymi narzędziami (np. Zod/ajv) względem użytego schematu.

#### Krok 7. Mapowanie błędów i testy

- Zaimplementuj spójne wyjątki domenowe (np. `AuthError`, `RateLimitError`, `UpstreamError`).
- Testy integracyjne endpointów (`/api/ai/chat`, `/api/ai/chat-stream`) z symulacją odpowiedzi OpenRouter (iniekcja `fetchImpl`).
- Skrypty testowe `curl` (notatki w `./notatki/`):

```bash
curl -X POST http://localhost:4321/api/ai/chat \
  -H 'Content-Type: application/json' \
  -d '{
    "messages": [
      {"role":"system","content":"You are a helpful assistant."},
      {"role":"user","content":"Wymień 3 zalety TypeScript."}
    ],
    "options": {"model":"openrouter/auto","params":{"temperature":0.2}}
  }'
```

#### Krok 8. Observability i utrzymanie

- Dodaj korelację requestów (np. `x-request-id`) i logowanie czasu odpowiedzi.
- Metryki (liczba wywołań, błędy, średni czas, kody HTTP).
- Limity kosztów (np. ograniczenie tokenów, stawki modeli przez konfigurację).


---

### Załącznik A. Minimalny schemat żądania do OpenRouter

```ts
type OpenRouterPayload = {
  model: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant' | 'tool'; content: string }>;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  response_format?: {
    type: 'json_schema';
    json_schema: { name: string; strict: true; schema: Record<string, unknown> };
  };
  stream?: boolean; // true dla strumieniowania
};
```

### Załącznik B. Nagłówki HTTP

```ts
const headers = {
  'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
  'Content-Type': 'application/json',
  ...(process.env.OPENROUTER_REFERER ? { 'HTTP-Referer': process.env.OPENROUTER_REFERER } : {}),
  ...(process.env.OPENROUTER_TITLE ? { 'X-Title': process.env.OPENROUTER_TITLE } : {})
};
```

### Załącznik C. Dobre praktyki kodowania (zastosowane)

- Wczesne sprawdzanie warunków brzegowych (guard clauses).
- Brak głębokiego zagnieżdżania; szybkie zwroty.
- Czytelne typy TS, brak `any` w publicznym API.
- Spójne i bezpieczne mapowanie błędów.


