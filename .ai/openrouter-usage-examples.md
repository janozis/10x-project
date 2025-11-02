# OpenRouter Service - Przykłady użycia

Poniżej znajdziesz praktyczne przykłady użycia OpenRouterService w różnych scenariuszach.

## Spis treści

1. [Podstawowe użycie](#podstawowe-użycie)
2. [Komunikat systemowy](#komunikat-systemowy)
3. [Konwersacja z historią](#konwersacja-z-historią)
4. [Strukturalne odpowiedzi (JSON Schema)](#strukturalne-odpowiedzi-json-schema)
5. [Wybór modelu](#wybór-modelu)
6. [Parametry modelu](#parametry-modelu)
7. [Strumieniowanie](#strumieniowanie)
8. [Obsługa błędów](#obsługa-błędów)
9. [React Hook](#react-hook)
10. [Zaawansowane scenariusze](#zaawansowane-scenariusze)

---

## Podstawowe użycie

### Backend (Astro API Route)

```typescript
// src/pages/api/my-ai-endpoint.ts
import type { APIRoute } from 'astro';
import { OpenRouterService } from '../../lib/services/openrouter';

export const POST: APIRoute = async ({ request }) => {
  const { userMessage } = await request.json();

  const service = new OpenRouterService({
    headers: {
      referer: process.env.OPENROUTER_REFERER,
      title: process.env.OPENROUTER_TITLE,
    },
  });

  const result = await service.completeChat([
    { role: 'user', content: userMessage },
  ]);

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
  });
};
```

---

## Komunikat systemowy

Komunikat systemowy (`system` role) definiuje zachowanie asystenta i kontekst konwersacji.

```typescript
import { OpenRouterService } from '../../lib/services/openrouter';

const service = new OpenRouterService();

const result = await service.completeChat([
  {
    role: 'system',
    content: 'You are a helpful assistant that answers in Polish. Be concise and professional.',
  },
  {
    role: 'user',
    content: 'Opisz zalety TypeScript.',
  },
]);

console.log(result.content);
```

### Przykłady komunikatów systemowych

**Ekspert techniczny:**
```typescript
const systemMessage = {
  role: 'system',
  content: `You are a senior TypeScript developer with expertise in:
- Type system design
- Performance optimization
- Best practices and design patterns

Answer questions clearly with code examples when relevant.`,
};
```

**Kreatywny pisarz:**
```typescript
const systemMessage = {
  role: 'system',
  content: `You are a creative storyteller specializing in fantasy adventures.
Write engaging, descriptive narratives with vivid characters.
Keep stories appropriate for all ages.`,
};
```

**Asystent edukacyjny:**
```typescript
const systemMessage = {
  role: 'system',
  content: `You are a patient math tutor for high school students.
- Explain concepts step by step
- Use simple language and examples
- Encourage questions and critical thinking`,
};
```

---

## Konwersacja z historią

Dla konwersacji wieloturowych, przekaż całą historię (system + poprzednie user/assistant):

```typescript
const service = new OpenRouterService();

const conversationHistory = [
  {
    role: 'system',
    content: 'You are a helpful programming assistant.',
  },
  {
    role: 'user',
    content: 'Jak stworzyć tablicę w TypeScript?',
  },
  {
    role: 'assistant',
    content: 'W TypeScript tablice tworzy się tak: `const arr: number[] = [1, 2, 3];`',
  },
  {
    role: 'user',
    content: 'A jak dodać element do tablicy?',
  },
];

const result = await service.completeChat(conversationHistory);
console.log(result.content); // "Możesz użyć metody push()..."
```

---

## Strukturalne odpowiedzi (JSON Schema)

Wymuś strukturalny output zgodny z JSON Schema (przydatne do ekstrakcji danych).

### Przykład 1: Ekstrakcja zadania

```typescript
const service = new OpenRouterService({
  defaultModel: 'anthropic/claude-3.5-sonnet',
});

const schema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string' },
    priority: { type: 'string', enum: ['low', 'medium', 'high'] },
    dueDate: { type: 'string', format: 'date' },
    tags: { type: 'array', items: { type: 'string' } },
  },
  required: ['title', 'priority'],
};

const result = await service.completeChat(
  [
    {
      role: 'system',
      content: 'Extract task information from user text.',
    },
    {
      role: 'user',
      content: 'Stwórz zadanie: Naprawić błąd w logowaniu, priorytet wysoki, termin na jutro, tagi: bug, auth',
    },
  ],
  {
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'TaskExtraction',
        strict: true,
        schema,
      },
    },
    params: { temperature: 0.2 }, // Niska temperatura dla precyzji
  }
);

const task = JSON.parse(result.content);
console.log(task);
// { title: "Naprawić błąd w logowaniu", priority: "high", dueDate: "2025-11-02", tags: ["bug", "auth"] }
```

### Przykład 2: Analiza sentymentu

```typescript
const sentimentSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative'] },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    reasoning: { type: 'string' },
  },
  required: ['sentiment', 'confidence'],
};

const result = await service.completeChat(
  [
    { role: 'system', content: 'Analyze sentiment of text.' },
    { role: 'user', content: 'Ten produkt jest niesamowity! Najlepszy zakup tego roku.' },
  ],
  {
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'SentimentAnalysis', strict: true, schema: sentimentSchema },
    },
  }
);

const sentiment = JSON.parse(result.content);
console.log(sentiment);
// { sentiment: "positive", confidence: 0.95, reasoning: "Enthusiastic language..." }
```

### Przykład 3: Lista cech produktu

```typescript
const featuresSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    features: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          importance: { type: 'string', enum: ['critical', 'important', 'nice-to-have'] },
        },
        required: ['name', 'description', 'importance'],
      },
    },
  },
  required: ['features'],
};

const result = await service.completeChat(
  [
    { role: 'user', content: 'List key features of a modern IDE' },
  ],
  {
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'FeatureList', strict: true, schema: featuresSchema },
    },
  }
);

const data = JSON.parse(result.content);
console.log(data.features);
// [{ name: "IntelliSense", description: "...", importance: "critical" }, ...]
```

---

## Wybór modelu

### Automatyczny wybór (openrouter/auto)

```typescript
const service = new OpenRouterService({
  defaultModel: 'openrouter/auto', // Domyślnie wybiera optymalny model
});

const result = await service.completeChat(messages);
```

### Konkretny model

```typescript
const service = new OpenRouterService({
  defaultModel: 'anthropic/claude-3.5-sonnet',
});

const result = await service.completeChat(messages);
```

### Zmiana modelu na poziomie zapytania

```typescript
const service = new OpenRouterService();

// Zapytanie 1: GPT-4
const result1 = await service.completeChat(messages, {
  model: 'openai/gpt-4-turbo',
});

// Zapytanie 2: Claude
const result2 = await service.completeChat(messages, {
  model: 'anthropic/claude-3.5-sonnet',
});
```

### Popularne modele

```typescript
// Szybki i tani (dobre do prostych zadań)
model: 'openai/gpt-3.5-turbo'

// Balans jakość/cena
model: 'anthropic/claude-3.5-sonnet'
model: 'openai/gpt-4-turbo'

// Najwyższa jakość (drogie)
model: 'anthropic/claude-3-opus'
model: 'openai/gpt-4'

// Open source
model: 'meta-llama/llama-3.1-70b-instruct'
model: 'mistralai/mistral-large'
```

---

## Parametry modelu

### Temperature (0.0 - 2.0)

Kontroluje "kreatywność" odpowiedzi:
- **0.0-0.3**: Deterministyczne, powtarzalne (analiza, ekstrakcja danych)
- **0.4-0.7**: Balans (większość przypadków)
- **0.8-1.5**: Kreatywne (pisanie, brainstorming)

```typescript
// Precyzyjne odpowiedzi
const result = await service.completeChat(messages, {
  params: { temperature: 0.2 },
});

// Kreatywne odpowiedzi
const result = await service.completeChat(messages, {
  params: { temperature: 1.2 },
});
```

### Max Tokens

Limituje długość odpowiedzi:

```typescript
const result = await service.completeChat(messages, {
  params: {
    max_tokens: 500, // Krótka odpowiedź
  },
});
```

### Top P (0.0 - 1.0)

Alternatywa dla temperature (nucleus sampling):

```typescript
const result = await service.completeChat(messages, {
  params: {
    top_p: 0.9, // Rozważa top 90% prawdopodobnych tokenów
  },
});
```

### Frequency & Presence Penalty (-2.0 - 2.0)

Redukuje powtórzenia:

```typescript
const result = await service.completeChat(messages, {
  params: {
    frequency_penalty: 0.5, // Karze za częste słowa
    presence_penalty: 0.3,  // Karze za powtarzanie tematów
  },
});
```

### Kompletny przykład

```typescript
const service = new OpenRouterService();

const result = await service.completeChat(
  [
    { role: 'system', content: 'You are a creative content writer.' },
    { role: 'user', content: 'Napisz opis produktu: inteligentny zegarek.' },
  ],
  {
    model: 'anthropic/claude-3.5-sonnet',
    params: {
      temperature: 0.8,        // Kreatywny
      max_tokens: 300,         // Ograniczona długość
      top_p: 0.95,
      frequency_penalty: 0.3,  // Unikaj powtórzeń
      presence_penalty: 0.2,
    },
  }
);
```

---

## Strumieniowanie

Dla długich odpowiedzi użyj strumieniowania (SSE):

### Backend (Astro API Route)

```typescript
// src/pages/api/ai/stream-example.ts
import type { APIRoute } from 'astro';
import { OpenRouterService } from '../../lib/services/openrouter';

export const POST: APIRoute = async ({ request }) => {
  const { messages } = await request.json();

  const service = new OpenRouterService();
  const stream = await service.streamChat(messages);

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
};
```

### Frontend (React)

Użyj gotowego hooka `useLlmChatStream`:

```typescript
import { useLlmChatStream } from '../../lib/hooks/useLlmChat';

function StreamingChat() {
  const { content, loading, error, stream } = useLlmChatStream({
    model: 'anthropic/claude-3.5-sonnet',
    params: { temperature: 0.7 },
  });

  const handleSubmit = async () => {
    await stream([
      { role: 'system', content: 'You are a storyteller.' },
      { role: 'user', content: 'Tell me a short story about a dragon.' },
    ]);
  };

  if (loading) return <div>Streaming...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <button onClick={handleSubmit}>Start Streaming</button>
      <div>{content}</div>
    </div>
  );
}
```

---

## Obsługa błędów

### Try-catch pattern

```typescript
import { OpenRouterService } from '../../lib/services/openrouter';
import type { LlmApiError } from '../../types';

async function safeLlmCall() {
  const service = new OpenRouterService();

  try {
    const result = await service.completeChat([
      { role: 'user', content: 'Hello' },
    ]);
    return { success: true, data: result };
  } catch (error) {
    // Sprawdź typ błędu
    if (isLlmApiError(error)) {
      switch (error.code) {
        case 'LLM_AUTH_ERROR':
          console.error('Authentication failed:', error.message);
          break;
        case 'LLM_RATE_LIMIT':
          console.error('Rate limit exceeded, retry later');
          break;
        case 'LLM_TIMEOUT':
          console.error('Request timeout');
          break;
        default:
          console.error('LLM error:', error.message);
      }
      return { success: false, error: error.code };
    }

    console.error('Unknown error:', error);
    return { success: false, error: 'UNKNOWN' };
  }
}

function isLlmApiError(error: unknown): error is Error & LlmApiError {
  return (
    error instanceof Error &&
    'code' in error &&
    'statusCode' in error
  );
}
```

### Retry logic z backoff

```typescript
async function retryableLlmCall(
  service: OpenRouterService,
  messages: LlmMessage[],
  maxRetries = 3
) {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await service.completeChat(messages);
    } catch (error) {
      lastError = error as Error;

      // Retry tylko dla przejściowych błędów
      if (isLlmApiError(error) && error.code === 'LLM_RATE_LIMIT') {
        const backoffMs = Math.pow(2, i) * 1000; // Exponential backoff
        console.log(`Rate limited, retrying in ${backoffMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        continue;
      }

      // Inne błędy - nie retry
      throw error;
    }
  }

  throw lastError;
}
```

---

## React Hook

### useLlmChat (non-streaming)

```typescript
import { useLlmChat } from '../../lib/hooks/useLlmChat';

function ChatComponent() {
  const { data, loading, error, send, reset } = useLlmChat({
    model: 'anthropic/claude-3.5-sonnet',
    params: { temperature: 0.7 },
    onSuccess: (result) => {
      console.log('Completed:', result.content);
    },
    onError: (error) => {
      console.error('Failed:', error.message);
    },
  });

  const handleAsk = async () => {
    await send([
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Explain React hooks.' },
    ]);
  };

  return (
    <div>
      <button onClick={handleAsk} disabled={loading}>
        Ask
      </button>
      <button onClick={reset}>Reset</button>

      {loading && <p>Loading...</p>}
      {error && <p>Error: {error.message}</p>}
      {data && <p>{data.content}</p>}
    </div>
  );
}
```

### useLlmChatStream (streaming)

```typescript
import { useLlmChatStream } from '../../lib/hooks/useLlmChat';

function StreamingChatComponent() {
  const { content, loading, error, stream, reset } = useLlmChatStream({
    model: 'anthropic/claude-3.5-sonnet',
    params: { temperature: 0.9 },
    onComplete: (fullContent) => {
      console.log('Stream finished:', fullContent);
    },
  });

  const handleStream = async () => {
    await stream([
      { role: 'user', content: 'Write a poem about TypeScript.' },
    ]);
  };

  return (
    <div>
      <button onClick={handleStream} disabled={loading}>
        Stream
      </button>
      <button onClick={reset}>Clear</button>

      {loading && <p>Streaming...</p>}
      {error && <p>Error: {error.message}</p>}
      <pre>{content}</pre>
    </div>
  );
}
```

---

## Zaawansowane scenariusze

### 1. AI-powered form validation

```typescript
const service = new OpenRouterService({
  defaultModel: 'anthropic/claude-3.5-sonnet',
});

async function validateUserInput(input: string) {
  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      isValid: { type: 'boolean' },
      errors: { type: 'array', items: { type: 'string' } },
      suggestions: { type: 'array', items: { type: 'string' } },
    },
    required: ['isValid', 'errors'],
  };

  const result = await service.completeChat(
    [
      {
        role: 'system',
        content: 'Validate user input for a task creation form. Check for: clear title, reasonable deadline, valid priority.',
      },
      { role: 'user', content: input },
    ],
    {
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'ValidationResult', strict: true, schema },
      },
      params: { temperature: 0.1 },
    }
  );

  return JSON.parse(result.content);
}

// Użycie
const validation = await validateUserInput(
  'Zrób coś ważnego za 5 minut priorytet mega ważny'
);
console.log(validation);
// { isValid: false, errors: ["Deadline too short", "Priority invalid"], suggestions: [...] }
```

### 2. Semantic search / classification

```typescript
async function classifyText(text: string) {
  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      category: { type: 'string', enum: ['bug', 'feature', 'question', 'documentation'] },
      confidence: { type: 'number', minimum: 0, maximum: 1 },
      keywords: { type: 'array', items: { type: 'string' } },
    },
    required: ['category', 'confidence'],
  };

  const result = await service.completeChat(
    [
      { role: 'system', content: 'Classify user feedback into categories.' },
      { role: 'user', content: text },
    ],
    {
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'Classification', strict: true, schema },
      },
    }
  );

  return JSON.parse(result.content);
}
```

### 3. Content summarization

```typescript
async function summarizeContent(longText: string) {
  const result = await service.completeChat(
    [
      {
        role: 'system',
        content: 'Summarize the following text in 2-3 sentences. Be concise and capture key points.',
      },
      { role: 'user', content: longText },
    ],
    {
      params: {
        temperature: 0.3,
        max_tokens: 200,
      },
    }
  );

  return result.content;
}
```

### 4. Multi-step reasoning

```typescript
async function solveMathProblem(problem: string) {
  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      steps: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            description: { type: 'string' },
            calculation: { type: 'string' },
          },
          required: ['description'],
        },
      },
      finalAnswer: { type: 'string' },
    },
    required: ['steps', 'finalAnswer'],
  };

  const result = await service.completeChat(
    [
      {
        role: 'system',
        content: 'Solve math problems step by step.',
      },
      { role: 'user', content: problem },
    ],
    {
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'MathSolution', strict: true, schema },
      },
      params: { temperature: 0.1 },
    }
  );

  return JSON.parse(result.content);
}

// Użycie
const solution = await solveMathProblem('If John has 5 apples and gives 2 to Mary, then buys 3 more, how many does he have?');
console.log(solution.steps);
// [{ description: "Start with 5 apples", calculation: "5" }, { description: "Give 2 to Mary", calculation: "5 - 2 = 3" }, ...]
console.log(solution.finalAnswer); // "6 apples"
```

---

## Dobre praktyki

1. **Używaj niskiej temperature (0.0-0.3) dla zadań wymagających precyzji** (ekstrakcja, klasyfikacja, obliczenia)
2. **Używaj response_format dla strukturalnych danych** - gwarantuje poprawny JSON
3. **Dodawaj kontekst w systemowym komunikacie** - model działa lepiej z jasnym kontekstem
4. **Limituj max_tokens** - kontroluj koszty i długość odpowiedzi
5. **Obsługuj błędy gracefully** - zwłaszcza rate limiting (retry z backoff)
6. **Testuj różne modele** - każdy ma mocne strony (Claude lepszy do pisania, GPT-4 do logiki)
7. **Monitoruj koszty** - sprawdzaj `usage.total_tokens` w odpowiedziach
8. **Używaj strumieniowania dla długich odpowiedzi** - lepsza UX

---

## Przydatne linki

- OpenRouter Modele: https://openrouter.ai/models
- OpenRouter Ceny: https://openrouter.ai/models (kliknij model dla szczegółów)
- JSON Schema Reference: https://json-schema.org/understanding-json-schema/
- OpenRouter Docs: https://openrouter.ai/docs

